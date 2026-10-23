import { Document, Model, Types } from "mongoose";

// The modules whose writes are tracked as activities.
export enum ActivityModule {
    ORDER = "Order",
    BRAND = "Brand",
    CATEGORY = "Category",
    PRODUCT = "Product",
    REVIEW = "Review",
    USER = "User",
    SETTINGS = "Settings",
    COUPON = "Coupon",
    PAYMENT = "Payment",
}

// The kind of write operation that produced the activity.
export enum ActivityType {
    CREATE = "create",
    UPDATE = "update",
    DELETE = "delete",
    STATUS = "status",
    PRESET = "preset",
}

export interface IActivity extends Document {
    // Module the activity belongs to (e.g. "Order", "Product").
    module: ActivityModule;
    // Operation kind (create / update / delete / status).
    type: ActivityType;
    // Human-friendly summary of the activity.
    message: string;
    // The id of the affected document (optional — e.g. order/preset has none).
    referenceId?: Types.ObjectId | string;
    // Short human-readable reference (e.g. an orderId like "DE07D08M0001U").
    reference?: string;
    // Who performed the action (null = system/guest).
    performedBy?: Types.ObjectId | string | null;
    // Extra context (e.g. previous status → new status). Kept generic.
    metadata?: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
}

export interface ActivityModel extends Model<IActivity> {}
