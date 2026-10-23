import { StatusCodes } from "http-status-codes";
import AppError from "../../errors/appError";
import QueryBuilder from "../../builder/QueryBuilder";
import { IReview } from "./review.interface";
import Review from "./review.model";
import Product from "../product/product.model";
import { ReviewSearchableFields } from "./review.constant";
import { IJwtPayload } from "../auth/auth.interface";
import { ActivityServices } from "../activity/activity.service";
import { ActivityModule, ActivityType } from "../activity/activity.interface";
import { recalcProductRating, hasVerifiedPurchase } from "./review.utils";

const getAllReviews = async (query: Record<string, unknown>) => {
    const reviewQuery = new QueryBuilder(
        Review.find()
            .populate("user", "name email photoUrl")
            .populate("product", "name slug"),
        query,
    )
        .search(ReviewSearchableFields)
        .filter()
        .sort()
        .paginate()
        .fields();

    const result = await reviewQuery.modelQuery;
    const meta = await reviewQuery.countTotal();

    return { result, meta };
};

const getSingleReview = async (reviewId: string) => {
    const review = await Review.findOne({
        _id: reviewId,
    })
        .populate("user", "name email photoUrl")
        .populate("product", "name slug");

    if (!review) {
        throw new AppError(StatusCodes.NOT_FOUND, "Review not found!");
    }

    return review;
};

// The authenticated customer's own reviews (including flagged ones — they
// belong to them and may want to see/revise them).
const getMyReviews = async (
    authUser: IJwtPayload,
    query: Record<string, unknown>,
) => {
    const reviewQuery = new QueryBuilder(
        Review.find({ user: authUser.userId })
            .populate("user", "name email photoUrl")
            .populate("product", "name slug"),
        query,
    )
        .search(ReviewSearchableFields)
        .filter()
        .sort()
        .paginate()
        .fields();

    const result = await reviewQuery.modelQuery;
    const meta = await reviewQuery.countTotal();

    return { result, meta };
};

const createReview = async (
    payload: IReview,
    authUser: IJwtPayload,
) => {
    // Check if product exists and is not deleted
    const product = await Product.findOne({
        _id: payload.product,
        isDeleted: false,
    });
    if (!product) {
        throw new AppError(StatusCodes.NOT_FOUND, "Product not found!");
    }
    if (!product.isActive) {
        throw new AppError(
            StatusCodes.BAD_REQUEST,
            "Product is not available!",
        );
    }

    // Check if user already reviewed this product
    const existingReview = await Review.findOne({
        user: authUser.userId,
        product: payload.product,
    });

    if (existingReview) {
        throw new AppError(
            StatusCodes.CONFLICT,
            "You have already reviewed this product!",
        );
    }

    // Attach user to review
    payload.user = authUser.userId as any;

    // Verified purchase: only a Processing/Shipped/Completed order for this
    // product counts — a Pending or Cancelled order does not. Only customers
    // who actually purchased the product are allowed to review it.
    const verifiedPurchase = await hasVerifiedPurchase(
        authUser.userId,
        payload.product.toString(),
    );

    if (!verifiedPurchase) {
        throw new AppError(
            StatusCodes.FORBIDDEN,
            "Only customers who purchased this product can review it!",
        );
    }

    payload.isVerifiedPurchase = true;

    const review = await Review.create(payload);

    // Add the review id to the product's reviews array
    await Product.findByIdAndUpdate(
        review.product,
        { $addToSet: { reviews: review._id } },
        { new: true },
    );

    // Update product average rating
    await recalcProductRating(review.product);

    await ActivityServices.logActivity({
        module: ActivityModule.REVIEW,
        type: ActivityType.CREATE,
        message: `Review by ${authUser.name} on "${product.name}" was created`,
        referenceId: review._id.toString(),
        performedBy: authUser.userId,
        metadata: { productId: review.product.toString(), rating: review.rating },
    });

    const populatedReview = await Review.findById(review._id)
        .populate("user", "name email photoUrl")
        .populate("product", "name slug");

    return populatedReview;
};

// Admin toggles a review's isFlagged status
const toggleReviewFlag = async (reviewId: string) => {
    const review = await Review.checkReviewExist(reviewId);

    review.isFlagged = !review.isFlagged;
    await review.save();

    // Recalculate the product rating so flagged reviews don't count
    await recalcProductRating(review.product);

    await ActivityServices.logActivity({
        module: ActivityModule.REVIEW,
        type: ActivityType.STATUS,
        message: `Review ${review.isFlagged ? "flagged" : "unflagged"}`,
        referenceId: review._id.toString(),
        metadata: { isFlagged: review.isFlagged },
    });

    return review;
};

// Admin deletes a review (hard delete) and removes it from the product
const deleteReview = async (reviewId: string) => {
    const review = await Review.checkReviewExist(reviewId);

    const productId = review.product;

    await Review.findByIdAndDelete(reviewId);

    // Remove the review id from the product's reviews array
    await Product.findByIdAndUpdate(
        productId,
        { $pull: { reviews: reviewId } },
        { new: true },
    );

    // Recalculate the product rating
    await recalcProductRating(productId);

    await ActivityServices.logActivity({
        module: ActivityModule.REVIEW,
        type: ActivityType.DELETE,
        message: "A review was deleted",
        referenceId: reviewId,
    });

    return review;
};

export const ReviewServices = {
    getAllReviews,
    getSingleReview,
    getMyReviews,
    createReview,
    toggleReviewFlag,
    deleteReview,
};
