import { IProduct } from "./product.interface";
import Product from "./product.model";
import Category from "../category/category.model";
import Brand from "../brand/brand.model";
import AppError from "../../errors/appError";
import { StatusCodes } from "http-status-codes";
import { ProductSearchableFields } from "./product.constant";
import QueryBuilder from "../../builder/QueryBuilder";
import { IImageFile } from "../../interface/IImageFile";
import { IJwtPayload } from "../auth/auth.interface";
import { ActivityServices } from "../activity/activity.service";
import { ActivityModule, ActivityType } from "../activity/activity.interface";
import {
    getStoreCurrency,
    buildVariantSku,
    populateProductRefs,
    resolveProductSlug,
    mergeVariantImageFiles,
    validateVariantAttributes,
    reconcileVariantColors,
    countVariantImagePlaceholders,
    destroyImagesFromCloudinary,
} from "./product.utils";

const getAllProducts = async (query: Record<string, unknown>) => {
    const productQuery = new QueryBuilder(
        Product.find({ isDeleted: false }),
        query,
    )
        .search(ProductSearchableFields)
        .filter()
        .sort()
        .paginate()
        .fields();

    // Apply price range filter if provided
    if (query.minPrice || query.maxPrice) {
        const minPrice = Number(query.minPrice) || 0;
        const maxPrice = Number(query.maxPrice) || Number.MAX_SAFE_INTEGER;
        productQuery.priceRange(minPrice, maxPrice);
    }

    const result = await populateProductRefs(
        productQuery.modelQuery,
        true,
    ).exec();
    const meta = await productQuery.countTotal();
    return {
        result,
        meta,
    };
};

const getSingleProduct = async (productId: string) => {
    const product = await populateProductRefs(
        Product.findOne({
            _id: productId,
            isDeleted: false,
        }),
        true,
    );

    if (!product) {
        throw new AppError(StatusCodes.NOT_FOUND, "Product not found!");
    }

    return product;
};

const createProduct = async (
    payload: IProduct,
    authUser: IJwtPayload,
    files?: IImageFile[],
    variantFiles?: IImageFile[],
) => {
    // Validate category exists
    await Category.checkCategoryExist(payload.category.toString());

    // Validate brand exists
    await Brand.checkBrandExist(payload.brand.toString());

    // Attach the creator (admin) to the product
    payload.createdBy = authUser.userId as any;

    // Resolve slug (provided or auto-generated unique)
    payload.slug = await resolveProductSlug(payload.name, payload.slug);

    // Currency is inherited from the store's brand settings — no manual currency.
    payload.currency = (await getStoreCurrency()) as IProduct["currency"];

    // Normalize offer price dates to Date objects
    if (payload.offerPrice) {
        payload.offerPrice.startAt = new Date(payload.offerPrice.startAt);
        payload.offerPrice.endAt = new Date(payload.offerPrice.endAt);
        if (payload.offerPrice.endAt <= payload.offerPrice.startAt) {
            throw new AppError(
                StatusCodes.BAD_REQUEST,
                "Offer end date must be after start date!",
            );
        }
    }

    // Auto-flag as a variant product and harden the variant system:
    // every variant's attributes must draw keys/values from the declared axes,
    // except `Color` which is sourced from colorOptions (auto-reconciled).
    if (payload.variants?.length) {
        payload.hasVariants = true;
        // Silently auto-add any variant Color value that's missing from the
        // palette so the UI never has a swatch-less color.
        payload.colorOptions = reconcileVariantColors(
            payload.variants,
            payload.colorOptions as { name: string; hex?: string }[],
        ) as any;
        validateVariantAttributes(
            payload.variants,
            payload.attributes as { key: string; values: string[] }[],
            payload.colorOptions as { name: string; hex?: string }[],
        );
    }

    // Generate SKUs for variants without one and merge uploaded variant image
    // files into each variant's declared image slots. variantFiles is a single
    // flat pool consumed across all variants in order. Validate the total count
    // ONCE (across all variants) so each variant's share can exceed its own
    // placeholders without tripping a false per-variant mismatch.
    const productPrefix = payload.name
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .slice(0, 4) || "PRD";
    if (payload.variants?.length) {
        const totalPlaceholders = (payload.variants as any[]).reduce(
            (sum, variant) =>
                sum + countVariantImagePlaceholders(variant.imageUrls as any[]),
            0,
        );
        const totalFiles = variantFiles?.length || 0;
        if (totalFiles > totalPlaceholders) {
            throw new AppError(
                StatusCodes.BAD_REQUEST,
                `Received ${totalFiles} variant image file(s) but only ${totalPlaceholders} placeholder slot(s) were declared across all variants. Add one placeholder ({}) per new variant image in each variant's imageUrls.`,
            );
        }

        const variantImagePool = [...(variantFiles || [])];
        payload.variants = payload.variants.map((variant) => {
            const merged = mergeVariantImageFiles(
                variant.imageUrls as any[],
                variantImagePool,
            );
            variantImagePool.splice(0, merged.consumed);
            return {
                ...variant,
                imageUrls: merged.images,
                sku:
                    variant.sku ||
                    buildVariantSku(productPrefix, variant.attributes || {}),
            };
        });
    }

    // Handle uploaded images → { publicId, url, order } objects
    if (files && files.length > 0) {
        payload.imageUrls = files.map((file, i) => ({
            publicId: file.filename || "",
            url: file.path,
            order: i,
        }));
    }

    const product = new Product(payload);
    const createdProduct = await product.save();

    await ActivityServices.logActivity({
        module: ActivityModule.PRODUCT,
        type: ActivityType.CREATE,
        message: `Product "${createdProduct.name}" was created`,
        referenceId: createdProduct._id.toString(),
        performedBy: authUser.userId,
        metadata: { price: createdProduct.price, currency: createdProduct.currency },
    });

    // Populate references before returning
    const populatedProduct = await populateProductRefs(
        Product.findById(createdProduct._id),
    );

    return populatedProduct;
};

