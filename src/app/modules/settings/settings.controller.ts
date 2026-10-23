import { Request, Response } from "express";
import { SettingsServices } from "./settings.service";
import { StatusCodes } from "http-status-codes";
import sendResponse from "../../utils/sendResponse";
import catchAsync from "../../utils/catchAsync";
import { SETTINGS_SECTIONS } from "./settings.constant";
import AppError from "../../errors/appError";

const getSettings = catchAsync(async (_req: Request, res: Response) => {
    const result = await SettingsServices.getSettings();

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Settings retrieved successfully",
        data: result,
    });
});

const updateBrandFields = catchAsync(async (req: Request, res: Response) => {
    const files = req.files as {
        logo?: Express.Multer.File[];
        favicon?: Express.Multer.File[];
    };

    const result = await SettingsServices.updateBrandFields(
        req.body.brand ?? req.body,
        files,
    );

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Settings updated successfully",
        data: result,
    });
});

const updateSection = catchAsync(async (req: Request, res: Response) => {
    const { section } = req.params;

    if (!SETTINGS_SECTIONS.includes(section as any)) {
        throw new AppError(StatusCodes.BAD_REQUEST, "Invalid settings section!");
    }

    const files = (req.files as Express.Multer.File[]) ?? undefined;

    const result = await SettingsServices.updateSection(
        section as any,
        req.body,
        files,
    );

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: `${section} settings updated successfully`,
        data: result,
    });
});

const applyNichePreset = catchAsync(async (req: Request, res: Response) => {
    const { niche } = req.params;

    if (Array.isArray(niche)) {
        throw new AppError(StatusCodes.BAD_REQUEST, "Invalid niche!");
    }

    const result = await SettingsServices.applyNichePreset(niche);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: `${niche} preset applied successfully`,
        data: result,
    });
});

const applyFullReset = catchAsync(async (req: Request, res: Response) => {
    const { niche } = req.params;

    if (Array.isArray(niche)) {
        throw new AppError(StatusCodes.BAD_REQUEST, "Invalid niche!");
    }

    const result = await SettingsServices.applyFullReset(niche);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: `Settings fully reset to the ${niche} preset`,
        data: result,
    });
});

export const SettingsController = {
    getSettings,
    updateBrandFields,
    updateSection,
    applyNichePreset,
    applyFullReset,
};
