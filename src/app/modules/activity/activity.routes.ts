import { Router } from "express";
import { ActivityController } from "./activity.controller";
import { UserRole } from "../user/user.interface";
import auth from "../../middleware/auth";
import validateRequest from "../../middleware/validateRequest";
import { ActivityValidation } from "./activity.validation";

const router = Router();

// Activities are an admin-only audit log.
router.get("/", auth(UserRole.ADMIN), ActivityController.getAllActivities);

router.get(
    "/:activityId",
    auth(UserRole.ADMIN),
    ActivityController.getSingleActivity,
);

// Removes a single activity record.
router.patch(
    "/:activityId/clear",
    auth(UserRole.ADMIN),
    ActivityController.clearSingleActivity,
);

// Clears all activities OR a date range (body: { clearAll } or { from, to }).
router.patch(
    "/clear",
    auth(UserRole.ADMIN),
    validateRequest(ActivityValidation.clearActivitiesValidationSchema),
    ActivityController.clearActivities,
);

export const ActivityRoutes = router;
