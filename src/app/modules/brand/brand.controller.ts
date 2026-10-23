import { Request, Response } from "express";
import { BrandServices } from "./brand.service";
import { StatusCodes } from "http-status-codes";
import sendResponse from "../../utils/sendResponse";
import catchAsync from "../../utils/catchAsync";
import { IJwtPayload } from "../auth/auth.interface";
import { IImageFile } from "../../interface/IImageFile";

const getAllBrands = catchAsync(async (req: Request, res: Response) => {
    const result = await BrandServices.getAllBrands(req.query);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Brands retrieved successfully",
        meta: result.meta,
        data: result.result,
    });
});

const getSingleBrand = catchAsync(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const result = await BrandServices.getSingleBrand(id);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Brand retrieved successfully",
        data: result,
    });
});

const createBrand = catchAsync(async (req: Request, res: Response) => {
    const result = await BrandServices.createBrand(
        req.body,
        req.user as IJwtPayload,
        req.file as IImageFile,
    );

    sendResponse(res, {
        statusCode: StatusCodes.CREATED,
        success: true,
        message: "Brand created successfully",
        data: result,
    });
});

const updateBrand = catchAsync(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const result = await BrandServices.updateBrand(
        id,
        req.body,
        req.file as IImageFile,
    );

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Brand updated successfully",
        data: result,
    });
});

const deleteBrand = catchAsync(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const result = await BrandServices.deleteBrand(id);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Brand deleted successfully",
        data: result,
    });
});

export const BrandController = {
    getAllBrands,
    getSingleBrand,
    createBrand,
    updateBrand,
    deleteBrand,
};
