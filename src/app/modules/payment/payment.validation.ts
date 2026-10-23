import { z } from "zod";

const stripeInitValidationSchema = z.object({
    body: z.object({}).optional(),
});

const sslCommerzInitValidationSchema = z.object({
    body: z
        .object({
            product_name: z.string().optional(),
            product_category: z.string().optional().default("General"),
            cus_name: z.string().optional(),
            cus_email: z.string().email("Invalid email").optional(),
            cus_phone: z.string().optional(),
            cus_add1: z.string().optional(),
            cus_city: z.string().optional(),
            cus_state: z.string().optional(),
            cus_postcode: z.string().optional(),
            cus_country: z.string().optional(),
            ship_name: z.string().optional(),
            ship_add1: z.string().optional(),
            ship_city: z.string().optional(),
            ship_state: z.string().optional(),
            ship_postcode: z.union([z.string(), z.number()]).optional(),
            ship_country: z.string().optional(),
        })
        .optional(),
});

const bkashInitValidationSchema = z.object({
    body: z.object({
        customerNumber: z.string().min(1, "Customer number is required"),
    }),
});

const stripeValidateValidationSchema = z.object({
    body: z.object({
        paymentIntentId: z.string().min(1, "Payment intent ID is required"),
    }),
});

const sslCommerzValidateValidationSchema = z.object({
    body: z.object({
        val_id: z.string().min(1, "Validation ID is required"),
        tran_id: z.string().optional(),
    }),
});

const bkashValidateValidationSchema = z.object({
    body: z.object({
        paymentID: z.string().min(1, "Payment ID is required"),
    }),
});

export const PaymentValidation = {
    stripeInitValidationSchema,
    sslCommerzInitValidationSchema,
    bkashInitValidationSchema,
    stripeValidateValidationSchema,
    sslCommerzValidateValidationSchema,
    bkashValidateValidationSchema,
};
