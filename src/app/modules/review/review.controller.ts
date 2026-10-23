import { Request, Response } from "express";
import { ReviewServices } from "./review.service";
import { StatusCodes } from "http-status-codes";
import sendResponse from "../../utils/sendResponse";
import catchAsync from "../../utils/catchAsync";
import { IJwtPayload } from "../auth/auth.interface";

const getAllReviews = catchAsync(async (req: Request, res: Response) => {
    const result = await ReviewServices.getAllReviews(req.query);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Reviews retrieved successfully",
        meta: result.meta,
        data: result.result,
    });
});

const getSingleReview = catchAsync(async (req: Request, res: Response) => {
    const reviewId = req.params.reviewId as string;
    const result = await ReviewServices.getSingleReview(reviewId);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Review retrieved successfully",
        data: result,
    });
});

const getMyReviews = catchAsync(async (req: Request, res: Response) => {
    const result = await ReviewServices.getMyReviews(
        req.user as IJwtPayload,
        req.query,
    );

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "My reviews retrieved successfully",
        meta: result.meta,
        data: result.result,
    });
});

const createReview = catchAsync(async (req: Request, res: Response) => {
    const result = await ReviewServices.createReview(
        req.body,
        req.user as IJwtPayload,
    );

    sendResponse(res, {
        statusCode: StatusCodes.CREATED,
        success: true,
        message: "Review created successfully",
        data: result,
    });
});

const toggleReviewFlag = catchAsync(async (req: Request, res: Response) => {
    const reviewId = req.params.reviewId as string;
    const result = await ReviewServices.toggleReviewFlag(reviewId);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: `Review is now ${result.isFlagged ? "flagged" : "unflagged"}`,
        data: result,
    });
});

const deleteReview = catchAsync(async (req: Request, res: Response) => {
    const reviewId = req.params.reviewId as string;
    const result = await ReviewServices.deleteReview(reviewId);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Review deleted successfully",
        data: result,
    });
});

export const ReviewController = {
    getAllReviews,
    getSingleReview,
    getMyReviews,
    createReview,
    toggleReviewFlag,
    deleteReview,
};
