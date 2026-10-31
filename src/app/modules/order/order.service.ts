import { IOrder, PaymentMethod, PaymentStatus } from "./order.interface";
import Order from "./order.model";
import Product from "../product/product.model";
import AppError from "../../errors/appError";
import { StatusCodes } from "http-status-codes";
import { OrderSearchableFields } from "./order.constant";
import QueryBuilder from "../../builder/QueryBuilder";
import { IJwtPayload } from "../auth/auth.interface";
import mongoose from "mongoose";
import { generateOrderId } from "../../utils/generateOrderId";
import { ActivityServices } from "../activity/activity.service";
import { ActivityModule, ActivityType } from "../activity/activity.interface";
import {
    resolveDeliveryCharge,
    validateAndPriceProducts,
    applyCoupon,
} from "./order.utils";

const getAllOrders = async (query: Record<string, unknown>) => {
    const orderQuery = new QueryBuilder(
        Order.find()
            .populate("user", "name email photoUrl")
            .populate("products.product", "name price imageUrls"),
        query,
    )
        .search(OrderSearchableFields)
        .filter()
        .sort()
        .paginate()
        .fields();

    const result = await orderQuery.modelQuery;
    const meta = await orderQuery.countTotal();
    return {
        result,
        meta,
    };
};

// Authenticated customer's own orders
const getMyOrders = async (
    authUser: IJwtPayload,
    query: Record<string, unknown>,
) => {
    const orderQuery = new QueryBuilder(
        Order.find({ user: authUser.userId })
            .populate("user", "name email photoUrl")
            .populate("products.product", "name price imageUrls"),
        query,
    )
        .search(OrderSearchableFields)
        .filter()
        .sort()
        .paginate()
        .fields();

    const result = await orderQuery.modelQuery;
    const meta = await orderQuery.countTotal();
    return {
        result,
        meta,
    };
};

const getOrderDetails = async (
    orderId: string,
    authUser: IJwtPayload | undefined,
) => {
    const order = await Order.findById(orderId)
        .populate("user", "name email photoUrl")
        .populate("products.product", "name price imageUrls");

    if (!order) {
        throw new AppError(StatusCodes.NOT_FOUND, "Order not found!");
    }

    // Staff (admin/manager) sees everything; the user who placed the order
    // can see their own. Guest orders (user: null) have no owner — only
    // staff can view them here.
    const isAdmin =
        authUser?.role === "admin" || authUser?.role === "manager";
    const ownerId = order.user?._id?.toString() || order.user?.toString() || "";
    const isOwner = Boolean(
        authUser && ownerId && ownerId === authUser.userId,
    );

    if (!isAdmin && !isOwner) {
        throw new AppError(StatusCodes.UNAUTHORIZED, "You are not authorized!");
    }

    return order;
};

