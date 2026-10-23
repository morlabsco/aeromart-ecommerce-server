import { Router } from "express";
import { BrandController } from "./brand.controller";
import validateRequest from "../../middleware/validateRequest";
import { BrandValidation } from "./brand.validation";
import { UserRole } from "../user/user.interface";
import auth from "../../middleware/auth";
import { multerUpload } from "../../config/multer.config";
import { parseBody } from "../../middleware/bodyParser";

const router = Router();

router.get("/", BrandController.getAllBrands);

router.get("/:id", BrandController.getSingleBrand);

router.post(
    "/",
    auth(UserRole.ADMIN),
    multerUpload.single("logo"),
    parseBody,
    validateRequest(BrandValidation.createBrandValidationSchema),
    BrandController.createBrand,
);

router.patch(
    "/:id",
    auth(UserRole.ADMIN),
    multerUpload.single("logo"),
    parseBody,
    validateRequest(BrandValidation.updateBrandValidationSchema),
    BrandController.updateBrand,
);

router.delete(
    "/:id",
    auth(UserRole.ADMIN),
    BrandController.deleteBrand,
);

export const BrandRoutes = router;
