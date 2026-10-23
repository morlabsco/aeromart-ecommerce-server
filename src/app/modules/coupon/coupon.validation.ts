import { z } from "zod";
import { DiscountType } from "./coupon.interface";

const createCouponValidationSchema = z.object({
    body: z
        .object({
            code: z.string().min(1, "Coupon code is required"),
            discountType: z.nativeEnum(DiscountType, {
                errorMap: () => ({ message: "Invalid discount type" }),
            }),
            discountValue: z
                .number()
                .min(0, "Discount value must be a positive number"),
            minOrderAmount: z.number().min(0).optional().default(0),
            maxDiscountAmount: z.number().min(0).optional().default(0),
            startDate: z.string().min(1, "Start date is required"),
            endDate: z.string().min(1, "End date is required"),
            isActive: z.boolean().optional().default(true),
        })
        .superRefine((data, ctx) => {
            // Percentage discount cannot exceed 100
            if (
                data.discountType === DiscountType.PERCENTAGE &&
                data.discountValue > 100
            ) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "Percentage discount cannot exceed 100!",
                    path: ["discountValue"],
                });
            }

            // End date must be after start date
            const start = new Date(data.startDate);
            const end = new Date(data.endDate);
            if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "Invalid date format!",
                });
            } else if (start >= end) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "End date must be after start date!",
                    path: ["endDate"],
                });
            }
        }),
});

const updateCouponValidationSchema = z.object({
    body: z
        .object({
            code: z.string().min(1, "Coupon code is required").optional(),
            discountType: z
                .nativeEnum(DiscountType, {
                    errorMap: () => ({ message: "Invalid discount type" }),
                })
                .optional(),
            discountValue: z
                .number()
                .min(0, "Discount value must be a positive number")
                .optional(),
            minOrderAmount: z.number().min(0).optional(),
            maxDiscountAmount: z.number().min(0).optional(),
            startDate: z.string().optional(),
            endDate: z.string().optional(),
            isActive: z.boolean().optional(),
        })
        .superRefine((data, ctx) => {
            // Percentage discount cannot exceed 100
            if (
                data.discountType === DiscountType.PERCENTAGE &&
                data.discountValue !== undefined &&
                data.discountValue > 100
            ) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "Percentage discount cannot exceed 100!",
                    path: ["discountValue"],
                });
            }

            // If both dates are being updated, end must be after start
            if (data.startDate && data.endDate) {
                const start = new Date(data.startDate);
                const end = new Date(data.endDate);
                if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        message: "Invalid date format!",
                    });
                } else if (start >= end) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        message: "End date must be after start date!",
                        path: ["endDate"],
                    });
                }
            }
        }),
});

export const CouponValidation = {
    createCouponValidationSchema,
    updateCouponValidationSchema,
};
