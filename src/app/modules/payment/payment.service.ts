import { StatusCodes } from "http-status-codes";
import AppError from "../../errors/appError";
import Order from "../order/order.model";
import {
    stripeInit,
    stripeValidate,
    sslCommerzInit,
    sslCommerzValidate,
    bkashInit,
    bkashValidate,
    generateTransactionId,
    ensureOrderCanInitPayment,
} from "./payment.utils";
import {
    ISSLCommerzInitData,
    PaymentGatewayStatus,
    PaymentProvider,
} from "./payment.interface";
import {
    isStripeSupportedCurrency,
    convertAmount,
} from "../../utils/currencyConverter";
import config from "../../config";
import { ActivityServices } from "../activity/activity.service";
import { ActivityModule, ActivityType } from "../activity/activity.interface";

// ----------------------------------------------------------------
// Stripe Payment
// ----------------------------------------------------------------
const initiateStripePayment = async (
    orderId: string,
    _body: Record<string, never> = {},
) => {
    const order = await Order.findById(orderId)
        .populate("user", "name email")
        .populate("products.product", "name");

    if (!order) {
        throw new AppError(StatusCodes.NOT_FOUND, "Order not found!");
    }

    ensureOrderCanInitPayment(order);

    const productName = (order.products || [])
        .map((p: any) => p.product?.name || "Product")
        .join(", ");

    // Hybrid currency strategy:
    // - If Stripe supports the order's currency, charge in it directly (no conversion).
    // - Otherwise (e.g. BDT), convert the finalAmount to USD via FX, and record the rate.
    const orderCurrency = (order.currency || "usd") as string;
    let chargeAmount = order.finalAmount;
    let chargeCurrency: string = orderCurrency;

    if (!isStripeSupportedCurrency(orderCurrency)) {
        const { convertedAmount, rate } = await convertAmount(
            order.finalAmount,
            orderCurrency,
            "usd",
        );
        chargeAmount = convertedAmount;
        chargeCurrency = "usd";

        order.set("fxRate", rate);
        order.set("fxBaseCurrency", orderCurrency);
        await order.save();
    }

    // Amount is always derived from the order — never client-supplied
    const result = await stripeInit({
        amount: chargeAmount,
        currency: chargeCurrency,
        orderId: order._id.toString(),
        productName,
    });

    // Store session ID on the order for callback validation
    if (result.sessionId) {
        order.set("stripeSessionId", result.sessionId);
        await order.save();
    }

    return result;
};

const validateStripePayment = async (body: { sessionId: string }) => {
    const result = await stripeValidate(body.sessionId);

    if (result.success && result.status === PaymentGatewayStatus.SUCCESS) {
        const order = await Order.findOne({
            stripeSessionId: body.sessionId,
        });

        if (order) {
            order.paymentStatus = "Paid" as any;
            order.status = "Processing" as any;
            order.paymentProvider = PaymentProvider.STRIPE;
            order.transactionId = result.transactionId || body.sessionId;
            await order.save();

            await ActivityServices.logActivity({
                module: ActivityModule.PAYMENT,
                type: ActivityType.UPDATE,
                message: `Order ${order.orderId} was paid via Stripe`,
                referenceId: order._id.toString(),
                reference: order.orderId,
                metadata: { provider: PaymentProvider.STRIPE },
            });
        }
    }

    return result;
};

