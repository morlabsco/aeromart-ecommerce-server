import { StatusCodes } from "http-status-codes";
import AppError from "../../errors/appError";
import QueryBuilder from "../../builder/QueryBuilder";
import { ICoupon, DiscountType } from "./coupon.interface";
import Coupon from "./coupon.model";
import { CouponSearchableFields } from "./coupon.constant";
import { ActivityServices } from "../activity/activity.service";
import { ActivityModule, ActivityType } from "../activity/activity.interface";

const getAllCoupons = async (query: Record<string, unknown>) => {
    const couponQuery = new QueryBuilder(
        Coupon.find({ isDeleted: { $ne: true } }),
        query,
    )
        .search(CouponSearchableFields)
        .filter()
        .sort()
        .paginate()
        .fields();

    const result = await couponQuery.modelQuery;
    const meta = await couponQuery.countTotal();

    return { result, meta };
};

// Admin single fetch by id — returns expired/inactive coupons too (only hides soft-deleted)
const getSingleCoupon = async (couponId: string) => {
    const coupon = await Coupon.findOne({
        _id: couponId,
        isDeleted: { $ne: true },
    });

    if (!coupon) {
        throw new AppError(StatusCodes.NOT_FOUND, "Coupon not found!");
    }

    return coupon;
};

const getCouponByCode = async (couponCode: string) => {
    const coupon = await Coupon.findOne({
        code: { $regex: new RegExp(`^${couponCode}$`, "i") },
        isDeleted: { $ne: true },
    });

    if (!coupon) {
        throw new AppError(StatusCodes.NOT_FOUND, "Coupon not found!");
    }

    // Check if coupon is within valid date range
    const now = new Date();
    if (now < coupon.startDate) {
        throw new AppError(StatusCodes.BAD_REQUEST, "Coupon is not yet active!");
    }
    if (now > coupon.endDate) {
        throw new AppError(StatusCodes.BAD_REQUEST, "Coupon has expired!");
    }
    if (!coupon.isActive) {
        throw new AppError(StatusCodes.BAD_REQUEST, "Coupon is not active!");
    }

    return coupon;
};

const createCoupon = async (payload: ICoupon) => {
    const isUnique = await Coupon.isCouponCodeUnique(payload.code);
    if (!isUnique) {
        throw new AppError(
            StatusCodes.CONFLICT,
            "Coupon with this code already exists!",
        );
    }

    // Convert date strings to Date objects
    payload.startDate = new Date(payload.startDate);
    payload.endDate = new Date(payload.endDate);

    if (payload.startDate >= payload.endDate) {
        throw new AppError(
            StatusCodes.BAD_REQUEST,
            "End date must be after start date!",
        );
    }

    if (
        payload.discountType === DiscountType.PERCENTAGE &&
        payload.discountValue > 100
    ) {
        throw new AppError(
            StatusCodes.BAD_REQUEST,
            "Percentage discount cannot exceed 100!",
        );
    }

    // Ensure code is uppercase
    payload.code = payload.code.toUpperCase();

    const coupon = await Coupon.create(payload);

    await ActivityServices.logActivity({
        module: ActivityModule.COUPON,
        type: ActivityType.CREATE,
        message: `Coupon "${coupon.code}" was created`,
        referenceId: coupon._id.toString(),
        reference: coupon.code,
    });

    return coupon;
};

const updateCoupon = async (
    couponId: string,
    payload: Partial<ICoupon>,
) => {
    const coupon = await Coupon.findOne({
        _id: couponId,
        isDeleted: { $ne: true },
    });

    if (!coupon) {
        throw new AppError(StatusCodes.NOT_FOUND, "Coupon not found!");
    }

    if (payload.code) {
        const isUnique = await Coupon.isCouponCodeUnique(
            payload.code,
            coupon._id.toString(),
        );
        if (!isUnique) {
            throw new AppError(
                StatusCodes.CONFLICT,
                "Coupon with this code already exists!",
            );
        }
        payload.code = payload.code.toUpperCase();
    }

    if (payload.discountValue !== undefined) {
        const effectiveType = payload.discountType || coupon.discountType;
        if (
            effectiveType === DiscountType.PERCENTAGE &&
            payload.discountValue > 100
        ) {
            throw new AppError(
                StatusCodes.BAD_REQUEST,
                "Percentage discount cannot exceed 100!",
            );
        }
    }

    // Merge new dates with existing ones to validate the full range
    const startDate = payload.startDate
        ? new Date(payload.startDate)
        : coupon.startDate;
    const endDate = payload.endDate
        ? new Date(payload.endDate)
        : coupon.endDate;

    if (startDate >= endDate) {
        throw new AppError(
            StatusCodes.BAD_REQUEST,
            "End date must be after start date!",
        );
    }

    if (payload.startDate) payload.startDate = startDate;
    if (payload.endDate) payload.endDate = endDate;

    const result = await Coupon.findByIdAndUpdate(coupon._id, payload, {
        new: true,
    });

    await ActivityServices.logActivity({
        module: ActivityModule.COUPON,
        type: ActivityType.UPDATE,
        message: `Coupon "${result?.code}" was updated`,
        referenceId: coupon._id.toString(),
        reference: result?.code,
    });

    return result;
};

const deleteCoupon = async (couponId: string) => {
    const coupon = await Coupon.checkCouponExist(couponId);

    coupon.isDeleted = true;
    await coupon.save();

    await ActivityServices.logActivity({
        module: ActivityModule.COUPON,
        type: ActivityType.DELETE,
        message: `Coupon "${coupon.code}" was deleted`,
        referenceId: coupon._id.toString(),
        reference: coupon.code,
    });

    return coupon;
};

export const CouponServices = {
    getAllCoupons,
    getSingleCoupon,
    getCouponByCode,
    createCoupon,
    updateCoupon,
    deleteCoupon,
};
