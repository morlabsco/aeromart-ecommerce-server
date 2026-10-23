import mongoose, { Schema } from "mongoose";
import { IProduct, ProductModel } from "./product.interface";
import { Currency } from "../../constants/currency";
import AppError from "../../errors/appError";
import { StatusCodes } from "http-status-codes";

const specificationSchema = new Schema(
    {
        key: {
            type: String,
            required: true,
        },
        value: {
            type: String,
            required: true,
        },
    },
    { _id: false },
);

const productImageSchema = new Schema(
    {
        publicId: { type: String, default: "" },
        url: { type: String, default: "" },
        order: { type: Number, default: 0 },
    },
    { _id: false },
);

const offerPriceSchema = new Schema(
    {
        type: { type: String, enum: ["flat", "percentage"], required: true },
        value: { type: Number, required: true, min: 0 },
        startAt: { type: Date, required: true },
        endAt: { type: Date, required: true },
        isActive: { type: Boolean, default: true },
    },
    { _id: false },
);

const colorOptionSchema = new Schema(
    {
        name: { type: String, required: true },
        hex: { type: String, default: "" },
    },
    { _id: false },
);

const productAttributeSchema = new Schema(
    {
        key: { type: String, required: true },
        values: { type: [String], default: [] },
    },
    { _id: false },
);

const productVariantSchema = new Schema(
    {
        // sparse: true skips docs with an empty `variants` array (no sku values)
        // so products without variants don't collide on the unique index.
        sku: { type: String, required: true, unique: true, sparse: true },
        attributes: { type: Map, of: String, required: true },
        price: { type: Number, min: 0 },
        stock: { type: Number, required: true, min: 0, default: 0 },
        imageUrls: { type: [productImageSchema], default: [] },
        isActive: { type: Boolean, default: true },
    },
    { _id: false },
);

const productSchema = new Schema<IProduct, ProductModel>(
    {
        name: {
            type: String,
            required: true,
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
            required: true,
        },
        price: {
            type: Number,
            required: true,
            min: 0,
        },
        currency: {
            type: String,
            enum: Object.values(Currency),
            default: Currency.USD,
        },
        stock: {
            type: Number,
            required: true,
            min: 0,
            default: 0,
        },
        weight: {
            type: Number,
            required: true,
            min: 0,
        },
        category: {
            type: Schema.Types.ObjectId,
            ref: "Category",
            required: true,
        },
        imageUrls: {
            type: [productImageSchema],
            default: [],
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        isDeleted: {
            type: Boolean,
            default: false,
        },
        brand: {
            type: Schema.Types.ObjectId,
            ref: "Brand",
            required: true,
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        reviews: [
            {
                type: Schema.Types.ObjectId,
                ref: "Review",
                default: [],
            },
        ],
        averageRating: {
            type: Number,
            default: 0,
            min: 0,
            max: 5,
        },
        ratingCount: {
            type: Number,
            default: 0,
            min: 0,
        },
        specification: {
            type: [specificationSchema],
            default: [],
        },
        keyFeatures: {
            type: [String],
            default: [],
        },
        offerPrice: {
            type: offerPriceSchema,
            default: null,
        },
        colorOptions: {
            type: [colorOptionSchema],
            default: [],
        },
        attributes: {
            type: [productAttributeSchema],
            default: [],
        },
        variants: {
            type: [productVariantSchema],
            default: [],
        },
        hasVariants: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
        toJSON: {
            transform: (_doc, ret) => {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { __v, ...rest } = ret;
                return rest;
            },
        },
    },
);

// Generate slug from name before saving only when a slug isn't provided
productSchema.pre("save", async function (next) {
    if (this.isModified("name") && !this.slug) {
        this.slug = this.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "");
    }
    next();
});

productSchema.statics.checkProductExist = async function (productId: string) {
    const existingProduct = await this.findOne({
        _id: productId,
        isDeleted: false,
    });

    if (!existingProduct) {
        throw new AppError(StatusCodes.NOT_FOUND, "Product does not exist!");
    }

    return existingProduct;
};

productSchema.statics.isSlugUnique = async function (
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

const Product = mongoose.model<IProduct, ProductModel>("Product", productSchema);

export default Product;
