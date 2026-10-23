import { Router } from "express";
import { PaymentController } from "./payment.controller";
import validateRequest from "../../middleware/validateRequest";
import { PaymentValidation } from "./payment.validation";

const router = Router();

// Stripe — public so guest (non-logged-in) users can initiate payment
router.post(
    "/:orderId/stripe/init",
    validateRequest(PaymentValidation.stripeInitValidationSchema),
    PaymentController.initiateStripePayment,
);

// Stripe redirect callbacks — Stripe redirects the browser here after Checkout
router.all("/stripe/success", PaymentController.validateStripePayment);
router.all("/stripe/cancel", PaymentController.validateStripePayment);

// SSLCommerz — public so guest (non-logged-in) users can initiate payment
router.post(
    "/:orderId/sslcommerz/init",
    validateRequest(PaymentValidation.sslCommerzInitValidationSchema),
    PaymentController.initiateSSLCommerzPayment,
);

// SSLCommerz — accepts POST (SSLCommerz server) and GET (browser redirect)
router.all("/sslcommerz/validate", PaymentController.validateSSLCommerzPayment);

// bKash — public so guest (non-logged-in) users can initiate and validate payment
router.post(
    "/:orderId/bkash/init",
    validateRequest(PaymentValidation.bkashInitValidationSchema),
    PaymentController.initiateBkashPayment,
);

router.post(
    "/bkash/validate",
    validateRequest(PaymentValidation.bkashValidateValidationSchema),
    PaymentController.validateBkashPayment,
);

export const PaymentRoutes = router;
