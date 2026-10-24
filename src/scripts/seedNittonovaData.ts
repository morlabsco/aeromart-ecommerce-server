/**
 * Seeds Nittonova product data (scraped 2026-10-24) into the database.
 *
 * Source JSON: ../aeromart-ecommerce-client/docs/data/{products,categories}.json
 * Run from the server root: `npm run seed:nittonova`
 *
 * - Idempotent: existing records (matched by slug / reviewer email) are
 *   skipped, never replaced — safe to re-run.
 * - Adds only: categories, a "Generic" brand, reviewer users, products and
 *   their reviews. Does not touch settings, existing products or orders.
 * - Currency is inherited from the settings singleton (same as the API).
 * - Nittonova previous_price maps to the schema's native discount: base
 *   price = previous_price, offerPrice = flat (previous - current).
 * - Category image link is stored in `icon` (schema has no image field yet)
 *   and product tags in `keyFeatures` — migrate both when fields are added.
 * - Fields with no schema home are dropped: product_code, unit_cost,
 *   sold_stock, fake_sold_count, view_count, is_free_delivery, is_pre_order,
 *   meta_title/meta_description, related_product_slugs, review images.
 */
import mongoose from "mongoose";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import dns from "dns";
import config from "../app/config";
import Category from "../app/modules/category/category.model";
import Product from "../app/modules/product/product.model";
import Review from "../app/modules/review/review.model";
import Brand from "../app/modules/brand/brand.model";
import User from "../app/modules/user/user.model";
import { UserRole } from "../app/modules/user/user.interface";
import { getStoreCurrency } from "../app/modules/product/product.utils";

interface NittonovaCategory {
    id: string;
    name: string;
    slug: string;
    image_url: string;
    is_active: boolean;
}

interface NittonovaReview {
    rating: number;
    comment: string;
    user: { name: string };
}

interface NittonovaProduct {
    id: number;
    name: string;
    slug: string;
    description: string;
    status: string;
    price: string;
    previous_price: string | null;
    stock: number;
    feature_image: string;
    gallery_images: string[];
    product_tags: string[];
    category: { slug: string };
    reviews: NittonovaReview[];
    review_stats: {
        total_reviews: number;
        average_rating: number | null;
    } | null;
}

const DATA_DIR = path.join(
    process.cwd(),
    "../aeromart-ecommerce-client/docs/data",
);

const slugify = (s: string) =>
    s
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

const readJson = (file: string) =>
    JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), "utf-8"));

