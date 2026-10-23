import { Document, Model } from "mongoose";

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
