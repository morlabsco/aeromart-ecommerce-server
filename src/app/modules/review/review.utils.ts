import Review from "./review.model";
import Product from "../product/product.model";
import Order from "../order/order.model";
import { Types } from "mongoose";

// Recalculate a product's averageRating/ratingCount from its non-flagged reviews
export const recalcProductRating = async (
    productId: Types.ObjectId | string,
) => {
    const ratingStats = await Review.aggregate([
        { $match: { product: productId, isFlagged: false } },
        {
            $group: {
                _id: "$product",
                averageRating: { $avg: "$rating" },
                ratingCount: { $sum: 1 },
            },
        },
    ]);

    if (ratingStats.length > 0) {
        await Product.findByIdAndUpdate(productId, {
            averageRating: Math.round(ratingStats[0].averageRating * 10) / 10,
            ratingCount: ratingStats[0].ratingCount,
        });
    } else {
        await Product.findByIdAndUpdate(productId, {
            averageRating: 0,
            ratingCount: 0,
        });
    }
};

// Checks whether a user actually purchased a product (i.e. has a non-cancelled
// order that includes it). A "Pending" order is not a completed purchase, so
// only Processing/Shipped/Completed orders count as a verified purchase.
export const hasVerifiedPurchase = async (
    userId: string,
    productId: string,
): Promise<boolean> => {
    const order = await Order.findOne({
        user: userId,
        "products.product": productId,
        status: { $in: ["Processing", "Shipped", "Completed"] },
    }).select("_id");

    return Boolean(order);
};