const updateProduct = async (
    productId: string,
    payload: Partial<IProduct> & {
        keepImages?: { publicId: string; url?: string; order: number }[];
        removedImageIds?: string[];
    },
    files?: IImageFile[],
    variantFiles?: IImageFile[],
) => {
    const existingProduct = await Product.checkProductExist(productId);

    // Validate category if being updated
    if (payload.category) {
        await Category.checkCategoryExist(payload.category.toString());
    }

    // Validate brand if being updated
    if (payload.brand) {
        await Brand.checkBrandExist(payload.brand.toString());
    }

    // Resolve slug when name or slug is being updated
    if (payload.name || payload.slug) {
        payload.slug = await resolveProductSlug(
            (payload.name || existingProduct.name) as string,
            payload.slug,
            productId,
        );
    }

    // Normalize offer price dates
    if (payload.offerPrice) {
        payload.offerPrice.startAt = new Date(payload.offerPrice.startAt);
        payload.offerPrice.endAt = new Date(payload.offerPrice.endAt);
        if (payload.offerPrice.endAt <= payload.offerPrice.startAt) {
            throw new AppError(
                StatusCodes.BAD_REQUEST,
                "Offer end date must be after start date!",
            );
        }
    }

    // Harden the variant system on update too: attribute keys/values must come
    // from the declared axes (merged with the existing ones when not resending),
    // except `Color` which is sourced from colorOptions (auto-reconciled).
    if (payload.variants?.length) {
        const effectiveAttributes = payload.attributes?.length
            ? payload.attributes
            : (existingProduct.attributes as any) || [];

        // Effective palette = sent colorOptions merged with the stored ones
        // (when the client doesn't resend the palette, keep the existing).
        const effectiveColorOptions = (
            payload.colorOptions?.length
                ? payload.colorOptions
                : (existingProduct.colorOptions as any) || []
        ) as { name: string; hex?: string }[];

        // Silently auto-add any variant Color value missing from the palette.
        payload.colorOptions = reconcileVariantColors(
            payload.variants,
            effectiveColorOptions,
        ) as any;

        validateVariantAttributes(
            payload.variants,
            effectiveAttributes as { key: string; values: string[] }[],
            payload.colorOptions as { name: string; hex?: string }[],
        );
    }

    // Auto-set hasVariants from the variants array (create AND update).
    if (payload.variants !== undefined) {
        payload.hasVariants = (payload.variants?.length || 0) > 0;
    }

    // Generate SKUs for variants without one (keeps existing skus untouched),
    // merge uploaded variant image files into each variant's placeholder slots,
    // and backfill existing urls by publicId. variantFiles is a single flat pool
    // consumed across all variants in order; the total count is validated once
    // across all variants.
    if (payload.variants?.length) {
        const productPrefix = (existingProduct.name || "PRD")
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, "")
            .slice(0, 4) || "PRD";
        const existingVariants = (existingProduct.variants as any[]) || [];

        const totalPlaceholders = (payload.variants as any[]).reduce(
            (sum, variant) =>
                sum + countVariantImagePlaceholders(variant.imageUrls as any[]),
            0,
        );
        const totalFiles = variantFiles?.length || 0;
        if (totalFiles > totalPlaceholders) {
            throw new AppError(
                StatusCodes.BAD_REQUEST,
                `Received ${totalFiles} variant image file(s) but only ${totalPlaceholders} placeholder slot(s) were declared across all variants. Add one placeholder ({}) per new variant image in each variant's imageUrls.`,
            );
        }

        const variantImagePool = [...(variantFiles || [])];
        payload.variants = payload.variants.map((variant) => {
            const existingVariant = existingVariants.find(
                (v: any) => v.sku === variant.sku,
            );
            const merged = mergeVariantImageFiles(
                variant.imageUrls as any[],
                variantImagePool,
                existingVariant?.imageUrls || [],
            );
            variantImagePool.splice(0, merged.consumed);
            return {
                ...variant,
                imageUrls: merged.images,
                sku:
                    variant.sku ||
                    buildVariantSku(productPrefix, variant.attributes || {}),
            };
        });
    }

    // -----------------------------------------------------------------
    // Image management — combine keepImages + newly uploaded files, delete
    // removed ones (explicit AND implicit) from Cloudinary, and re-order.
    // -----------------------------------------------------------------
    const removedIds = payload.removedImageIds || [];

    // Preserve existing URLs when keepImages only provide publicId+order.
    const existingImages = (existingProduct.imageUrls as any[]) || [];
    const imageByPublicId = new Map(
        existingImages.map((img) => [img.publicId, img]),
    );

    const keepImages = (payload.keepImages || []).map((img) => ({
        publicId: img.publicId,
        url: img.url || imageByPublicId.get(img.publicId)?.url || "",
        order: img.order,
    }));

    // New uploads continue after the kept images' max order.
    let nextOrder = keepImages.length
        ? Math.max(...keepImages.map((img) => img.order)) + 1
        : 0;
    const newImages = (files || []).map((file) => ({
        publicId: file.filename || "",
        url: file.path,
        order: nextOrder++,
    }));

    const mergedImages = [...keepImages, ...newImages];

    // Does the caller actually manage MAIN images this update? If none of the
    // three signals are present, imageUrls stays untouched — and no existing
    // main image is considered implicitly removed/destroyed.
    const managesMainImages = Boolean(
        payload.keepImages?.length || files?.length || removedIds.length,
    );

    // Only touch imageUrls when the caller actually manages images; a plain
    // imageUrls field in data is ignored so it can't silently wipe the set.
    if (managesMainImages) {
        payload.imageUrls = mergedImages as any;
    } else {
        delete (payload as any).imageUrls;
        delete (payload as any).keepImages;
        delete (payload as any).removedImageIds;
    }

    // MAIN images removed implicitly — an existing publicId that is not in
    // keepImages and not re-uploaded. Only relevant when the caller manages
    // main images; otherwise nothing is implicitly removed.
    const implicitRemovedMainIds: string[] = [];
    if (managesMainImages) {
        const keptMainIds = new Set(
            keepImages.map((img) => img.publicId).filter(Boolean),
        );
        const newlyUploadedMainIds = new Set(
            newImages.map((img) => img.publicId).filter(Boolean),
        );
        implicitRemovedMainIds.push(
            ...existingImages
                .map((img: any) => img.publicId)
                .filter(
                    (id: string) =>
                        id && !keptMainIds.has(id) && !newlyUploadedMainIds.has(id),
                ),
        );
    }

    // VARIANT images removed implicitly — a publicId that existed in a stored
    // variant but is absent from the new variants' imageUrls lists. Only when
    // the caller is actually resending variants (payload.variants !== undefined);
    // otherwise variants are untouched and nothing is considered removed.
    const storedVariantIds = ((existingProduct.variants as any[]) || []).flatMap(
        (variant: any) =>
            (variant.imageUrls || [])
                .map((img: any) => img.publicId)
                .filter(Boolean),
    );
    const newVariantIds = new Set(
        (payload.variants !== undefined
            ? (payload.variants as any[])
            : (existingProduct.variants as any[])
        )?.flatMap(
            (variant: any) =>
                (variant.imageUrls || [])
                    .map((img: any) => img.publicId)
                    .filter(Boolean),
        ) || [],
    );
    const implicitRemovedVariantIds =
        payload.variants !== undefined
            ? storedVariantIds.filter((id: string) => !newVariantIds.has(id))
            : [];

    const allRemovedIds = [
        ...removedIds,
        ...implicitRemovedMainIds,
        ...implicitRemovedVariantIds,
    ];

    // Persist the DB change FIRST, then destroy the removed images from
    // Cloudinary. A Cloudinary API call can't participate in a Mongo
    // transaction, so ordering save→destroy guarantees we never end up with a
    // DB row referencing an already-destroyed image. Worst case on a destroy
    // failure is an orphaned Cloudinary file (invisible to users, recoverable),
    // not a broken image reference.
    const result = await populateProductRefs(
        Product.findByIdAndUpdate(productId, payload, {
            new: true,
        }),
    );

    // Delete removed images from Cloudinary (best-effort — a missing image
    // shouldn't fail the whole update).
    const destroyedCount = allRemovedIds.length
        ? await destroyImagesFromCloudinary(allRemovedIds)
        : 0;

    await ActivityServices.logActivity({
        module: ActivityModule.PRODUCT,
        type: ActivityType.UPDATE,
        message: `Product "${result?.name}" was updated`,
        referenceId: productId,
        metadata: {
            imagesKept: keepImages.length,
            imagesAdded: newImages.length,
            imagesRemoved: allRemovedIds.length,
            imagesDestroyed: destroyedCount,
        },
    });

    return result;
};

const deleteProduct = async (productId: string) => {
    const product = await Product.checkProductExist(productId);

    product.isDeleted = true;
    product.isActive = false;
    await product.save();

    await ActivityServices.logActivity({
        module: ActivityModule.PRODUCT,
        type: ActivityType.DELETE,
        message: `Product "${product.name}" was deleted`,
        referenceId: product._id.toString(),
    });

    return product;
};

export const ProductServices = {
    getAllProducts,
    getSingleProduct,
    createProduct,
    updateProduct,
    deleteProduct,
};
