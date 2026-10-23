import { CloudinaryStorage } from "multer-storage-cloudinary";
import { cloudinaryUpload } from "./cloudinary.config";
import multer from "multer";
import { Request } from "express";

const removeExtension = (filename: string) => {
    return filename.split(".").slice(0, -1).join(".");
};

const storage = new CloudinaryStorage({
    cloudinary: cloudinaryUpload,
    params: {
        folder: "/aeromart-ecommerce",
        public_id: (_req: Request, file: Express.Multer.File) =>
            Math.random().toString(36).substring(2) +
            "-" +
            Date.now() +
            "-" +
            file.fieldname +
            "-" +
            removeExtension(file.originalname),
    } as any,
});

export const multerUpload = multer({ storage });

// Multi-field uploads (e.g. product main `images` + `variantImages`).
// Pass field configs: multerUploadFields([{ name: "images", maxCount: 10 }])
export const multerUploadFields = (
    fields: { name: string; maxCount: number }[],
) => multerUpload.fields(fields);
