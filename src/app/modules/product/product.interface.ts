import { Document, Model, Types } from "mongoose";
import { Currency } from "../../constants/currency";

// Specification key-value pair
export interface ISpecification {
    key: string;
    value: string;
}

// Product image — keeps the Cloudinary publicId so a specific image can be
// deleted, plus an order index for cover/reordering (0 = first/cover).
export interface IProductImage {
    publicId: string;
    url: string;
    order: number;
}

// Offer pricing — a temporary sale price override (flat amount or percentage).
export interface IOfferPrice {
    type: "flat" | "percentage";
    value: number;
    startAt: Date;
    endAt: Date;
    isActive: boolean;
}

// A product variant (size/color combination) with its own sku/price/stock.
// imageUrls uses the same { publicId, url, order } shape as the main images.
export interface IProductVariant {
    sku: string;
    attributes: Record<string, string>;
    price?: number;
    stock: number;
    imageUrls: IProductImage[];
    isActive: boolean;
}

// An attribute definition — the axes a product's variants vary on
// (e.g. { key: "Color", values: ["Red", "Blue"] }).
export interface IProductAttribute {
    key: string;
    values: string[];
}

export interface IColorOption {
    name: string;
    hex?: string;
}

// Product Schema Definition
export interface IProduct extends Document {
    name: string;
    slug: string;
    description: string;
    price: number;
    currency: Currency;
    stock: number;
    weight: number;
    category: Types.ObjectId;
    imageUrls: IProductImage[];
    isActive: boolean;
    isDeleted: boolean;
    brand: Types.ObjectId;
    createdBy: Types.ObjectId;
    reviews: Types.ObjectId[];
    averageRating: number;
    ratingCount: number;
    specification: ISpecification[];
    keyFeatures: string[];
    offerPrice?: IOfferPrice | null;
    colorOptions: IColorOption[];
    attributes: IProductAttribute[];
    variants: IProductVariant[];
    hasVariants: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface ProductModel extends Model<IProduct> {
    // Check if product exists by ID
    checkProductExist(productId: string): Promise<IProduct>;
    // Check if slug is unique
    isSlugUnique(slug: string, excludeId?: string): Promise<boolean>;
}
