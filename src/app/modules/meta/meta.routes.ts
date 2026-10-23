import { Router } from "express";
import { MetaController } from "./meta.controller";
import { UserRole } from "../user/user.interface";
import auth from "../../middleware/auth";

const router = Router();

router.get("/", auth(UserRole.ADMIN), MetaController.getMetaData);

export const MetaRoutes = router;
