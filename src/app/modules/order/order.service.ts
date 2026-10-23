import { IOrder } from "./order.interface";
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
            .populate("user", "name email")
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
            .populate("user", "name email")
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
        .populate("user", "name email")
        .populate("products.product", "name price imageUrls");

    if (!order) {
        throw new AppError(StatusCodes.NOT_FOUND, "Order not found!");
    }

    // Admin sees everything; the user who placed the order can see their own.
    // Guest orders (user: null) have no owner — only admins can view them here.
    const isAdmin = authUser?.role === "admin";
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
            totalAmount,
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

        // Total discount = offer savings + coupon savings. The order stores the
        // two parts separately so both are shown when both exist.
        const totalDiscount = offerDiscount + discount;
        const finalAmount = totalAmount - totalDiscount + deliveryCharge;

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
            paymentStatus: payload.paymentStatus || undefined,
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
            .populate("user", "name email")
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

    // Only the owner (of a non-guest order) or an admin can update an order.
    // Guest orders (user: null) can only be updated by an admin.
    const isAdmin = authUser?.role === "admin";
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
                order.totalAmount,
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
        order.finalAmount =
            order.totalAmount - order.totalDiscount + order.deliveryCharge;

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
        if (payload.paymentMethod) {
            order.paymentMethod = payload.paymentMethod;
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
            .populate("user", "name email")
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

    const updatedOrder = await Order.findByIdAndUpdate(
        orderId,
        { status },
        { new: true },
    )
        .populate("user", "name email")
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

// Public order tracking — no auth. Looks up ONLY by the human-friendly
// `orderId` (e.g. "DE07D08M0001U") — not the Mongo _id. The customer enters
// their order id on the tracking page, so it must be the stable public key.
const trackOrder = async (orderId: string) => {
    const order = await Order.findOne({ orderId })
        .populate("user", "name email")
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
        total: item.unitPrice * item.quantity,
        ...(item.variant
            ? { variant: { sku: item.variant.sku, attributes: item.variant.attributes || {} } }
            : {}),
    }));

    const subtotal = order.totalAmount;
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
        totalAmount: subtotal,
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

// Invoice data for the frontend (rendered via react-pdf). Only a PAID order
// produces an invoice — unpaid/COD-pending orders are rejected with 400.
//
// Lookup strategy:
//   - default (no query param): the param is an orderId OR a Mongo _id.
//   - ?by=transactionId: the param is a gateway transaction id (e.g. a Stripe
//     session id / bKash paymentID) — matched ONLY against transactionId so a
//     value can never accidentally resolve to a different order's _id.
const getInvoiceData = async (orderId: string, by?: string) => {
    const lookup = by === "transactionId"
        ? { transactionId: orderId }
        : { $or: [{ orderId }, { _id: orderId }] };

    const order = await Order.findOne(lookup)
        .populate("user", "name email phoneNo address")
        .populate("products.product", "name price imageUrls");

    if (!order) {
        throw new AppError(StatusCodes.NOT_FOUND, "Order not found!");
    }

    if (order.paymentStatus !== "Paid") {
        throw new AppError(
            StatusCodes.BAD_REQUEST,
            "Invoice is only available for paid orders!",
        );
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
        },
        items: order.products.map((item: any) => ({
            productId: item.product?._id?.toString(),
            name: item.product?.name || "Unknown Product",
            image: item.product?.imageUrls?.[0]?.url || "",
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.unitPrice * item.quantity,
            ...(item.variant
                ? { variant: { sku: item.variant.sku, attributes: item.variant.attributes || {} } }
                : {}),
        })),
        totals: {
            subtotal: order.totalAmount,
            offerDiscount: order.offerDiscount,
            discount: order.discount,
            totalDiscount: order.totalDiscount,
            deliveryCharge: order.deliveryCharge,
            finalAmount: order.finalAmount,
        },
    };
};

export const OrderServices = {
    getAllOrders,
    getMyOrders,
    getOrderDetails,
    createOrder,
    updateOrder,
    changeOrderStatus,
    trackOrder,
    getInvoiceData,
};
