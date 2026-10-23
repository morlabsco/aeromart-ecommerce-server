import { Request, Response } from "express";
import { PaymentServices } from "./payment.service";
import { StatusCodes } from "http-status-codes";
import sendResponse from "../../utils/sendResponse";
import catchAsync from "../../utils/catchAsync";
import config from "../../config";
import { PaymentGatewayStatus } from "./payment.interface";

// Stripe
const initiateStripePayment = catchAsync(async (req: Request, res: Response) => {
    const { orderId } = req.params;
    const result = await PaymentServices.initiateStripePayment(orderId as string, req.body);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Stripe payment initiated successfully",
        data: result,
    });
});

const validateStripePayment = catchAsync(async (req: Request, res: Response) => {
    // Accept POST from API /stripe/validate and GET redirect from /stripe/success, /stripe/cancel
    const sessionId = (req.body.sessionId as string) || (req.query.session_id as string) || "";
    const frontendUrl = config.frontend_url || "http://localhost:3000";

    if (!sessionId) {
        return sendResponse(res, {
            statusCode: StatusCodes.BAD_REQUEST,
            success: false,
            message: "Session ID is required",
            data: null,
        });
    }

    const result = await PaymentServices.validateStripePayment({ sessionId });

    // If called via GET (redirect from Stripe), redirect the browser to frontend
    if (req.method === "GET") {
        if (result.success && result.status === PaymentGatewayStatus.SUCCESS) {
            return res.redirect(`${frontendUrl}/payment/success?tran_id=${encodeURIComponent(result.transactionId || "")}`);
        }
        return res.redirect(`${frontendUrl}/payment/failed`);
    }

    // POST call — return JSON
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: result.success ? "Payment validated successfully" : "Payment validation failed",
        data: result,
    });
});

// SSLCommerz
const initiateSSLCommerzPayment = catchAsync(async (req: Request, res: Response) => {
    const { orderId } = req.params;
    const result = await PaymentServices.initiateSSLCommerzPayment(orderId as string, req.body);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "SSLCommerz payment initiated successfully",
        data: result,
    });
});

const validateSSLCommerzPayment = catchAsync(async (req: Request, res: Response) => {
    // Read from POST form body or GET query params
    const val_id = (req.body.val_id as string) || (req.query.val_id as string) || "";
    const tran_id = (req.body.tran_id as string) || (req.query.tran_id as string) || "";
    const frontendUrl = config.frontend_url || "http://localhost:3000";

    if (!val_id) {
        return res.redirect(`${frontendUrl}/payment/failed?tran_id=${encodeURIComponent(tran_id)}`);
    }

    const result = await PaymentServices.validateSSLCommerzPayment({ val_id, tran_id });

    if (result.success && result.status === PaymentGatewayStatus.SUCCESS) {
        return res.redirect(
            `${frontendUrl}/payment/success?tran_id=${encodeURIComponent(result.transactionId || tran_id)}`,
        );
    }

    return res.redirect(`${frontendUrl}/payment/failed?tran_id=${encodeURIComponent(tran_id)}`);
});


// bKash
const initiateBkashPayment = catchAsync(async (req: Request, res: Response) => {
    const { orderId } = req.params;
    const result = await PaymentServices.initiateBkashPayment(orderId as string, req.body);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "bKash payment initiated successfully",
        data: result,
    });
});

const validateBkashPayment = catchAsync(async (req: Request, res: Response) => {
    const result = await PaymentServices.validateBkashPayment(req.body);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: result.success ? "Payment validated successfully" : "Payment validation failed",
        data: result,
    });
});

export const PaymentController = {
    initiateStripePayment,
    validateStripePayment,
    initiateSSLCommerzPayment,
    validateSSLCommerzPayment,
    initiateBkashPayment,
    validateBkashPayment,
};
