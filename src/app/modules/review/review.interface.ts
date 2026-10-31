import { Document, Model, Types } from "mongoose";

export interface IReview extends Document {
    rating: number;
    description: string;
    user: Types.ObjectId;
    product: Types.ObjectId;
    isFlagged: boolean;
    flaggedReason?: string;
    isVerifiedPurchase: boolean;
    /** Optional customer-uploaded photos (Cloudinary URLs, max 3). */
    photoUrls: string[];
    createdAt: Date;
    updatedAt: Date;
}

export interface ReviewModel extends Model<IReview> {
    checkReviewExist(reviewId: string): Promise<IReview>;
}
