import { Request, Response } from "express";
import { CategoryServices } from "./category.service";
import { StatusCodes } from "http-status-codes";
import sendResponse from "../../utils/sendResponse";
import catchAsync from "../../utils/catchAsync";
import { IJwtPayload } from "../auth/auth.interface";
import { IImageFile } from "../../interface/IImageFile";

const getAllCategories = catchAsync(async (req: Request, res: Response) => {
    const result = await CategoryServices.getAllCategories(req.query);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Categories retrieved successfully",
        meta: result.meta,
        data: result.result,
    });
});

const getSingleCategory = catchAsync(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const result = await CategoryServices.getSingleCategory(id);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Category retrieved successfully",
        data: result,
    });
});

const createCategory = catchAsync(async (req: Request, res: Response) => {
    const result = await CategoryServices.createCategory(
        req.body,
        req.user as IJwtPayload,
        req.file as IImageFile,
    );

    sendResponse(res, {
        statusCode: StatusCodes.CREATED,
        success: true,
        message: "Category created successfully",
        data: result,
    });
});

const updateCategory = catchAsync(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const result = await CategoryServices.updateCategory(
        id,
        req.body,
        req.file as IImageFile,
    );

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Category updated successfully",
        data: result,
    });
});

const deleteCategory = catchAsync(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const result = await CategoryServices.deleteCategory(id);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Category deleted successfully",
        data: result,
    });
});

export const CategoryController = {
    getAllCategories,
    getSingleCategory,
    createCategory,
    updateCategory,
    deleteCategory,
};
