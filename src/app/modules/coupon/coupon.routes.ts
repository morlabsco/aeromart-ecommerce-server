import { Router } from "express";
import { CouponController } from "./coupon.controller";
import validateRequest from "../../middleware/validateRequest";
import { CouponValidation } from "./coupon.validation";
import { UserRole } from "../user/user.interface";
import auth from "../../middleware/auth";

const router = Router();

router.get("/", auth(UserRole.ADMIN, UserRole.MANAGER), CouponController.getAllCoupons);

router.get(
    "/:couponId",
    auth(UserRole.ADMIN, UserRole.MANAGER),
    CouponController.getSingleCoupon,
);

router.get("/by-code/:code", CouponController.getCouponByCode);

router.post(
    "/",
    auth(UserRole.ADMIN, UserRole.MANAGER),
    validateRequest(CouponValidation.createCouponValidationSchema),
    CouponController.createCoupon,
);

router.patch(
    "/:couponId",
    auth(UserRole.ADMIN, UserRole.MANAGER),
    validateRequest(CouponValidation.updateCouponValidationSchema),
    CouponController.updateCoupon,
);

router.delete(
    "/:couponId",
    auth(UserRole.ADMIN),
    CouponController.deleteCoupon,
);

export const CouponRoutes = router;
