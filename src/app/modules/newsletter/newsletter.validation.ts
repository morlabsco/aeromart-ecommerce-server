import { z } from "zod";

export const subscribeValidationSchema = z.object({
    body: z.object({
        email: z.string().email("Enter a valid email address"),
    }),
});

export const NewsletterValidation = {
    subscribeValidationSchema,
};
