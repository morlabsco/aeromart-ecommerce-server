import { Request, Response } from "express";
import { OrderServices } from "./order.service";
import { StatusCodes } from "http-status-codes";
import sendResponse from "../../utils/sendResponse";
import catchAsync from "../../utils/catchAsync";
import { IJwtPayload } from "../auth/auth.interface";

const getAllOrders = catchAsync(async (req: Request, res: Response) => {
    const result = await OrderServices.getAllOrders(req.query);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Orders retrieved successfully",
        meta: result.meta,
        data: result.result,
    });
});

const getMyOrders = catchAsync(async (req: Request, res: Response) => {
    const result = await OrderServices.getMyOrders(
        req.user as IJwtPayload,
        req.query,
    );

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "My orders retrieved successfully",
        meta: result.meta,
        data: result.result,
    });
});

const getOrderDetails = catchAsync(async (req: Request, res: Response) => {
    const { orderId } = req.params;
    const result = await OrderServices.getOrderDetails(
        orderId as string,
        req.user as IJwtPayload,
    );

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Order details retrieved successfully",
        data: result,
    });
});

const createOrder = catchAsync(async (req: Request, res: Response) => {
    const result = await OrderServices.createOrder(
        req.body,
        req.user as IJwtPayload | undefined,
    );

    sendResponse(res, {
        statusCode: StatusCodes.CREATED,
        success: true,
        message: "Order created successfully",
        data: result,
    });
});

const trackOrder = catchAsync(async (req: Request, res: Response) => {
    const { orderId } = req.params;
    const result = await OrderServices.trackOrder(orderId as string);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Order tracking details retrieved successfully",
        data: result,
    });
});

const getInvoiceData = catchAsync(async (req: Request, res: Response) => {
    const { orderId } = req.params;
    const by = req.query.by as string | undefined;
    const result = await OrderServices.getInvoiceData(orderId as string, by);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Order invoice retrieved successfully",
        data: result,
    });
});

const updateOrder = catchAsync(async (req: Request, res: Response) => {
    const { orderId } = req.params;
    const result = await OrderServices.updateOrder(
        orderId as string,
        req.body,
        req.user as IJwtPayload,
    );

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Order updated successfully",
        data: result,
    });
});

const changeOrderStatus = catchAsync(async (req: Request, res: Response) => {
    const { orderId } = req.params;
    const { status } = req.body;
    const result = await OrderServices.changeOrderStatus(
        orderId as string,
        status,
        req.user as IJwtPayload | undefined,
    );

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: `Order status updated to ${status}`,
        data: result,
    });
});

export const OrderController = {
    getAllOrders,
    getMyOrders,
    getOrderDetails,
    createOrder,
    updateOrder,
    changeOrderStatus,
    trackOrder,
    getInvoiceData,
};
