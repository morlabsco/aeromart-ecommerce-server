import { Router } from "express";
import { SettingsController } from "./settings.controller";
import validateRequest from "../../middleware/validateRequest";
import { SettingsValidation } from "./settings.validation";
import { UserRole } from "../user/user.interface";
import auth from "../../middleware/auth";
import { multerUpload } from "../../config/multer.config";
import { parseBody } from "../../middleware/bodyParser";
import { NextFunction, Request, Response } from "express";
import {
    SETTINGS_SECTIONS,
    SettingsSection,
} from "./settings.constant";

const router = Router();

// Validate the :section body against the matching per-section schema.
// Unknown sections are left to the controller to reject with a clear 400.
const validateSectionRequest = (
    req: Request,
    _res: Response,
    next: NextFunction,
) => {
    const { section } = req.params;

    if (SETTINGS_SECTIONS.includes(section as SettingsSection)) {
        const schema =
            SettingsValidation.sectionBodySchemas[
                section as SettingsSection
            ];

        schema.parse(req.body);
    }

    next();
};

router.get("/", SettingsController.getSettings);

router.patch(
    "/",
    auth(UserRole.ADMIN),
    multerUpload.fields([
        { name: "logo", maxCount: 1 },
        { name: "favicon", maxCount: 1 },
    ]),
    parseBody,
    validateRequest(SettingsValidation.updateBrandFieldsValidationSchema),
    SettingsController.updateBrandFields,
);

router.patch(
    "/preset/:niche",
    auth(UserRole.ADMIN),
    SettingsController.applyNichePreset,
);

router.patch(
    "/reset/:niche",
    auth(UserRole.ADMIN),
    SettingsController.applyFullReset,
);

router.patch(
    "/:section",
    auth(UserRole.ADMIN),
    multerUpload.array("images", 20),
    parseBody,
    validateSectionRequest,
    SettingsController.updateSection,
);

export const SettingsRoutes = router;
