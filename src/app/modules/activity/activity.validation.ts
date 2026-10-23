import { z } from "zod";

const clearActivitiesValidationSchema = z.object({
    body: z
        .object({
            clearAll: z.boolean().optional(),
            from: z.string().optional(),
            to: z.string().optional(),
        })
        .refine(
            (data) => Boolean(data.clearAll || data.from || data.to),
            {
                message:
                    "Provide clearAll: true or a from/to date range to clear activities!",
            },
        ),
});

export const ActivityValidation = {
    clearActivitiesValidationSchema,
};
