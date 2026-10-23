import { Request, Response } from "express";
import { ProductServices } from "./product.service";
import { StatusCodes } from "http-status-codes";
import sendResponse from "../../utils/sendResponse";
import catchAsync from "../../utils/catchAsync";
import { IImageFiles } from "../../interface/IImageFile";
import { IJwtPayload } from "../auth/auth.interface";

const getAllProducts = catchAsync(async (req: Request, res: Response) => {
    const result = await ProductServices.getAllProducts(req.query);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Products retrieved successfully",
        meta: result.meta,
        data: result.result,
    });
});

const getSingleProduct = catchAsync(async (req: Request, res: Response) => {
    const { productId } = req.params;
    const result = await ProductServices.getSingleProduct(productId as string);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Product retrieved successfully",
        data: result,
    });
});

const createProduct = catchAsync(async (req: Request, res: Response) => {
    const files = req.files as IImageFiles;
    const mainImages = files?.images || [];
    const variantImages = files?.variantImages || [];
    const result = await ProductServices.createProduct(
        req.body,
        req.user as IJwtPayload,
        mainImages,
        variantImages,
    );

    sendResponse(res, {
        statusCode: StatusCodes.CREATED,
        success: true,
        message: "Product created successfully",
        data: result,
    });
});

const updateProduct = catchAsync(async (req: Request, res: Response) => {
    const { productId } = req.params;
    const files = req.files as IImageFiles;
    const mainImages = files?.images || [];
    const variantImages = files?.variantImages || [];
    const result = await ProductServices.updateProduct(
        productId as string,
        req.body,
        mainImages,
        variantImages,
    );

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Product updated successfully",
        data: result,
    });
});

const deleteProduct = catchAsync(async (req: Request, res: Response) => {
    const { productId } = req.params;
    const result = await ProductServices.deleteProduct(productId as string);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Product deleted successfully",
        data: result,
    });
});

export const ProductController = {
    getAllProducts,
    getSingleProduct,
    createProduct,
    updateProduct,
    deleteProduct,
};