// ----------------------------------------------------------------
// SSLCommerz Payment
// ----------------------------------------------------------------
const initiateSSLCommerzPayment = async (
    orderId: string,
    body: Partial<
        Omit<
            ISSLCommerzInitData,
            | "total_amount"
            | "currency"
            | "tran_id"
            | "success_url"
            | "fail_url"
            | "cancel_url"
            | "ipn_url"
        >
    > = {},
) => {
    const order = await Order.findById(orderId).populate(
        "user",
        "name email phoneNo city state postcode country address",
    );

    if (!order) {
        throw new AppError(StatusCodes.NOT_FOUND, "Order not found!");
    }

    ensureOrderCanInitPayment(order);

    const user = order.user as any;
    const tran_id = generateTransactionId();

    // Auto-fill all customer fields from the order's user profile.
    // Client may override any of them via body, but none are required.
    const initData: ISSLCommerzInitData = {
        // Amount is always taken from the order's finalAmount — never client-supplied
        total_amount: order.finalAmount,
        currency: "BDT",
        tran_id,
        success_url: `${config.ssl.validation_url}?tran_id=${tran_id}`,
        fail_url: config.ssl.failed_url as string,
        cancel_url: config.ssl.cancel_url as string,
        ipn_url: `${config.server_url}/api/v1/payment/sslcommerz/validate`,
        product_name: body.product_name || "E-commerce Order",
        product_category: body.product_category || "General",
        cus_name: body.cus_name || user?.name || "Customer",
        cus_email: body.cus_email || user?.email || "customer@example.com",
        cus_phone: body.cus_phone || user?.phoneNo || user?.phone || "01700000000",
        cus_add1: body.cus_add1 || user?.address || "Dhaka",
        cus_add2: body.cus_add2 || user?.address || "Dhaka",
        cus_city: body.cus_city || user?.city || "Dhaka",
        cus_state: body.cus_state || user?.state || "Dhaka",
        cus_postcode: body.cus_postcode || user?.postcode || "1200",
        cus_country: body.cus_country || user?.country || "Bangladesh",
        ship_name: body.ship_name || user?.name || "Customer",
        ship_add1: body.ship_add1 || user?.address || "Dhaka",
        ship_add2: body.ship_add2 || user?.address || "Dhaka",
        ship_city: body.ship_city || user?.city || "Dhaka",
        ship_state: body.ship_state || user?.state || "Dhaka",
        ship_postcode: body.ship_postcode || user?.postcode || "1200",
        ship_country: body.ship_country || user?.country || "Bangladesh",
    };

    const result = await sslCommerzInit(initData);

    // Store tran_id and session key on the order for webhook validation
    order.set("transactionId", tran_id);
    if (result.sessionId) {
        order.set("sslSessionKey", result.sessionId);
    }
    await order.save();

    return result;
};

const validateSSLCommerzPayment = async (body: {
    val_id: string;
    tran_id?: string;
}) => {
    const result = await sslCommerzValidate(body);

    if (result.success && result.status === PaymentGatewayStatus.SUCCESS) {
        // Find order by stored transaction id (unprefixed — matches the gateway tran_id)
        const order = await Order.findOne({
            transactionId: body.tran_id || result.transactionId,
        });

        if (order) {
            order.paymentStatus = "Paid" as any;
            order.status = "Processing" as any;
            order.paymentProvider = PaymentProvider.SSLCOMMERZ;
            await order.save();

            await ActivityServices.logActivity({
                module: ActivityModule.PAYMENT,
                type: ActivityType.UPDATE,
                message: `Order ${order.orderId} was paid via SSLCommerz`,
                referenceId: order._id.toString(),
                reference: order.orderId,
                metadata: { provider: PaymentProvider.SSLCOMMERZ },
            });
        }
    }

    return result;
};

// ----------------------------------------------------------------
// bKash Payment
// ----------------------------------------------------------------
const initiateBkashPayment = async (
    orderId: string,
    body: { customerNumber: string },
) => {
    const order = await Order.findById(orderId);

    if (!order) {
        throw new AppError(StatusCodes.NOT_FOUND, "Order not found!");
    }

    ensureOrderCanInitPayment(order);

    const result = await bkashInit({
        amount: order.finalAmount,
        orderId: order._id.toString(),
        customerNumber: body.customerNumber,
    });

    // Store the bKash payment id on the order for callback validation
    if (result.transactionId) {
        order.set("transactionId", result.transactionId);
        await order.save();
    }

    return result;
};

const validateBkashPayment = async (body: { paymentID: string }) => {
    const result = await bkashValidate(body.paymentID);

    if (result.success && result.status === PaymentGatewayStatus.SUCCESS) {
        // Find the order by the stored bKash payment id (unprefixed — matches the gateway paymentID)
        const order = await Order.findOne({
            transactionId: body.paymentID,
        });

        if (order) {
            order.paymentStatus = "Paid" as any;
            order.status = "Processing" as any;
            order.paymentProvider = PaymentProvider.BKASH;
            await order.save();

            await ActivityServices.logActivity({
                module: ActivityModule.PAYMENT,
                type: ActivityType.UPDATE,
                message: `Order ${order.orderId} was paid via bKash`,
                referenceId: order._id.toString(),
                reference: order.orderId,
                metadata: { provider: PaymentProvider.BKASH },
            });
        }
    }

    return result;
};

export const PaymentServices = {
    initiateStripePayment,
    validateStripePayment,
    initiateSSLCommerzPayment,
    validateSSLCommerzPayment,
    initiateBkashPayment,
    validateBkashPayment,
};
