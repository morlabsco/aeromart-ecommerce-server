import config from "../../config";
import SSLCommerzPayment from "sslcommerz-lts";
import Stripe from "stripe";
import {
    ISSLCommerzInitData,
    IPaymentResponse,
    PaymentGatewayStatus,
} from "./payment.interface";
import { CURRENCY_BDT } from "./payment.constant";
import AppError from "../../errors/appError";
import { StatusCodes } from "http-status-codes";

// Guard: an already-paid order cannot be re-initialized
export const ensureOrderCanInitPayment = (order: any) => {
    if (order.paymentStatus === "Paid") {
        throw new AppError(
            StatusCodes.BAD_REQUEST,
            "This order has already been paid!",
        );
    }
};

/**
 * Generates a transaction ID in the format: DE{HHmmAM/PM}{DDMMYYYY}{suffix}
 * Example: DE0402AM31072026A7K9
 *   DE       = Demo Ecommerce
 *   0402AM   = 04:02 AM
 *   31072026 = 31/07/2026
 *   A7K9     = 4-char random suffix for uniqueness
 */
export const generateTransactionId = (): string => {
    const now = new Date();

    let hours = now.getHours();
    const minutes = now.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;

    const timeStr =
        hours.toString().padStart(2, "0") +
        minutes.toString().padStart(2, "0") +
        ampm;

    const day = now.getDate().toString().padStart(2, "0");
    const month = (now.getMonth() + 1).toString().padStart(2, "0");
    const year = now.getFullYear().toString();

    // 4-char random alphanumeric suffix ensures uniqueness
    const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();

    return `DE${timeStr}${day}${month}${year}${suffix}`;
};

// ----------------------------------------------------------------
// Stripe Utilities — PaymentIntent (manual frontend Stripe.js flow)
// ----------------------------------------------------------------
const stripe = new Stripe(config.stripe_secret_key || "", {
    apiVersion: "2025-03-31.basil" as any,
});

export const stripePaymentIntentInit = async (data: {
    amount: number;
    currency: string;
    orderId: string;
    productName: string;
}): Promise<IPaymentResponse> => {
    try {
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(data.amount * 100),
            currency: data.currency || "usd",
            metadata: {
                orderId: data.orderId,
                productName: data.productName,
            },
            automatic_payment_methods: {
                enabled: true,
            },
        });

        return {
            success: true,
            paymentIntentId: paymentIntent.id,
            clientSecret: paymentIntent.client_secret!,
            publishableKey: config.stripe_publishable_key || "",
            message: "Stripe payment initiated successfully",
        };
    } catch (error: any) {
        throw new AppError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Stripe payment initiation failed: ${error.message}`,
        );
    }
};

export const stripePaymentIntentValidate = async (
    paymentIntentId: string,
): Promise<IPaymentResponse> => {
    try {
        const paymentIntent =
            await stripe.paymentIntents.retrieve(paymentIntentId);

        if (paymentIntent.status === "succeeded") {
            return {
                success: true,
                transactionId: paymentIntent.id,
                status: PaymentGatewayStatus.SUCCESS,
                message: "Payment validated successfully",
            };
        }

        return {
            success: false,
            transactionId: paymentIntent.id,
            status: PaymentGatewayStatus.FAILED,
            message: `Payment status: ${paymentIntent.status}`,
        };
    } catch (error: any) {
        throw new AppError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Stripe validation failed: ${error.message}`,
        );
    }
};

// ----------------------------------------------------------------
// Stripe Utilities — Checkout Session (hosted page, redirect flow)
// ----------------------------------------------------------------
export const stripeInit = async (data: {
    amount: number;
    currency: string;
    orderId: string;
    productName: string;
}): Promise<IPaymentResponse> => {
    try {
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            line_items: [
                {
                    price_data: {
                        currency: data.currency || "usd",
                        product_data: {
                            name: data.productName,
                        },
                        unit_amount: Math.round(data.amount * 100),
                    },
                    quantity: 1,
                },
            ],
            mode: "payment",
            success_url: `${config.server_url}/api/v1/payment/stripe/success?session_id={CHECKOUT_SESSION_ID}&orderId=${data.orderId}`,
            cancel_url: `${config.server_url}/api/v1/payment/stripe/cancel?orderId=${data.orderId}`,
            metadata: {
                orderId: data.orderId,
            },
        });

        return {
            success: true,
            gatewayUrl: session.url || "",
            sessionId: session.id,
            message: "Stripe payment initiated successfully",
        };
    } catch (error: any) {
        throw new AppError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Stripe payment initiation failed: ${error.message}`,
        );
    }
};

export const stripeValidate = async (
    sessionId: string,
): Promise<IPaymentResponse> => {
    try {
        const session = await stripe.checkout.sessions.retrieve(sessionId);

        if (session.payment_status === "paid") {
            return {
                success: true,
                transactionId: session.id,
                status: PaymentGatewayStatus.SUCCESS,
                message: "Payment validated successfully",
            };
        }

        return {
            success: false,
            transactionId: session.id,
            status: PaymentGatewayStatus.FAILED,
            message: `Payment status: ${session.payment_status}`,
        };
    } catch (error: any) {
        throw new AppError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Stripe validation failed: ${error.message}`,
        );
    }
};

