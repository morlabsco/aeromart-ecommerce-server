import Product from "./product.model";
import Settings from "../settings/settings.model";
import { SETTINGS_ID } from "../settings/settings.constant";
import AppError from "../../errors/appError";
import { StatusCodes } from "http-status-codes";
import { generateSlug } from "../../utils/generateSlug";
import { IImageFile } from "../../interface/IImageFile";

// The store's active currency — brand.currency in the settings singleton.
// Products inherit this on create (no manual currency).
export const getStoreCurrency = async (): Promise<string> => {
    const settings = await Settings.findById(SETTINGS_ID).select("brand");
    return settings?.brand?.currency || "usd";
};

// Re-exported for convenience — the canonical global helper lives in
// src/app/config/cloudinary.config.ts so any module can destroy images.
export { destroyImagesFromCloudinary } from "../../config/cloudinary.config";

// Build a variant SKU: {PRODUCT_PREFIX}-{COLOR}-{SIZE}-{RANDOM}
// e.g. PRD-BLACK-M-7F3K9Q — attributes are uppercased/cleaned, random 6-char suffix.
export const buildVariantSku = (
    productPrefix: string,
    attributes: Record<string, string>,
): string => {
    const clean = (s: string) =>
        s.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6) || "NA";
    const parts = Object.values(attributes).map(clean);
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return [productPrefix, ...parts, random].join("-");
};

// Merge uploaded variant image files into each variant's imageUrls slots.
// The client sends `variantImages` files (flat, in variant order) plus, in
// `data`, each variant's `imageUrls` array declaring its image slots:
//   - existing images as { publicId, order } (url backfilled from existingImages)
//   - NEW slots as placeholders {} or { order } — filled from variantImages
//     in order of appearance.
// Plain URL strings are still normalized for backward compatibility.
// Orders are re-normalized sequentially (0, 1, 2, ...) after the merge so the
// final list is always a clean, non-duplicated sequence — the client's order
// hints are treated as slot positions, not literal final orders.
// Returns the merged images plus how many files were consumed, so callers can
// advance a shared file pool across multiple variants. NOTE: the total file
// count vs total placeholder count is validated by the caller (once, across
// ALL variants) — this function only fills slots and reports consumption.
export const mergeVariantImageFiles = (
    variantImageSlots: any[],
    files: IImageFile[],
    existingImages: any[] = [],
): { images: { publicId: string; url: string; order: number }[]; consumed: number } => {
    const existingByPublicId = new Map(
        existingImages.map((img: any) => [img.publicId, img]),
    );

    let fileIndex = 0;
    const merged = (variantImageSlots || []).map((slot, i) => {
        // Plain URL string → keep as-is (backward compat)
        if (typeof slot === "string") {
            return { publicId: "", url: slot, order: i };
        }

        const publicId = slot?.publicId || "";
        const url = slot?.url || existingByPublicId.get(publicId)?.url || "";

        // Existing image (has a url or a backfillable publicId) → preserve
        if (url || publicId) {
            return {
                publicId,
                url,
                order: typeof slot?.order === "number" ? slot.order : i,
            };
        }

        // Placeholder slot → fill from the next uploaded file
        const file = files[fileIndex];
        if (file) {
            fileIndex++;
            return {
                publicId: file.filename || "",
                url: file.path,
                order: typeof slot?.order === "number" ? slot.order : i,
            };
        }

        // Placeholder with no file left — leave as an empty placeholder
        return { publicId: "", url: "", order: i };
    });

    // Re-normalize to a clean sequential order (0, 1, 2, ...) — this is the
    // source of truth for cover/first and avoids duplicate/gapped orders when
    // the client's order hints collide (e.g. existing image order: 1 + a new {}).
    const images = merged.map((img, i) => ({ ...img, order: i }));

    return { images, consumed: fileIndex };
};

// Count how many image slots in a variant's imageUrls are NEW placeholders
// (no url and no backfillable publicId). Used to validate the total number of
// uploaded variant image files across all variants.
export const countVariantImagePlaceholders = (variantImageSlots: any[]): number =>
    (variantImageSlots || []).filter((slot) => {
        if (typeof slot === "string") return false;
        const publicId = slot?.publicId || "";
        const url = slot?.url || "";
        return !publicId && !url;
    }).length;

