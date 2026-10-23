import { z } from "zod";

const createBrandValidationSchema = z.object({
    body: z.object({
        name: z.string().min(1, "Brand name is required"),
        description: z.string().optional().default(""),
        isActive: z.boolean().optional().default(true),
    }),
});

const updateBrandValidationSchema = z.object({
    body: z.object({
        name: z.string().min(1, "Brand name is required").optional(),
        description: z.string().optional(),
        isActive: z.boolean().optional(),
    }),
});

export const BrandValidation = {
    createBrandValidationSchema,
    updateBrandValidationSchema,
};
