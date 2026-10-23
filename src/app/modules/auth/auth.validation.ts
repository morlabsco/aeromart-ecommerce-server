import { z } from "zod";

const loginZodSchema = z.object({
    body: z.object({
        email: z
            .string({
                required_error: "Email is required",
            })
            .email("Invalid email address"),
        password: z
            .string({
                required_error: "Password is required",
            })
            .min(6, "Password must be at least 6 characters long"),
    }),
});

const refreshTokenZodSchema = z.object({
    cookies: z.object({
        refreshToken: z.string({
            required_error: "Refresh Token is required",
        }),
    }),
});

const changePasswordZodSchema = z.object({
    body: z
        .object({
            oldPassword: z
                .string({
                    required_error: "Old password is required",
                })
                .min(6, "Password must be at least 6 characters long"),
            newPassword: z
                .string({
                    required_error: "New password is required",
                })
                .min(6, "Password must be at least 6 characters long"),
        })
        .refine((data) => data.oldPassword !== data.newPassword, {
            message:
                "New password must be different from the old password",
            path: ["newPassword"],
        }),
});

const forgotPasswordZodSchema = z.object({
    body: z.object({
        email: z
            .string({
                required_error: "Email is required",
            })
            .email("Invalid email address"),
    }),
});

const verifyOTPZodSchema = z.object({
    body: z.object({
        email: z
            .string({
                required_error: "Email is required",
            })
            .email("Invalid email address"),
        otp: z
            .string({
                required_error: "OTP is required",
            })
            .regex(/^\d{4}$/, "OTP must be exactly 4 digits"),
    }),
});

const resetPasswordZodSchema = z.object({
    body: z.object({
        token: z.string({
            required_error: "Reset token is required",
        }),
        newPassword: z
            .string({
                required_error: "New password is required",
            })
            .min(6, "Password must be at least 6 characters long"),
    }),
});

export const AuthValidation = {
    loginZodSchema,
    refreshTokenZodSchema,
    changePasswordZodSchema,
    forgotPasswordZodSchema,
    verifyOTPZodSchema,
    resetPasswordZodSchema,
};
