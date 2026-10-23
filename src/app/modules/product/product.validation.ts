import { z } from "zod";
import { Currency } from "../../constants/currency";

const specificationSchema = z.object({
    key: z.string().min(1, "Specification key is required"),
    value: z.string().min(1, "Specification value is required"),
});

const attributeSchema = z.object({
    key: z.string().min(1, "Attribute key is required"),
    values: z.array(z.string().min(1)).default([]),
});

// Product/variant image — { publicId, url, order } (order 0 = cover/first).
// url is optional: on update, { publicId, order } is enough (url backfilled);
// a placeholder {} declares a NEW image slot filled from uploaded files.
const productImageSchema = z.object({
    publicId: z.string().optional().default(""),
    url: z.string().optional().default(""),
    order: z.number().min(0).default(0),
});

const createProductValidationSchema = z.object({
    body: z.object({
        name: z.string().min(1, "Product name is required"),
        slug: z
            .string()
            .min(1, "Slug cannot be empty")
            .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid slug format")
            .optional(),
        description: z.string().min(1, "Description is required"),
        price: z.number().min(0, "Price must be a positive number"),
        // currency is NOT accepted on create — it inherits from the store's
        // brand settings (settings singleton, brand.currency).
        stock: z.number().min(0, "Stock must be a non-negative number").default(0),
        weight: z.number().min(0, "Weight must be a positive number"),
        category: z.string().min(1, "Category ID is required"),
        brand: z.string().min(1, "Brand ID is required"),
        imageUrls: z.array(productImageSchema).optional().default([]),
        isActive: z.boolean().optional().default(true),
        specification: z.array(specificationSchema).optional().default([]),
        keyFeatures: z.array(z.string()).optional().default([]),
        offerPrice: z
            .object({
                type: z.enum(["flat", "percentage"]),
                value: z.number().min(0),
                startAt: z.string(),
                endAt: z.string(),
                isActive: z.boolean().optional().default(true),
            })
            .optional()
            .nullable(),
        colorOptions: z
            .array(
                z.object({
                    name: z.string().min(1),
                    hex: z.string().optional(),
                }),
            )
            .optional()
            .default([]),
        attributes: z.array(attributeSchema).optional().default([]),
        variants: z
            .array(
                z.object({
                    sku: z.string().optional(),
                    attributes: z.record(z.string(), z.string()).optional(),
                    price: z.number().min(0).optional(),
                    stock: z.number().min(0).default(0),
                    imageUrls: z.array(productImageSchema).optional().default([]),
                    isActive: z.boolean().optional().default(true),
                }),
            )
            .optional()
            .default([]),
        hasVariants: z.boolean().optional().default(false),
    }),
});

const updateProductValidationSchema = z.object({
    body: z.object({
        name: z.string().min(1, "Product name is required").optional(),
        slug: z
            .string()
            .min(1, "Slug cannot be empty")
            .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid slug format")
            .optional(),
        description: z.string().min(1, "Description is required").optional(),
        price: z.number().min(0, "Price must be a positive number").optional(),
        currency: z.nativeEnum(Currency).optional(),
        stock: z.number().min(0, "Stock must be a non-negative number").optional(),
        weight: z.number().min(0, "Weight must be a positive number").optional(),
        category: z.string().min(1, "Category ID is required").optional(),
        brand: z.string().min(1, "Brand ID is required").optional(),
        imageUrls: z.array(productImageSchema).optional(),
        isActive: z.boolean().optional(),
        specification: z.array(specificationSchema).optional(),
        keyFeatures: z.array(z.string()).optional(),
        offerPrice: z
            .object({
                type: z.enum(["flat", "percentage"]),
                value: z.number().min(0),
                startAt: z.string(),
                endAt: z.string(),
                isActive: z.boolean().optional().default(true),
            })
            .optional()
            .nullable(),
        colorOptions: z
            .array(
                z.object({
                    name: z.string().min(1),
                    hex: z.string().optional(),
                }),
            )
            .optional(),
        attributes: z.array(attributeSchema).optional(),
        variants: z
            .array(
                z.object({
                    sku: z.string().optional(),
                    attributes: z.record(z.string(), z.string()).optional(),
                    price: z.number().min(0).optional(),
                    stock: z.number().min(0).default(0),
                    imageUrls: z.array(productImageSchema).optional().default([]),
                    isActive: z.boolean().optional().default(true),
                }),
            )
            .optional(),
        hasVariants: z.boolean().optional(),
        // Image management fields (multipart body) — existing images to keep
        // (reordered), and removed image publicIds to delete from Cloudinary.
        keepImages: z
            .array(
                z.object({
                    publicId: z.string().min(1),
                    url: z.string().optional(),
                    order: z.number().min(0).default(0),
                }),
            )
            .optional(),
        removedImageIds: z.array(z.string()).optional(),
    }),
});

export const ProductValidation = {
    createProductValidationSchema,
    updateProductValidationSchema,
};