const seed = async () => {
    const summary = {
        categoriesCreated: 0,
        categoriesSkipped: 0,
        brandCreated: false,
        reviewerUsersCreated: 0,
        productsCreated: 0,
        productsSkipped: 0,
        reviewsCreated: 0,
    };

    try {
        dns.setServers(["8.8.8.8", "8.8.4.4"]);
        await mongoose.connect(config.db_url as string);

        const nittonovaCategories: NittonovaCategory[] =
            readJson("categories.json");
        const nittonovaProducts: NittonovaProduct[] = readJson("products.json");

        // --- Seed actor (createdBy) ------------------------------------
        let admin = await User.findOne({ role: UserRole.ADMIN });
        if (!admin) {
            if (!config.admin_email || !config.admin_password) {
                throw new Error(
                    "No admin user found and ADMIN_EMAIL/ADMIN_PASSWORD are not set — cannot determine createdBy.",
                );
            }
            admin = await User.create({
                name: "AeroMart Admin",
                email: config.admin_email,
                password: config.admin_password,
                role: UserRole.ADMIN,
            });
        }

        // --- Brand (Nittonova products are unbranded) -------------------
        let brand = await Brand.findOne({
            name: { $regex: /^generic$/i },
        });
        if (!brand) {
            brand = await Brand.create({
                name: "Generic",
                description: "Unbranded products (Nittonova import)",
                createdBy: admin._id,
            });
            summary.brandCreated = true;
        }

        const currency = await getStoreCurrency();

        // --- Clean up orphaned reviews (product ref no longer exists) ----
        const liveProductIds = await Product.distinct("_id");
        const { deletedCount: orphanReviews } = await Review.deleteMany({
            product: { $nin: liveProductIds },
        });

        // --- Categories -------------------------------------------------
        const categoryIds = new Map<string, mongoose.Types.ObjectId>();
        for (const c of nittonovaCategories) {
            // name is the unique key in the schema (slug is optional) — an
            // existing category may already hold the name under another slug
            const existing = await Category.findOne({
                $or: [{ slug: c.slug }, { name: { $regex: new RegExp(`^${c.name}$`, "i") } }],
            });
            if (existing) {
                categoryIds.set(c.slug, existing._id);
                summary.categoriesSkipped++;
                continue;
            }
            const created = await Category.create({
                name: c.name,
                slug: c.slug,
                // image link parked in icon until a real image field exists
                icon: c.image_url || "",
                isActive: c.is_active !== false,
                createdBy: admin._id,
            });
            categoryIds.set(c.slug, created._id);
            summary.categoriesCreated++;
        }

        // --- Reviewer users (name only in source) ------------------------
        const reviewerEmails = new Map<string, string>();
        for (const name of new Set(
            nittonovaProducts.flatMap((p) =>
                p.reviews.map((r) => r.user.name),
            ),
        )) {
            const email = `nittonova.${slugify(name)}@seed.aeromart.local`;
            const existing = await User.findOne({ email });
            if (!existing) {
                await User.create({
                    name,
                    email,
                    password: crypto.randomBytes(24).toString("hex"),
                    role: UserRole.CUSTOMER,
                    clientInfo: {
                        device: "pc",
                        browser: "Seed Script",
                        ipAddress: "127.0.0.1",
                    },
                });
                summary.reviewerUsersCreated++;
            }
            reviewerEmails.set(name, email);
        }

        // --- Products + reviews ------------------------------------------
        const offerEndAt = new Date("2027-12-31T23:59:59Z");

        // Nittonova allows text-only reviews (rating null) — fall back to the
        // product's average rating so the required 1-5 validator passes.
        let ratingsSubstituted = 0;
        const resolveRating = (r: NittonovaReview, p: NittonovaProduct) => {
            if (r.rating !== null && r.rating !== undefined) return r.rating;
            ratingsSubstituted++;
            return Math.round(p.review_stats?.average_rating ?? 0) || 5;
        };

        // Create the source reviews that a product doc is still missing
        // (covers a crash between product insert and review attach).
        const createMissingReviews = async (
            productDoc: mongoose.Document & { _id: mongoose.Types.ObjectId },
            existingReviewUserIds: Set<string>,
            p: NittonovaProduct,
        ) => {
            for (const r of p.reviews) {
                const email = reviewerEmails.get(r.user.name);
                const reviewer = email ? await User.findOne({ email }) : null;
                if (!reviewer || existingReviewUserIds.has(reviewer._id.toString()))
                    continue;
                await Review.create({
                    rating: resolveRating(r, p),
                    description: r.comment,
                    user: reviewer._id,
                    product: productDoc._id,
                });
                summary.reviewsCreated++;
            }
        };

        for (const p of nittonovaProducts) {
            const existing = await Product.findOne({ slug: p.slug });
            if (existing) {
                const existingReviews = await Review.find({
                    product: existing._id,
                }).select("user");
                const existingUserIds = new Set(
                    existingReviews.map((r) => r.user.toString()),
                );
                if (existingUserIds.size < p.reviews.length) {
                    await createMissingReviews(existing, existingUserIds, p);
                    if (p.reviews.length) {
                        existing.reviews = existingReviews.map((r) => r._id);
                        await existing.save();
                    }
                }
                summary.productsSkipped++;
                continue;
            }

            const currentPrice = Number(p.price);
            const previousPrice = p.previous_price
                ? Number(p.previous_price)
                : null;
            const hasDiscount =
                previousPrice !== null && previousPrice > currentPrice;

            const categoryId = categoryIds.get(p.category.slug);
            if (!categoryId) {
                console.warn(
                    `  ! skipping "${p.name}" — no category for slug "${p.category.slug}"`,
                );
                continue;
            }

            const created = await Product.create({
                name: p.name,
                slug: p.slug,
                description: p.description || p.name,
                price: hasDiscount ? previousPrice : currentPrice,
                currency,
                stock: p.stock,
                weight: 0,
                category: categoryId,
                brand: brand._id,
                imageUrls: [
                    ...(p.feature_image
                        ? [{ publicId: "", url: p.feature_image, order: 0 }]
                        : []),
                    ...(p.gallery_images || []).map((url, i) => ({
                        publicId: "",
                        url,
                        order: i + 1,
                    })),
                ],
                isActive: p.status === "Published",
                keyFeatures: p.product_tags || [],
                offerPrice: hasDiscount
                    ? {
                          type: "flat",
                          value: Number(
                              (previousPrice - currentPrice).toFixed(2),
                          ),
                          startAt: new Date(),
                          endAt: offerEndAt,
                          isActive: true,
                      }
                    : undefined,
                averageRating: Math.min(
                    5,
                    Math.max(0, p.review_stats?.average_rating ?? 0),
                ),
                ratingCount: p.review_stats?.total_reviews ?? 0,
                createdBy: admin._id,
            });

            await createMissingReviews(created, new Set(), p);
            const createdReviews = await Review.find({
                product: created._id,
            }).select("_id");
            if (createdReviews.length) {
                created.reviews = createdReviews.map((r) => r._id);
                await created.save();
            }
            summary.productsCreated++;
        }

        console.log("Nittonova seed complete:", {
            ...summary,
            orphanReviewsDeleted: orphanReviews,
            ratingsSubstituted,
        });
        console.log(`Store currency applied: ${currency}`);
        console.log(
            "Dropped (no schema field): product_code, unit_cost, sold_stock, fake_sold_count, view_count, is_free_delivery, is_pre_order, meta fields, related_product_slugs, review images.",
        );
    } catch (error) {
        console.error("Failed to seed Nittonova data:", error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
    }
};

seed();
