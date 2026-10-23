import { Document, Model } from "mongoose";

export enum UserRole {
    ADMIN = "admin",
    MANAGER = "manager",
    CUSTOMER = "customer",
}

// User Schema Definition
export interface IUser extends Document {
    email: string;
    password: string;
    name: string;
    role: UserRole;
    phoneNo?: string;
    gender?: "Male" | "Female" | "Other";
    dateOfBirth?: Date;
    address?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
    photoUrl: string;
    clientInfo: {
        device: "pc" | "mobile"; // Device type
        browser: string; // Browser name
        ipAddress: string; // User IP address
        pcName?: string; // Optional PC name
        os?: string; // Optional OS name (Windows, MacOS, etc.)
        userAgent?: string; // Optional user agent string
    };
    lastLogin: Date;
    isActive: boolean;
    otpToken?: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface UserModel extends Model<IUser> {
    // Instance methods for checking if passwords are matched
    isPasswordMatched(
        plainTextPassword: string,
        hashedPassword: string,
    ): Promise<boolean>;
    isUserExistsByEmail(id: string): Promise<IUser>;
    checkUserExist(userId: string): Promise<IUser>;
}
