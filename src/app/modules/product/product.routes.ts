import { Router } from "express";
import { ProductController } from "./product.controller";
import validateRequest from "../../middleware/validateRequest";
import { ProductValidation } from "./product.validation";
import { UserRole } from "../user/user.interface";
import auth from "../../middleware/auth";
import { multerUploadFields } from "../../config/multer.config";
import { parseBody } from "../../middleware/bodyParser";

const router = Router();

router.get("/", ProductController.getAllProducts);

router.get("/:productId", ProductController.getSingleProduct);

router.post(
    "/",
    auth(UserRole.ADMIN, UserRole.MANAGER),
    multerUploadFields([
        { name: "images", maxCount: 10 },
        { name: "variantImages", maxCount: 60 },
    ]),
    parseBody,
    validateRequest(ProductValidation.createProductValidationSchema),
    ProductController.createProduct,
);

// Admin-only bulk restamp: sets `currency` on EVERY product to the store's
// new brand currency (values are NOT converted — numbers stay, only the
// currency stamp follows the store). Used by the brand-settings currency
// force-change flow. MUST stay above PATCH /:productId (a literal path can't
// be matched as an :productId param).
router.patch(
    "/currency",
    auth(UserRole.ADMIN),
    ProductController.restampAllProductCurrencies,
);

router.patch(
    "/:productId",
    auth(UserRole.ADMIN, UserRole.MANAGER),
    multerUploadFields([
        { name: "images", maxCount: 10 },
        { name: "variantImages", maxCount: 60 },
    ]),
    parseBody,
    validateRequest(ProductValidation.updateProductValidationSchema),
    ProductController.updateProduct,
);

router.delete(
    "/:productId",
    auth(UserRole.ADMIN),
    ProductController.deleteProduct,
);


export const ProductRoutes = router;
