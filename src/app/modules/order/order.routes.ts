import { Router } from "express";
import { OrderController } from "./order.controller";
import validateRequest from "../../middleware/validateRequest";
import { OrderValidation } from "./order.validation";
import { UserRole } from "../user/user.interface";
import auth from "../../middleware/auth";
import optionalAuth from "../../middleware/optionalAuth";

const router = Router();

router.get("/", auth(UserRole.ADMIN, UserRole.MANAGER), OrderController.getAllOrders);

router.get(
    "/my-orders",
    auth(UserRole.CUSTOMER),
    OrderController.getMyOrders,
);

// Public order tracking — no auth required.
router.get(
    "/track-order/:orderId",
    OrderController.trackOrder,
);

// Order invoice — the frontend renders it (react-pdf). Verifies paid status.
// Public so guest (non-logged-in) users can download the invoice.
router.get(
    "/:orderId/invoice",
    OrderController.getInvoiceData,
);

router.get(
    "/:orderId",
    auth(UserRole.ADMIN, UserRole.MANAGER, UserRole.CUSTOMER),
    OrderController.getOrderDetails,
);

// Order creation is open to guests AND authenticated users (optional auth).
router.post(
    "/",
    optionalAuth(),
    validateRequest(OrderValidation.createOrderValidationSchema),
    OrderController.createOrder,
);

router.patch(
    "/:orderId",
    auth(UserRole.ADMIN, UserRole.MANAGER, UserRole.CUSTOMER),
    validateRequest(OrderValidation.updateOrderValidationSchema),
    OrderController.updateOrder,
);

router.patch(
    "/:orderId/status",
    auth(UserRole.ADMIN, UserRole.MANAGER),
    validateRequest(OrderValidation.updateOrderStatusValidationSchema),
    OrderController.changeOrderStatus,
);

// Admin-only hard delete (managers never delete).
router.delete(
    "/:orderId",
    auth(UserRole.ADMIN),
    OrderController.deleteOrder,
);

export const OrderRoutes = router;
