import { Request, Response } from "express";
import { ActivityServices } from "./activity.service";
import { StatusCodes } from "http-status-codes";
import sendResponse from "../../utils/sendResponse";
import catchAsync from "../../utils/catchAsync";

const getAllActivities = catchAsync(async (req: Request, res: Response) => {
    const result = await ActivityServices.getAllActivities(req.query);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Activities retrieved successfully",
        meta: result.meta,
        data: result.result,
    });
});

const getSingleActivity = catchAsync(async (req: Request, res: Response) => {
    const { activityId } = req.params;
    const result = await ActivityServices.getSingleActivity(activityId as string);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Activity retrieved successfully",
        data: result,
    });
});

const clearSingleActivity = catchAsync(async (req: Request, res: Response) => {
    const { activityId } = req.params;
    const result = await ActivityServices.clearSingleActivity(activityId as string);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Activity cleared successfully",
        data: result,
    });
});

const clearActivities = catchAsync(async (req: Request, res: Response) => {
    const result = await ActivityServices.clearActivities(req.body);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Activities cleared successfully",
        data: result,
    });
});

export const ActivityController = {
    getAllActivities,
    getSingleActivity,
    clearSingleActivity,
    clearActivities,
};
