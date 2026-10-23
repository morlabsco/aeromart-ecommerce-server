import { Router } from "express";
import { CategoryController } from "./category.controller";
import validateRequest from "../../middleware/validateRequest";
import { CategoryValidation } from "./category.validation";
import { UserRole } from "../user/user.interface";
import auth from "../../middleware/auth";
import { multerUpload } from "../../config/multer.config";
import { parseBody } from "../../middleware/bodyParser";

const router = Router();

router.get("/", CategoryController.getAllCategories);

router.get("/:id", CategoryController.getSingleCategory);

router.post(
    "/",
    auth(UserRole.ADMIN),
    multerUpload.single("icon"),
    parseBody,
    validateRequest(CategoryValidation.createCategoryValidationSchema),
    CategoryController.createCategory,
);

router.patch(
    "/:id",
    auth(UserRole.ADMIN),
    multerUpload.single("icon"),
    parseBody,
    validateRequest(CategoryValidation.updateCategoryValidationSchema),
    CategoryController.updateCategory,
);

router.delete(
    "/:id",
    auth(UserRole.ADMIN),
    CategoryController.deleteCategory,
);

export const CategoryRoutes = router;
