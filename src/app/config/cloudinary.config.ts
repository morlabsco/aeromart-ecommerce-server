import { v2 as cloudinary } from "cloudinary";
import config from "../config";

cloudinary.config({
    cloud_name: config.cloudinary_cloud_name,
    api_key: config.cloudinary_api_key,
    api_secret: config.cloudinary_api_secret,
});

export const cloudinaryUpload = cloudinary;

// Extract the publicId from a Cloudinary URL so it can be destroyed later.
// Handles both secure URLs (https://res.cloudinary.com/<cloud>/<type>/<version>/<path>)
// and bare paths. Returns null when the URL isn't a Cloudinary asset.
export const getPublicIdFromCloudinaryUrl = (url: string): string | null => {
    if (!url) return null;
    // Strip the transformation/version segments: .../image/upload/v123456/path.ext
    const match = url.match(
        /\/image\/upload\/(?:v\d+\/)?(.+?)(?:\.[a-zA-Z0-9]+)?$/,
    );
    if (!match) return null;
    // Decode URL-encoded publicId segments (%2F → /)
    return decodeURIComponent(match[1]);
};

// Best-effort destroy of a set of Cloudinary publicIds. A missing/invalid id
// is ignored — a stale image should never fail the caller's operation. Returns
// the count actually deleted.
export const destroyImagesFromCloudinary = async (
    publicIds: string[],
): Promise<number> => {
    const uniqueIds = [...new Set(publicIds.filter(Boolean))];
    if (!uniqueIds.length) return 0;

    const results = await Promise.all(
        uniqueIds.map((id) =>
            cloudinary.uploader.destroy(id).catch(() => undefined),
        ),
    );
    return results.filter((r) => r && r.result === "ok").length;
};

// Convenience: extract publicIds from a set of Cloudinary URLs and destroy them.
export const destroyCloudinaryUrls = async (
    urls: string[],
): Promise<number> => {
    const ids = urls
        .map(getPublicIdFromCloudinaryUrl)
        .filter((id): id is string => Boolean(id));
    return destroyImagesFromCloudinary(ids);
};
