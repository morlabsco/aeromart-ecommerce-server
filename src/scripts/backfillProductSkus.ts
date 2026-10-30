// One-off maintenance script (29/10/2026): products never carried a
// main-level SKU — only variants did. Every product missing one gets a
// generated unique {NAME_PREFIX}-{RANDOM} SKU (e.g. SMAR-7F3K9Q) through the
// same resolver the API uses. Safe to re-run — only touches products whose
// sku is missing or empty.
import mongoose from "mongoose";
import Product from "../app/modules/product/product.model";
import { resolveProductSku } from "../app/modules/product/product.utils";
import config from "../app/config";
import dns from "dns";

const run = async () => {
    try {
        dns.setServers(["8.8.8.8", "8.8.4.4"]);
        await mongoose.connect(config.db_url as string);

        const products = await Product.find({
            $or: [{ sku: { $exists: false } }, { sku: null }, { sku: "" }],
        }).select("name sku");

        if (products.length === 0) {
            console.log("backfillProductSkus — nothing to do, all products already have a SKU");
            await mongoose.disconnect();
            return;
        }

        let updated = 0;
        for (const product of products) {
            const sku = await resolveProductSku(
                undefined,
                product.name,
                String(product._id),
            );
            product.sku = sku;
            await product.save({ validateBeforeSave: false });
            updated++;
            console.log(`${product.name} → ${sku}`);
        }

        console.log(`backfillProductSkus complete — ${updated}/${products.length} products updated`);
        await mongoose.disconnect();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

void run();
