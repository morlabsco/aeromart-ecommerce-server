# Cloudinary Setup Guide

## 1. Install Dependencies

```bash
npm uninstall cloudinary multer-storage-cloudinary
npm install cloudinary@^2.6.0 multer-storage-cloudinary@^4.0.0
```

> `cloudinary@^2.6.0` patches a high-severity SSRF vulnerability present in older versions.

## 2. Environment Variables (`.env`)

Already configured:

```
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

## 3. Cloudinary Config (`src/app/config/cloudinary.config.ts`)

```typescript
import { v2 as cloudinary } from "cloudinary";
import config from "../config";

cloudinary.config({
  cloud_name: config.cloudinary_cloud_name,
  api_key: config.cloudinary_api_key,
  api_secret: config.cloudinary_api_secret,
});

export default cloudinary;
```

## 4. Multer Upload Middleware (`src/app/utils/multerUpload.ts`)

```typescript
import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.config";

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (_req, file) => ({
    folder: "aeromart-ecommerce",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    public_id: `${Date.now()}-${file.originalname.split(".")[0]}`,
  }),
});

export const multerUpload = multer({ storage });
```

## 5. Usage in Routes

```typescript
import { multerUpload } from "../../utils/multerUpload";
import { parseBody } from "../../middleware/bodyParser";

router.patch(
  "/update-profile",
  auth(UserRole.ADMIN, UserRole.MANAGER, UserRole.CUSTOMER),
  multerUpload.single("profilePhoto"),
  parseBody,
  validateRequest(UserValidation.customerInfoValidationSchema),
  UserController.updateProfile,
);
```

## 6. Accessing Uploaded File in Controller

```typescript
const updateProfile = catchAsync(async (req: Request, res: Response) => {
  const photoUrl = req.file?.path; // Cloudinary URL

  // rest of controller logic
});
```

## 7. Folder Structure on Cloudinary

All uploads go to the `aeromart-ecommerce` folder. You can change this in the `params.folder` option in `multerUpload.ts`.

## Troubleshooting

- **"Response code 401"** → Check credentials in `.env`.
- **"File type not allowed"** → Add the format to `allowed_formats`.
- **"MulterError: Unexpected field"** → Ensure the field name in `single("fieldName")` matches the form-data key.