const createOrder = async (
    payload: IOrder,
    authUser: IJwtPayload | undefined,
) => {
    const session = await mongoose.startSession();

    try {
        session.startTransaction();

        // 1. Validate products + compute server-side total (incl. offer savings)
        const { priced, totalAmount, offerDiscount, currency } =
            await validateAndPriceProducts(payload.products);

        // 2. Verify coupon and compute discount (coupon only)
        const { coupon, discount } = await applyCoupon(
            payload.coupon,
            priced as any,
        );

        // 3. Resolve the delivery charge from the selected option name —
        //    the customer never sends an amount, only the option name.
        const deliveryOptionName = payload.deliveryOptionName;
        if (!deliveryOptionName) {
            throw new AppError(
                StatusCodes.BAD_REQUEST,
                "A delivery option is required!",
            );
        }
        const deliveryCharge = await resolveDeliveryCharge(deliveryOptionName);

        // Total discount = offer savings + coupon savings (display field).
        // NOTE: `totalAmount` is ALREADY the post-offer subtotal (unit prices
        // reflect active offers), so the FINAL amount subtracts the COUPON
        // only — subtracting totalDiscount here would double-count the offer
        // and over-discount every order with an active product offer.
        const totalDiscount = offerDiscount + discount;
        const finalAmount = totalAmount - discount + deliveryCharge;

        // 4. Build the order with server-computed values.
        //    Guest checkout (no token) → user is null. The orderId is a random
        //    DEXXXXXXXX — unguessable, no date/sequence encoded.
        const order = new Order({
            orderId: await generateOrderId(),
            user: authUser?.userId ?? null,
            products: priced,
            coupon,
            totalAmount,
            discount,
            offerDiscount,
            totalDiscount,
            deliveryCharge,
            deliveryOptionName,
            finalAmount,
            currency,
            status: payload.status || undefined,
            shippingAddress: payload.shippingAddress,
            recipientName: payload.recipientName,
            phoneNo: payload.phoneNo,
            notes: payload.notes,
            paymentMethod: payload.paymentMethod,
            // Business rule: COD stays Pending until delivery; MANUAL bKash /
            // Bank transfers are marked Paid up-front (the customer attached
            // their transaction reference — staff verify afterwards); gateway
            // ("Online") orders stay Pending until the provider confirms.
            paymentStatus:
                payload.paymentMethod === PaymentMethod.BKASH_MANUAL ||
                payload.paymentMethod === PaymentMethod.BANK_MANUAL
                    ? PaymentStatus.PAID
                    : payload.paymentStatus || PaymentStatus.PENDING,
        });

        const createdOrder = await order.save({ session });

        // 4. Decrement stock (inside the transaction) — variant stock when the
        //    line has a chosen variant, else the base product stock.
        for (const item of priced) {
            if (item.variant) {
                await Product.updateOne(
                    { _id: item.product, "variants.sku": item.variant.sku },
                    { $inc: { "variants.$.stock": -item.quantity } },
                    { session },
                );
            } else {
                await Product.findByIdAndUpdate(
                    item.product,
                    { $inc: { stock: -item.quantity } },
                    { session },
                );
            }
        }

        await session.commitTransaction();

        const populatedOrder = await Order.findById(createdOrder._id)
            .populate("user", "name email photoUrl")
            .populate("products.product", "name price imageUrls");

        // Fire-and-forget activity log (not part of the transaction).
        await ActivityServices.logActivity({
            module: ActivityModule.ORDER,
            type: ActivityType.CREATE,
            message: `Order ${createdOrder.orderId} was created`,
            referenceId: createdOrder._id.toString(),
            reference: createdOrder.orderId,
            performedBy: authUser?.userId,
            metadata: {
                finalAmount: createdOrder.finalAmount,
                isGuest: !authUser,
            },
        });

        return populatedOrder;
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
};

const updateOrder = async (
    orderId: string,
    payload: Partial<IOrder>,
    authUser: IJwtPayload | undefined,
) => {
    const order = await Order.findById(orderId);
    if (!order) {
        throw new AppError(StatusCodes.NOT_FOUND, "Order not found!");
    }

    // Only the owner (of a non-guest order) or staff (admin/manager) can
    // update an order. Guest orders (user: null) are staff-only.
    const isAdmin =
        authUser?.role === "admin" || authUser?.role === "manager";
    const isOwner = Boolean(
        authUser && order.user && order.user.toString() === authUser.userId,
    );

    if (!isAdmin && !isOwner) {
        throw new AppError(StatusCodes.UNAUTHORIZED, "You are not authorized!");
    }

    // Once paid/completed/cancelled, prevent edits to the financial core
    if (["Completed", "Cancelled"].includes(order.status)) {
        throw new AppError(
            StatusCodes.BAD_REQUEST,
            `Cannot modify a ${order.status.toLowerCase()} order!`,
        );
    }

    const session = await mongoose.startSession();

    try {
        session.startTransaction();

        // Re-validate + re-price the product list if provided (full recompute)
        if (payload.products && payload.products.length > 0) {
            const { priced, totalAmount, offerDiscount, currency } =
                await validateAndPriceProducts(payload.products);

            // Restore previous stock, then decrement for the new quantities
            for (const item of order.products) {
                if (item.variant) {
                    await Product.updateOne(
                        { _id: item.product, "variants.sku": item.variant.sku },
                        { $inc: { "variants.$.stock": item.quantity } },
                        { session },
                    );
                } else {
                    await Product.findByIdAndUpdate(
                        item.product,
                        { $inc: { stock: item.quantity } },
                        { session },
                    );
                }
            }

            order.products = priced as any;
            order.totalAmount = totalAmount;
            order.offerDiscount = offerDiscount;
            order.currency = currency;
        }

        if (payload.coupon !== undefined) {
            const { coupon, discount } = await applyCoupon(
                payload.coupon,
                order.products as any,
            );
            order.coupon = coupon;
            order.discount = discount;
        }

        if (payload.deliveryOptionName) {
            order.deliveryCharge = await resolveDeliveryCharge(
                payload.deliveryOptionName,
            );
            order.deliveryOptionName = payload.deliveryOptionName;
        }

        order.totalDiscount = order.offerDiscount + order.discount;
        // totalAmount is the post-offer subtotal — subtract the coupon only
        // (see the matching note in createOrder; totalDiscount here would
        // double-count the offer).
        order.finalAmount =
            order.totalAmount - order.discount + order.deliveryCharge;

        if (payload.shippingAddress) {
            order.shippingAddress = payload.shippingAddress;
        }
        if (payload.recipientName) {
            order.recipientName = payload.recipientName;
        }
        if (payload.phoneNo) {
            order.phoneNo = payload.phoneNo;
        }
        if (payload.notes !== undefined) {
            order.notes = payload.notes;
        }
        // Payment method/status are staff-only controls — a customer editing
        // their own order must never be able to flip themselves to Paid.
        const isStaff =
            authUser?.role === "admin" || authUser?.role === "manager";
        if (payload.paymentMethod && isStaff) {
            order.paymentMethod = payload.paymentMethod;
        }
        if (payload.paymentStatus && isStaff) {
            order.paymentStatus = payload.paymentStatus;
        }

        await order.save({ session });

        // Decrement stock for the new product list (variant-aware)
        for (const item of order.products) {
            if (item.variant) {
                await Product.updateOne(
                    { _id: item.product, "variants.sku": item.variant.sku },
                    { $inc: { "variants.$.stock": -item.quantity } },
                    { session },
                );
            } else {
                await Product.findByIdAndUpdate(
                    item.product,
                    { $inc: { stock: -item.quantity } },
                    { session },
                );
            }
        }

        await session.commitTransaction();

        const populatedOrder = await Order.findById(order._id)
            .populate("user", "name email photoUrl")
            .populate("products.product", "name price imageUrls");

        await ActivityServices.logActivity({
            module: ActivityModule.ORDER,
            type: ActivityType.UPDATE,
            message: `Order ${order.orderId} was updated`,
            referenceId: order._id.toString(),
            reference: order.orderId,
            performedBy: authUser?.userId,
            metadata: {
                finalAmount: order.finalAmount,
                status: order.status,
            },
        });

        return populatedOrder;
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
};

const changeOrderStatus = async (
    orderId: string,
    status: string,
    authUser?: IJwtPayload,
) => {
    const order = await Order.checkOrderExist(orderId);

    if (order.status === "Cancelled" || order.status === "Completed") {
        throw new AppError(
            StatusCodes.BAD_REQUEST,
            `Cannot change status of a ${order.status.toLowerCase()} order!`,
        );
    }

    const previousStatus = order.status;

    // Cancelling returns the reserved stock to the catalog exactly once
    // (the stockRestored marker also protects the delete path below).
    if (status === "Cancelled" && !order.stockRestored) {
        for (const item of order.products) {
            if (item.variant) {
                await Product.updateOne(
                    { _id: item.product, "variants.sku": item.variant.sku },
                    { $inc: { "variants.$.stock": item.quantity } },
                );
            } else {
                await Product.findByIdAndUpdate(item.product, {
                    $inc: { stock: item.quantity },
                });
            }
        }
        order.stockRestored = true;
        await order.save();
    }

    const updatedOrder = await Order.findByIdAndUpdate(
        orderId,
        { status },
        { new: true },
    )
        .populate("user", "name email photoUrl")
        .populate("products.product", "name price imageUrls");

    await ActivityServices.logActivity({
        module: ActivityModule.ORDER,
        type: ActivityType.STATUS,
        message: `Order ${order.orderId} status changed from ${previousStatus} to ${status}`,
        referenceId: order._id.toString(),
        reference: order.orderId,
        performedBy: authUser?.userId,
        metadata: {
            previousStatus,
            newStatus: status,
        },
    });

    return updatedOrder;
};

// Admin-only hard delete. Restores the reserved stock exactly once (an
// order cancelled through changeOrderStatus already returned it — the
// stockRestored marker prevents double-restoring) and logs the deletion.
const deleteOrder = async (orderId: string, authUser: IJwtPayload) => {
    const order = await Order.checkOrderExist(orderId);

    if (!order.stockRestored) {
        for (const item of order.products) {
            if (item.variant) {
                await Product.updateOne(
                    { _id: item.product, "variants.sku": item.variant.sku },
                    { $inc: { "variants.$.stock": item.quantity } },
                );
            } else {
                await Product.findByIdAndUpdate(item.product, {
                    $inc: { stock: item.quantity },
                });
            }
        }
    }

    await Order.findByIdAndDelete(orderId);

    await ActivityServices.logActivity({
        module: ActivityModule.ORDER,
        type: ActivityType.DELETE,
        message: `Order ${order.orderId} was deleted`,
        referenceId: order._id.toString(),
        reference: order.orderId,
        performedBy: authUser.userId,
        metadata: {
            finalAmount: order.finalAmount,
            status: order.status,
            stockRestored: !order.stockRestored,
        },
    });

    return { deleted: true, orderId: order.orderId };
};

// Public order tracking — no auth. Looks up ONLY by the human-friendly
// `orderId` (e.g. "DE07D08M0001U") — not the Mongo _id. The customer enters
// their order id on the tracking page, so it must be the stable public key.
const trackOrder = async (orderId: string) => {
    const order = await Order.findOne({ orderId })
        .populate("user", "name email photoUrl")
        .populate("products.product", "name price imageUrls");

    if (!order) {
        throw new AppError(StatusCodes.NOT_FOUND, "Order not found!");
    }

    const products = order.products.map((item: any) => ({
        productId: item.product?._id?.toString(),
        name: item.product?.name || "Unknown Product",
        image: item.product?.imageUrls?.[0]?.url || "",
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        // Pre-offer price (legacy orders fall back to the charged price).
        baseUnitPrice: item.baseUnitPrice ?? item.unitPrice,
        total: item.unitPrice * item.quantity,
        ...(item.variant
            ? { variant: { sku: item.variant.sku, attributes: item.variant.attributes || {} } }
            : {}),
    }));

    // Subtotal BEFORE offer discounts (Σ base × qty). Receipts must show:
    //   subtotal (base) − offerDiscount − coupon + delivery = finalAmount.
    // `totalAmount` alone is the POST-offer subtotal — displaying it next to
    // the offer line double-subtracts.
    const subtotal = order.totalAmount + (order.offerDiscount || 0);
    const statusHistory = [
        { status: "Pending", at: order.createdAt },
        ...(order.status !== "Pending"
            ? [{ status: order.status, at: order.updatedAt }]
            : []),
    ];

    return {
        orderId: order.orderId,
        id: order._id,
        status: order.status,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
        paymentProvider: order.paymentProvider || null,
        currency: order.currency,
        coupon: order.coupon || null,
        totalAmount: subtotal,
        postOfferSubtotal: order.totalAmount,
        offerDiscount: order.offerDiscount,
        discount: order.discount,
        totalDiscount: order.totalDiscount,
        deliveryCharge: order.deliveryCharge,
        finalAmount: order.finalAmount,
        recipientName: order.recipientName,
        phoneNo: order.phoneNo,
        shippingAddress: order.shippingAddress,
        notes: order.notes || "",
        placedBy: order.user ? (order.user as any).name || "User" : "Guest",
        products,
        statusHistory,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
    };
};

// Invoice data for the frontend (rendered via react-pdf). Available for
// EVERY order — COD orders are payable on delivery, so pending payments
// still get a receipt (the payment method on the invoice tells the story).
//
// Lookup strategy:
//   - default (no query param): the param is an orderId OR a Mongo _id.
//   - ?by=transactionId: the param is a gateway transaction id (e.g. a Stripe
//     session id / bKash paymentID) — matched ONLY against transactionId so a
//     value can never accidentally resolve to a different order's _id.
const getInvoiceData = async (orderId: string, by?: string) => {
    // Only test the _id clause when the param is a well-formed ObjectId —
    // casting a friendly orderId ("DE4KCY5JEA") inside a $or throws a
    // CastError before the orderId clause can ever match.
    const isObjectId = mongoose.Types.ObjectId.isValid(orderId);
    const lookup = by === "transactionId"
        ? { transactionId: orderId }
        : isObjectId
          ? { $or: [{ orderId }, { _id: orderId }] }
          : { orderId };

    const order = await Order.findOne(lookup)
        .populate("user", "name email phoneNo address")
        .populate("products.product", "name price imageUrls");

    if (!order) {
        throw new AppError(StatusCodes.NOT_FOUND, "Order not found!");
    }

    const customer = order.user as any;

    return {
        orderId: order.orderId,
        id: order._id,
        status: order.status,
        currency: order.currency,
        issuedAt: order.updatedAt || order.createdAt,
        customer: {
            name: customer?.name || order.recipientName,
            email: customer?.email || "",
            phoneNo: customer?.phoneNo || order.phoneNo,
            address: customer?.address || order.shippingAddress,
        },
        recipient: {
            name: order.recipientName,
            phoneNo: order.phoneNo,
            shippingAddress: order.shippingAddress,
            notes: order.notes || "",
        },
        payment: {
            method: order.paymentMethod,
            provider: order.paymentProvider || null,
            transactionId: order.transactionId || null,
            status: order.paymentStatus,
        },
        items: order.products.map((item: any) => ({
            productId: item.product?._id?.toString(),
            name: item.product?.name || "Unknown Product",
            image: item.product?.imageUrls?.[0]?.url || "",
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            // Pre-offer price (legacy orders fall back to the charged price).
            baseUnitPrice: item.baseUnitPrice ?? item.unitPrice,
            total: item.unitPrice * item.quantity,
            ...(item.variant
                ? { variant: { sku: item.variant.sku, attributes: item.variant.attributes || {} } }
                : {}),
        })),
        coupon: order.coupon || null,
        totals: {
            // Subtotal BEFORE offer discounts — see trackOrder's note.
            subtotal: order.totalAmount + (order.offerDiscount || 0),
            offerDiscount: order.offerDiscount,
            discount: order.discount,
            totalDiscount: order.totalDiscount,
            deliveryCharge: order.deliveryCharge,
            finalAmount: order.finalAmount,
        },
    };
};

export const OrderServices = {
    deleteOrder,
    getAllOrders,
    getMyOrders,
    getOrderDetails,
    createOrder,
    updateOrder,
    changeOrderStatus,
    trackOrder,
    getInvoiceData,
};
