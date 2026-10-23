import mongoose, { Schema } from "mongoose";
import { IReview, ReviewModel } from "./review.interface";
import AppError from "../../errors/appError";
import { StatusCodes } from "http-status-codes";

const reviewSchema = new Schema<IReview, ReviewModel>(
    {
        rating: {
            type: Number,
            required: true,
            min: 1,
            max: 5,
        },
        description: {
            type: String,
            required: true,
            trim: true,
        },
        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        product: {
            type: Schema.Types.ObjectId,
            ref: "Product",
            required: true,
        },
        isFlagged: {
            type: Boolean,
            default: false,
        },
        flaggedReason: {
            type: String,
            default: "",
        },
        isVerifiedPurchase: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
        toJSON: {
            transform: (_doc, ret) => {
                const { __v, ...rest } = ret;
                return rest;
            },
        },
    },
);

reviewSchema.statics.checkReviewExist = async function (reviewId: string) {
    const existingReview = await this.findById(reviewId);

    if (!existingReview) {
        throw new AppError(StatusCodes.NOT_FOUND, "Review does not exist!");
    }

    return existingReview;
};

// Prevent duplicate reviews from the same user on the same product
reviewSchema.index({ user: 1, product: 1 }, { unique: true });

const Review = mongoose.model<IReview, ReviewModel>("Review", reviewSchema);

export default Review;
