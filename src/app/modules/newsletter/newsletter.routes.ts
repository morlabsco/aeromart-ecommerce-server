import { Router } from "express";
import { NewsletterController } from "./newsletter.controller";
import validateRequest from "../../middleware/validateRequest";
import { NewsletterValidation } from "./newsletter.validation";
import { UserRole } from "../user/user.interface";
import auth from "../../middleware/auth";

const router = Router();

// Public — the storefront's subscribe form (plain JSON body, no multipart).
router.post(
    "/",
    validateRequest(NewsletterValidation.subscribeValidationSchema),
    NewsletterController.subscribe,
);

// Admin — manage the subscriber list.
router.get("/", auth(UserRole.ADMIN), NewsletterController.getAllSubscribers);

router.delete(
    "/:subscriberId",
    auth(UserRole.ADMIN),
    NewsletterController.deleteSubscriber,
);

export const NewsletterRoutes = router;
