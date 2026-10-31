import { z } from "zod";
import { UserRole } from "./user.interface";

const clientInfoSchema = z.object({
    device: z.enum(["pc", "mobile"]).optional().default("pc"), // Allow only 'pc' or 'mobile'
    browser: z.string().min(1, "Browser name is required"),
    ipAddress: z.string().min(1, "IP address is required"),
    pcName: z.string().optional(), // Optional field
    os: z.string().optional(), // Optional field
    userAgent: z.string().min(1, "User agent is required"),
});

// Public signup — role is forced to customer (validation + service both
// enforce it; anything else in the payload is an escalation attempt).
const userValidationSchema = z.object({
    body: z.object({
        email: z.string().email("Invalid email address"),
        password: z
            .string()
            .min(6, "Password must be at least 6 characters long"),
        name: z.string().min(1, "Name is required"),
        role: z
            .enum([UserRole.CUSTOMER, UserRole.ADMIN, UserRole.MANAGER])
            .default(UserRole.CUSTOMER)
            .refine((value) => value === UserRole.CUSTOMER, {
                message: "Invalid role. Only customer is allowed.",
            }),
        clientInfo: clientInfoSchema, // Nested schema for client info
    }),
});

// Admin-only user creation from the dashboard (managers etc.).
const createUserByAdminSchema = z.object({
    body: z.object({
        email: z.string().email("Invalid email address"),
        password: z
            .string()
            .min(6, "Password must be at least 6 characters long"),
        name: z.string().min(1, "Name is required"),
        role: z
            .enum([UserRole.CUSTOMER, UserRole.MANAGER, UserRole.ADMIN])
            .default(UserRole.CUSTOMER),
        phoneNo: z.string().trim().min(6).max(14).optional(),
    }),
});

const userProfileUpdateSchema = z.object({
    body: z
        .object({
            name: z.string().min(1, "Name is required").optional(),
            phoneNo: z.string().min(10).max(14).optional(),
            gender: z
                .enum(["Male", "Female", "Other"])
                .default("Other")
                .optional(),
            dateOfBirth: z
                .string()
                .refine((value) => !value || !isNaN(Date.parse(value)), {
                    message: "Invalid date format. Must be a valid date.",
                })
                .optional(),
            address: z.string().optional(),
            city: z.string().optional(),
            state: z.string().optional(),
            postcode: z.string().optional(),
            country: z.string().optional(),
            photoUrl: z
                .string()
                .refine(
                    (value) =>
                        value === "" ||
                        /^(http(s)?:\/\/.*\.(?:png|jpg|jpeg))$/.test(value),
                    "Invalid photo URL format. Must be a valid image URL or empty to remove.",
                )
                .optional(),
        })
        .strict(),
});

// Admin-only role change , customer <-> manager only. The admin role is
// granted by direct database edit on purpose (a future super-admin may own
// it when the app scales).
const updateUserRoleSchema = z.object({
    body: z.object({
        role: z.enum([UserRole.CUSTOMER, UserRole.MANAGER], {
            errorMap: () => ({
                message: "Role can only be customer or manager",
            }),
        }),
    }),
});

export const UserValidation = {
    updateUserRoleSchema,
    userValidationSchema,
    createUserByAdminSchema,
    userProfileUpdateSchema,
};
