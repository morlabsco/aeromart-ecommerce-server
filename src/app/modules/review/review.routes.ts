import { Router } from "express";
import { ReviewController } from "./review.controller";
import validateRequest from "../../middleware/validateRequest";
import { ReviewValidation } from "./review.validation";
import { UserRole } from "../user/user.interface";
import auth from "../../middleware/auth";

const router = Router();

router.get("/", ReviewController.getAllReviews);

router.get(
    "/my-reviews",
    auth(UserRole.CUSTOMER),
    ReviewController.getMyReviews,
);

router.get("/:reviewId", ReviewController.getSingleReview);

router.post(
    "/",
    auth(UserRole.CUSTOMER),
    validateRequest(ReviewValidation.createReviewValidationSchema),
    ReviewController.createReview,
);

router.patch(
    "/:reviewId/status",
    auth(UserRole.ADMIN),
    ReviewController.toggleReviewFlag,
);

router.delete(
    "/:reviewId",
    auth(UserRole.ADMIN),
    ReviewController.deleteReview,
);

export const ReviewRoutes = router;
