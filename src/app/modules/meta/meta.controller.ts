import { Request, Response } from "express";
import { MetaServices } from "./meta.service";
import { StatusCodes } from "http-status-codes";
import sendResponse from "../../utils/sendResponse";
import catchAsync from "../../utils/catchAsync";

const getMetaData = catchAsync(async (req: Request, res: Response) => {
    const result = await MetaServices.getMetaData();

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Metadata retrieved successfully",
        data: result,
    });
});

export const MetaController = {
    getMetaData,
};