// Reconcile the color palette with the variants actually used.
// `colorOptions` is the single source of truth for color swatches (name + hex).
// When a variant's attributes contain a `Color` value that isn't in
// colorOptions yet, it is silently auto-added (hex left empty for the admin to
// fill) so the UI never has a swatch-less color and the admin doesn't have to
// keep the two lists in sync manually.
export const reconcileVariantColors = (
    variants: any[],
    colorOptions: { name: string; hex?: string }[],
): { name: string; hex?: string }[] => {
    const result = [...(colorOptions || [])];
    const existing = new Set(result.map((c) => c.name.toLowerCase()));

    for (const variant of variants || []) {
        const color = variant?.attributes?.Color;
        if (
            typeof color === "string" &&
            color.trim() &&
            !existing.has(color.trim().toLowerCase())
        ) {
            result.push({ name: color.trim() });
            existing.add(color.trim().toLowerCase());
        }
    }

    return result;
};

// Verify every variant's attributes draw their keys and values from the
// declared attribute axes. This keeps the variant system manageable for any
// axis type — size, material, or custom names.
//
// `Color` is special-cased: it is NOT required to exist in the `attributes`
// axes (the admin expresses colors through `colorOptions` swatches). A variant's
// `Color` value is validated against `colorOptions` names instead. Only when no
// `colorOptions` are provided does it fall back to the axes check (legacy).
export const validateVariantAttributes = (
    variants: any[],
    attributes: { key: string; values: string[] }[],
    colorOptions?: { name: string; hex?: string }[],
): void => {
    const axes = new Map(
        (attributes || []).map((attr) => [attr.key, attr.values || []]),
    );
    const colorNames = new Set(
        (colorOptions || []).map((c) => c.name.toLowerCase()),
    );

    for (const variant of variants || []) {
        for (const [key, value] of Object.entries(
            variant.attributes || {},
        ) as [string, string][]) {
            if (key === "Color") {
                // Color is a display-palette concept — validate against
                // colorOptions when available, otherwise fall through to the
                // axes check for legacy products that declared a Color axis.
                if (colorOptions?.length) {
                    if (!colorNames.has(value.toLowerCase())) {
                        throw new AppError(
                            StatusCodes.BAD_REQUEST,
                            `Variant color "${value}" is not in the product's colorOptions. Add it to colorOptions first (or it is auto-added on create/update).`,
                        );
                    }
                    continue;
                }
            }

            const allowedValues = axes.get(key);
            if (!allowedValues) {
                throw new AppError(
                    StatusCodes.BAD_REQUEST,
                    `Variant attribute key "${key}" is not defined in the product attributes. Add it to the attributes array first.`,
                );
            }
            if (!allowedValues.includes(value)) {
                throw new AppError(
                    StatusCodes.BAD_REQUEST,
                    `Variant attribute value "${value}" is not valid for attribute "${key}". Allowed values: ${allowedValues.join(", ")}.`,
                );
            }
        }
    }
};

// Populate reviews (optionally only non-flagged ones) + base refs
export const populateProductRefs = (query: any, nonFlaggedOnly = false) => {
    query
        .populate("category", "name slug")
        .populate("brand", "name logo")
        .populate({
            path: "reviews",
            match: nonFlaggedOnly ? { isFlagged: false } : {},
            select: "rating description isFlagged createdAt",
        });

    return query;
};

// Build the base slug for a product name (used when no slug is provided)
const buildBaseSlug = (name: string): string =>
    name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

// Resolve the final slug for create/update:
// - If a slug is provided, it must not belong to a DIFFERENT product name.
//   A slug matching a product with the SAME name is allowed (same product, different variant/price).
// - If no slug is provided, generate a base slug (or random-suffixed one) that is unique.
export const resolveProductSlug = async (
    name: string,
    slug?: string,
    excludeId?: string,
): Promise<string> => {
    if (slug) {
        const existing = await Product.findOne({ slug }).select("name _id");
        if (existing && String(existing._id) !== excludeId) {
            if (existing.name.toLowerCase() !== name.toLowerCase()) {
                throw new AppError(
                    StatusCodes.CONFLICT,
                    "A product with this slug already exists!",
                );
            }
        }
        return slug;
    }

    const baseSlug = buildBaseSlug(name);
    if (!baseSlug) {
        throw new AppError(
            StatusCodes.BAD_REQUEST,
            "Product name must contain at least one letter or number to generate a slug",
        );
    }

    const isBaseSlugUnique = await Product.isSlugUnique(baseSlug, excludeId);
    if (isBaseSlugUnique) {
        return baseSlug;
    }

    // Base slug is taken by a DIFFERENT product name — append a random suffix
    return generateSlug(name);
};