// ----------------------------------------------------------------
// SSLCommerz Utilities
// ----------------------------------------------------------------
export const sslCommerzInit = async (
    data: ISSLCommerzInitData,
): Promise<IPaymentResponse> => {
    try {
        const sslcz = new SSLCommerzPayment(
            config.ssl.store_id!,
            config.ssl.store_pass!,
            config.NODE_ENV === "production",
        );

        const initData = {
            total_amount: data.total_amount,
            currency: data.currency || CURRENCY_BDT,
            tran_id: data.tran_id,
            success_url: data.success_url,
            fail_url: data.fail_url,
            cancel_url: data.cancel_url,
            ipn_url: data.ipn_url,
            shipping_method: "Courier",
            product_name: data.product_name,
            product_category: data.product_category || "General",
            productcategory: data.product_category || "General",
            product_profile: "general",
            num_of_item: "1",
            cus_name: data.cus_name,
            cus_email: data.cus_email,
            cus_add1: data.cus_add1,
            cus_add2: data.cus_add2 || "",
            cus_city: data.cus_city,
            cus_state: data.cus_state,
            cus_postcode: data.cus_postcode,
            cus_country: data.cus_country,
            cus_phone: data.cus_phone,
            ship_name: data.ship_name,
            ship_add1: data.ship_add1,
            ship_add2: data.ship_add2 || "",
            ship_city: data.ship_city,
            shipcity: data.ship_city,
            ship_state: data.ship_state,
            ship_postcode: data.ship_postcode,
            ship_country: data.ship_country,
        };

        const result = await sslcz.init(initData);

        if (result && result.GatewayPageURL) {
            return {
                success: true,
                gatewayUrl: result.GatewayPageURL,
                sessionId: result.sessionkey || "",
                message: "SSLCommerz payment initiated successfully",
            };
        }

        throw new AppError(
            StatusCodes.BAD_REQUEST,
            "Failed to get SSLCommerz gateway URL",
        );
    } catch (error: any) {
        throw new AppError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `SSLCommerz initiation failed: ${error.message}`,
        );
    }
};

export const sslCommerzValidate = async (
    payload: Record<string, unknown>,
): Promise<IPaymentResponse> => {
    try {
        const sslcz = new SSLCommerzPayment(
            config.ssl.store_id!,
            config.ssl.store_pass!,
            config.NODE_ENV === "production",
        );

        const result = await sslcz.validate({
            val_id: payload.val_id as string,
        });

        if (result && result.status === "VALID") {
            return {
                success: true,
                transactionId: result.tran_id,
                status: PaymentGatewayStatus.SUCCESS,
                message: "SSLCommerz payment validated successfully",
            };
        }

        return {
            success: false,
            transactionId: (result as any)?.tran_id || "",
            status: PaymentGatewayStatus.FAILED,
            message: "SSLCommerz payment validation failed",
        };
    } catch (error: any) {
        throw new AppError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `SSLCommerz validation failed: ${error.message}`,
        );
    }
};

// ----------------------------------------------------------------
// bKash Utilities (using axios for tokenized API)
// ----------------------------------------------------------------
import axios from "axios";

let bkashToken: string | null = null;

const getBkashToken = async (): Promise<string> => {
    try {
        const response = await axios.post(
            "https://tokenized.sandbox.bka.sh/v1.2.0-beta/tokenized/checkout/token/grant",
            {
                app_key: config.bkash.app_key,
                app_secret: config.bkash.app_secret,
            },
            {
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                    username: config.bkash.username,
                    password: config.bkash.password,
                },
            },
        );

        bkashToken = response.data?.id_token;
        return bkashToken || "";
    } catch (error: any) {
        throw new AppError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `bKash token grant failed: ${error.message}`,
        );
    }
};

export const bkashInit = async (data: {
    amount: number;
    orderId: string;
    customerNumber: string;
}): Promise<IPaymentResponse> => {
    try {
        const token = await getBkashToken();

        const response = await axios.post(
            "https://tokenized.sandbox.bka.sh/v1.2.0-beta/tokenized/checkout/create",
            {
                mode: "0011",
                payerReference: data.orderId,
                callbackURL: config.bkash.callback_url || "",
                amount: data.amount,
                currency: "BDT",
                intent: "sale",
                merchantInvoiceNumber: `INV-${data.orderId}`,
            },
            {
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                    Authorization: token,
                    "X-APP-Key": config.bkash.app_key,
                },
            },
        );

        if (response.data?.bkashURL) {
            return {
                success: true,
                gatewayUrl: response.data.bkashURL,
                transactionId: response.data.paymentID || "",
                message: "bKash payment initiated successfully",
            };
        }

        throw new AppError(
            StatusCodes.BAD_REQUEST,
            "Failed to get bKash payment URL",
        );
    } catch (error: any) {
        throw new AppError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `bKash initiation failed: ${error.message}`,
        );
    }
};

export const bkashValidate = async (
    paymentID: string,
): Promise<IPaymentResponse> => {
    try {
        const token = bkashToken || (await getBkashToken());

        const response = await axios.post(
            "https://tokenized.sandbox.bka.sh/v1.2.0-beta/tokenized/checkout/execute",
            { paymentID },
            {
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                    Authorization: token,
                    "X-APP-Key": config.bkash.app_key,
                },
            },
        );

        if (response.data?.transactionStatus === "Completed") {
            return {
                success: true,
                transactionId: response.data.trxID,
                status: PaymentGatewayStatus.SUCCESS,
                message: "bKash payment validated successfully",
            };
        }

        return {
            success: false,
            transactionId: response.data?.trxID || "",
            status: PaymentGatewayStatus.FAILED,
            message: "bKash payment failed or was not completed",
        };
    } catch (error: any) {
        throw new AppError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `bKash validation failed: ${error.message}`,
        );
    }
};
