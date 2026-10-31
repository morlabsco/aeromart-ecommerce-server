import { Document, Model, Types } from "mongoose";

export enum DiscountType {
    PERCENTAGE = "percentage",
    FIXED = "fixed",
}

export interface ICoupon extends Document {
    code: string;
    discountType: DiscountType;
    discountValue: number;
    minOrderAmount: number;
    maxDiscountAmount: number;
    /** Product ids this coupon is scoped to — EMPTY/absent means it applies
     * to the whole order. When set, only these products' subtotal counts
     * toward the minimum and receives the discount. */
    applicableProducts?: Types.ObjectId[];
    startDate: Date;
    endDate: Date;
    isActive: boolean;
    isDeleted: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface CouponModel extends Model<ICoupon> {
    checkCouponExist(couponId: string): Promise<ICoupon>;
    isCouponCodeUnique(code: string, excludeId?: string): Promise<boolean>;
}
