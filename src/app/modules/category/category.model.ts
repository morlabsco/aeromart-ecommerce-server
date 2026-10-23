import mongoose, { Schema } from "mongoose";
import { ICategory, CategoryModel } from "./category.interface";
import AppError from "../../errors/appError";
import { StatusCodes } from "http-status-codes";

const categorySchema = new Schema<ICategory, CategoryModel>(
    {
        name: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },
        slug: {
            type: String,
            required: false,
            unique: true,
            lowercase: true,
        },
        description: {
            type: String,
            default: "",
        },
        parent: {
            type: Schema.Types.ObjectId,
            ref: "Category",
            default: null,
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
        icon: {
            type: String,
            default: "",
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

// Generate slug from name before saving only when a slug isn't provided
categorySchema.pre("save", async function (next) {
    if (this.isModified("name") && !this.slug) {
        this.slug = this.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "");
    }
    next();
});

categorySchema.statics.checkCategoryExist = async function (
    categoryId: string,
) {
    const existingCategory = await this.findOne({
        _id: categoryId,
        isDeleted: false,
    });

    if (!existingCategory) {
        throw new AppError(
            StatusCodes.NOT_FOUND,
            "Category does not exist!",
        );
    }

    return existingCategory;
};

categorySchema.statics.isCategoryNameUnique = async function (
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

categorySchema.statics.isSlugUnique = async function (
    slug: string,
    excludeId?: string,
) {
    const query: Record<string, unknown> = { slug };
    if (excludeId) {
        query._id = { $ne: excludeId };
    }
    const existing = await this.findOne(query);
    return !existing;
};

const Category = mongoose.model<ICategory, CategoryModel>(
    "Category",
    categorySchema,
);

export default Category;
