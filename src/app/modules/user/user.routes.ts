import { Router } from "express";
import { UserController } from "./user.controller";
import clientInfoParser from "../../middleware/clientInfoParser";
import validateRequest from "../../middleware/validateRequest";
import { UserValidation } from "./user.validation";
import { UserRole } from "./user.interface";
import auth from "../../middleware/auth";
import { multerUpload } from "../../config/multer.config";
import { parseBody } from "../../middleware/bodyParser";

const router = Router();

router.get('/', auth(UserRole.ADMIN), UserController.getAllUser);

router.get('/me', auth(UserRole.ADMIN, UserRole.MANAGER, UserRole.CUSTOMER), UserController.myProfile);

// Admin-only single fetch (registered after /me so the literal path wins).
router.get(
    "/:id",
    auth(UserRole.ADMIN),
    UserController.getUserById,
);

router.post(
    "/register",
    clientInfoParser,
    validateRequest(UserValidation.userValidationSchema),
    UserController.registerUser,
);

// Admin-only: create a dashboard user (manager/customer/admin).
router.post(
    "/",
    auth(UserRole.ADMIN),
    validateRequest(UserValidation.createUserByAdminSchema),
    UserController.createUserByAdmin,
);

// Update profile
router.patch(
   '/update-profile',
   auth(UserRole.ADMIN, UserRole.MANAGER, UserRole.CUSTOMER),
   multerUpload.single('profilePhoto'),
   parseBody,
   validateRequest(UserValidation.userProfileUpdateSchema),
   UserController.updateProfile
);

router.patch(
   '/:id/status',
   auth(UserRole.ADMIN),
   UserController.updateUserStatus
);

// Admin-only: switch customer <-> manager (admin role is DB-managed only).
router.patch(
    "/:id/role",
    auth(UserRole.ADMIN),
    validateRequest(UserValidation.updateUserRoleSchema),
    UserController.updateUserRole,
);

export const UserRoutes = router;
