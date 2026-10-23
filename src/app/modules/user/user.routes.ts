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

router.get('/me', auth(UserRole.ADMIN, UserRole.CUSTOMER), UserController.myProfile);

router.post(
    "/register",
    clientInfoParser,
    validateRequest(UserValidation.userValidationSchema),
    UserController.registerUser,
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

export const UserRoutes = router;
