import { z } from "zod";

const createReviewValidationSchema = z.object({
    body: z.object({
        rating: z
            .number()
            .min(1, "Rating must be at least 1")
            .max(5, "Rating must be at most 5"),
        description: z.string().min(1, "Review description is required"),
        product: z.string().min(1, "Product ID is required"),
        // Populated by the controller from the uploaded files (JSON body
        // submits it as []); validated here so a raw JSON caller can't stuff
        // arbitrary values in.
        photoUrls: z.array(z.string().url()).max(3).optional(),
    }),
});

export const ReviewValidation = {
    createReviewValidationSchema,
};
