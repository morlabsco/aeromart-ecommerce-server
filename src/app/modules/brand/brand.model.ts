import mongoose, { Schema } from "mongoose";
import { IBrand, BrandModel } from "./brand.interface";
import AppError from "../../errors/appError";
import { StatusCodes } from "http-status-codes";

const brandSchema = new Schema<IBrand, BrandModel>(
    {
        name: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },
        description: {
            type: String,
            default: "",
        },
        logo: {
            type: String,
            default: "",
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        isDeleted: {
            type: Boolean,
            default: false,
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
    },
    {
        timestamps: true,
        toJSON: {
            transform: (_doc, ret) => {
                const { __v, ...rest } = ret;
                return rest;
            },
        },
    },
);

brandSchema.statics.checkBrandExist = async function (brandId: string) {
    const existingBrand = await this.findById(brandId);

    if (!existingBrand) {
        throw new AppError(StatusCodes.NOT_FOUND, "Brand does not exist!");
    }

    return existingBrand;
};

brandSchema.statics.isBrandNameUnique = async function (
    name: string,
    excludeId?: string,
) {
    const query: Record<string, unknown> = {
        name: { $regex: new RegExp(`^${name}$`, "i") },
    };
    if (excludeId) {
        query._id = { $ne: excludeId };
    }
    const existing = await this.findOne(query);
    return !existing;
};

const Brand = mongoose.model<IBrand, BrandModel>("Brand", brandSchema);

export default Brand;
