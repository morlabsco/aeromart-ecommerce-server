import { Request, Response } from "express";
import { ProductServices } from "./product.service";
import { StatusCodes } from "http-status-codes";
import sendResponse from "../../utils/sendResponse";
import catchAsync from "../../utils/catchAsync";
import { IImageFiles } from "../../interface/IImageFile";
import { IJwtPayload } from "../auth/auth.interface";
import AppError from "../../errors/appError";

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
        req.user as IJwtPayload,
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
    const result = await ProductServices.deleteProduct(
        productId as string,
        req.user as IJwtPayload,
    );

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Product deleted successfully",
        data: result,
    });
});

// Admin-only: bulk-restamp every product's currency to the store's brand
// currency. Price VALUES are never converted — only the stamp follows.
const restampAllProductCurrencies = catchAsync(
    async (req: Request, res: Response) => {
        const currency = String(req.body?.currency ?? "").trim().toLowerCase();
        if (!currency) {
            throw new AppError(
                StatusCodes.BAD_REQUEST,
                "A currency code is required!",
            );
        }

        const result = await ProductServices.restampAllProductCurrencies(
            currency,
            req.user as IJwtPayload,
        );

        sendResponse(res, {
            statusCode: StatusCodes.OK,
            success: true,
            message: `All products now use ${currency.toUpperCase()}`,
            data: result,
        });
    },
);

export const ProductController = {
    restampAllProductCurrencies,
    getAllProducts,
    getSingleProduct,
    createProduct,
    updateProduct,
    deleteProduct,
};
