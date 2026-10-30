import mongoose, { Schema } from "mongoose";
import {
    INewsletterSubscriber,
    NewsletterSubscriberModel,
} from "./newsletter.interface";

const newsletterSubscriberSchema = new Schema<
    INewsletterSubscriber,
    NewsletterSubscriberModel
>(
    {
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
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

const NewsletterSubscriber = mongoose.model<
    INewsletterSubscriber,
    NewsletterSubscriberModel
>("NewsletterSubscriber", newsletterSubscriberSchema);

export default NewsletterSubscriber;
