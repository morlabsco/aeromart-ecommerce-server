import { Request, Response } from "express";
import { CouponServices } from "./coupon.service";
import { StatusCodes } from "http-status-codes";
import sendResponse from "../../utils/sendResponse";
import catchAsync from "../../utils/catchAsync";

const getAllCoupons = catchAsync(async (req: Request, res: Response) => {
    const result = await CouponServices.getAllCoupons(req.query);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Coupons retrieved successfully",
        meta: result.meta,
        data: result.result,
    });
});

const getSingleCoupon = catchAsync(async (req: Request, res: Response) => {
    const couponId = req.params.couponId as string;
    const result = await CouponServices.getSingleCoupon(couponId);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Coupon retrieved successfully",
        data: result,
    });
});

const getCouponByCode = catchAsync(async (req: Request, res: Response) => {
    const code = req.params.code as string;
    const result = await CouponServices.getCouponByCode(code);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Coupon retrieved successfully",
        data: result,
    });
});

const createCoupon = catchAsync(async (req: Request, res: Response) => {
    const result = await CouponServices.createCoupon(req.body);

    sendResponse(res, {
        statusCode: StatusCodes.CREATED,
        success: true,
        message: "Coupon created successfully",
        data: result,
    });
});

const updateCoupon = catchAsync(async (req: Request, res: Response) => {
    const couponId = req.params.couponId as string;
    const result = await CouponServices.updateCoupon(couponId, req.body);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Coupon updated successfully",
        data: result,
    });
});

const deleteCoupon = catchAsync(async (req: Request, res: Response) => {
    const couponId = req.params.couponId as string;
    const result = await CouponServices.deleteCoupon(couponId);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Coupon deleted successfully",
        data: result,
    });
});

export const CouponController = {
    getAllCoupons,
    getSingleCoupon,
    getCouponByCode,
    createCoupon,
    updateCoupon,
    deleteCoupon,
};
