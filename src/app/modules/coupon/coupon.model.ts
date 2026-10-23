import mongoose, { Schema } from "mongoose";
import { ICoupon, CouponModel, DiscountType } from "./coupon.interface";
import AppError from "../../errors/appError";
import { StatusCodes } from "http-status-codes";

const couponSchema = new Schema<ICoupon, CouponModel>(
    {
        code: {
            type: String,
            required: true,
            unique: true,
            uppercase: true,
            trim: true,
        },
        discountType: {
            type: String,
            enum: Object.values(DiscountType),
            required: true,
        },
        discountValue: {
            type: Number,
            required: true,
            min: 0,
        },
        minOrderAmount: {
            type: Number,
            default: 0,
            min: 0,
        },
        maxDiscountAmount: {
            type: Number,
            default: 0,
            min: 0,
        },
        startDate: {
            type: Date,
            required: true,
        },
        endDate: {
            type: Date,
            required: true,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        isDeleted: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
        toJSON: {
            transform: (_doc, ret) => {
                const { __v, ...rest } = ret;
                return rest;
            },
        },
    },
);

// Only return coupons that aren't soft-deleted
couponSchema.pre("find", function (next) {
    if (!this.getFilter().isDeleted) {
        this.where({ isDeleted: { $ne: true } });
    }
    next();
});

couponSchema.pre("findOne", function (next) {
    if (!this.getFilter().isDeleted) {
        this.where({ isDeleted: { $ne: true } });
    }
    next();
});

couponSchema.statics.checkCouponExist = async function (couponId: string) {
    const existingCoupon = await this.findOne({
        _id: couponId,
        isDeleted: { $ne: true },
    });

    if (!existingCoupon) {
        throw new AppError(StatusCodes.NOT_FOUND, "Coupon does not exist!");
    }

    return existingCoupon;
};

couponSchema.statics.isCouponCodeUnique = async function (
    code: string,
    excludeId?: string,
) {
    const query: Record<string, unknown> = {
        code: { $regex: new RegExp(`^${code}$`, "i") },
    };
    if (excludeId) {
        query._id = { $ne: excludeId };
    }
    const existing = await this.findOne(query);
    return !existing;
};

const Coupon = mongoose.model<ICoupon, CouponModel>("Coupon", couponSchema);

export default Coupon;
