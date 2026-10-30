/**
 * One-off QA data seeder (30/10/2026 task batch 9, item 12):
 *   1. Bump most products' stock to 20+ so test orders can be placed, while
 *      keeping a handful deliberately OUT OF STOCK (stock 0) to test that
 *      state. Variant products get healthy per-SKU stock instead.
 *   2. Add Size variants (S/M/L) to three plain products so the variant
 *      flows (checkout, order lines, admin) can be exercised.
 *
 * Idempotent-ish: running it again re-randomizes stock but never removes
 * existing variants — variant seeding only touches plain products.
 */
import mongoose from "mongoose";
import crypto from "crypto";
import * as dotenv from "dotenv";
dotenv.config();

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomCode(len: number): string {
    const bytes = crypto.randomBytes(len);
    let out = "";
    for (let i = 0; i < len; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
    return out;
}

async function main() {
    await mongoose.connect(process.env.DB_URL as string);
    const db = mongoose.connection;
    const products = db.collection("products");

    const docs = await products
        .find({ isDeleted: { $ne: true } })
        .project({ name: 1, stock: 1, hasVariants: 1, variants: 1, attributes: 1, price: 1, sku: 1 })
        .toArray();
    console.log(`Found ${docs.length} live products`);

    let bumped = 0;
    let zeroed: string[] = [];
    let variantStockFixed = 0;

    for (let i = 0; i < docs.length; i++) {
        const p = docs[i];

        // Variant products: give every SKU healthy stock.
        if (p.hasVariants && Array.isArray(p.variants) && p.variants.length) {
            let touched = false;
            const variants = p.variants.map((v: any) => {
                if ((v.stock ?? 0) < 20) {
                    touched = true;
                    return { ...v, stock: 20 + Math.floor(Math.random() * 25) };
                }
                return v;
            });
            if (touched) {
                await products.updateOne({ _id: p._id }, { $set: { variants } });
                variantStockFixed++;
            }
            continue;
        }

        // Every 7th plain product stays OUT OF STOCK for testing; the rest
        // get a healthy 20-50 units.
        if (i % 7 === 3) {
            await products.updateOne({ _id: p._id }, { $set: { stock: 0 } });
            zeroed.push(p.name);
        } else if ((p.stock ?? 0) < 20) {
            await products.updateOne(
                { _id: p._id },
                { $set: { stock: 20 + Math.floor(Math.random() * 31) } },
            );
            bumped++;
        }
    }

    console.log(`Stock bumped: ${bumped} products`);
    console.log(`Kept out of stock (${zeroed.length}): ${zeroed.join(", ")}`);
    console.log(`Variant stock refreshed: ${variantStockFixed} products`);

    // ── Add Size variants to three plain products ──
    const plain = await products
        .find({
            isDeleted: { $ne: true },
            $or: [{ hasVariants: false }, { hasVariants: { $exists: false } }],
            // Plain products: no variant axes and no SKUs yet (missing OR empty).
            $and: [
                {
                    $or: [
                        { attributes: { $exists: false } },
                        { attributes: { $size: 0 } },
                        { attributes: null },
                    ],
                },
                {
                    $or: [
                        { variants: { $exists: false } },
                        { variants: { $size: 0 } },
                        { variants: null },
                    ],
                },
            ],
        })
        .project({ name: 1, price: 1, stock: 1, sku: 1 })
        .limit(3)
        .toArray();

    for (const p of plain) {
        const prefix = (p.name || "PROD").replace(/[^A-Za-z]/g, "").slice(0, 4).toUpperCase();
        const sizes = ["S", "M", "L"];
        const variants = sizes.map((size) => ({
            sku: `${prefix}-${size}-${randomCode(6)}`,
            attributes: { Size: size },
            stock: 8 + Math.floor(Math.random() * 8),
            imageUrls: [],
            isActive: true,
        }));
        await products.updateOne(
            { _id: p._id },
            {
                $set: {
                    hasVariants: true,
                    attributes: [{ key: "Size", values: sizes }],
                    variants,
                },
            },
        );
        console.log(
            `Variants added to "${p.name}": ${variants.map((v) => v.sku).join(", ")}`,
        );
    }

    await mongoose.disconnect();
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
