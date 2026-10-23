import { Router } from "express";
import { UserRoutes } from "../modules/user/user.routes";
import { AuthRoutes } from "../modules/auth/auth.routes";
import { ProductRoutes } from "../modules/product/product.routes";
import { OrderRoutes } from "../modules/order/order.routes";
import { MetaRoutes } from "../modules/meta/meta.routes";
import { BrandRoutes } from "../modules/brand/brand.routes";
import { CouponRoutes } from "../modules/coupon/coupon.routes";
import { CategoryRoutes } from "../modules/category/category.routes";
import { ReviewRoutes } from "../modules/review/review.routes";
import { PaymentRoutes } from "../modules/payment/payment.routes";
import { SettingsRoutes } from "../modules/settings/settings.routes";
import { ActivityRoutes } from "../modules/activity/activity.routes";

const router = Router();

const moduleRoutes = [
    {
        path: "/user",
        route: UserRoutes,
    },
    {
        path: "/auth",
        route: AuthRoutes,
    },
    {
        path: "/product",
        route: ProductRoutes,
    },
    {
        path: "/order",
        route: OrderRoutes,
    },
    {
        path: "/meta",
        route: MetaRoutes,
    },
    {
        path: "/brand",
        route: BrandRoutes,
    },
    {
        path: "/coupon",
        route: CouponRoutes,
    },
    {
        path: "/category",
        route: CategoryRoutes,
    },
    {
        path: "/review",
        route: ReviewRoutes,
    },
    {
        path: "/payment",
        route: PaymentRoutes,
    },
    {
        path: "/settings",
        route: SettingsRoutes,
    },
    {
        path: "/activity",
        route: ActivityRoutes,
    },
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;
