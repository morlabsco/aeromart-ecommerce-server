import { StatusCodes } from "http-status-codes";
import AppError from "../../errors/appError";
import QueryBuilder from "../../builder/QueryBuilder";
import { IBrand } from "./brand.interface";
import Brand from "./brand.model";
import { BrandSearchableFields } from "./brand.constant";
import { IJwtPayload } from "../auth/auth.interface";
import { IImageFile } from "../../interface/IImageFile";
import { ActivityServices } from "../activity/activity.service";
import { ActivityModule, ActivityType } from "../activity/activity.interface";
import { destroyCloudinaryUrls } from "../../config/cloudinary.config";

const getAllBrands = async (query: Record<string, unknown>) => {
    const brandQuery = new QueryBuilder(Brand.find({ isDeleted: false }), query)
        .search(BrandSearchableFields)
        .filter()
        .sort()
        .paginate()
        .fields();

    const result = await brandQuery.modelQuery.populate("createdBy", "name email");
    const meta = await brandQuery.countTotal();

    return { result, meta };
};

const getSingleBrand = async (brandId: string) => {
    const brand = await Brand.findOne({
        _id: brandId,
        isDeleted: false,
    }).populate("createdBy", "name email");

    if (!brand) {
        throw new AppError(StatusCodes.NOT_FOUND, "Brand does not exist!");
    }

    return brand;
};

const createBrand = async (
    payload: IBrand,
    authUser: IJwtPayload,
    file?: IImageFile,
) => {
    const isUnique = await Brand.isBrandNameUnique(payload.name);
    if (!isUnique) {
        throw new AppError(StatusCodes.CONFLICT, "Brand with this name already exists!");
    }

    payload.createdBy = authUser.userId as any;

    if (file?.path) {
        payload.logo = file.path;
    }

    const brand = await Brand.create(payload);

    await ActivityServices.logActivity({
        module: ActivityModule.BRAND,
        type: ActivityType.CREATE,
        message: `Brand "${brand.name}" was created`,
        referenceId: brand._id.toString(),
        performedBy: authUser.userId,
    });

    return brand;
};

const updateBrand = async (
    brandId: string,
    payload: Partial<IBrand>,
    file?: IImageFile,
) => {
    const existing = await Brand.checkBrandExist(brandId);

    if (payload.name) {
        const isUnique = await Brand.isBrandNameUnique(payload.name, brandId);
        if (!isUnique) {
            throw new AppError(StatusCodes.CONFLICT, "Brand with this name already exists!");
        }
    }

    const previousLogo = existing.logo as string | null | undefined;
    if (file?.path) {
        payload.logo = file.path;
    }

    const result = await Brand.findByIdAndUpdate(brandId, payload, {
        new: true,
    });

    // DB write succeeded — destroy the replaced logo from Cloudinary.
    if (previousLogo && file?.path && previousLogo !== file.path) {
        await destroyCloudinaryUrls([previousLogo]);
    }

    await ActivityServices.logActivity({
        module: ActivityModule.BRAND,
        type: ActivityType.UPDATE,
        message: `Brand "${result?.name}" was updated`,
        referenceId: brandId,
    });

    return result;
};

const deleteBrand = async (brandId: string) => {
    const brand = await Brand.checkBrandExist(brandId);

    brand.isDeleted = true;
    await brand.save();

    await ActivityServices.logActivity({
        module: ActivityModule.BRAND,
        type: ActivityType.DELETE,
        message: `Brand "${brand.name}" was deleted`,
        referenceId: brand._id.toString(),
    });

    return brand;
};

export const BrandServices = {
    getAllBrands,
    getSingleBrand,
    createBrand,
    updateBrand,
    deleteBrand,
};
