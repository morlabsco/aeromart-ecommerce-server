import { Document, Model } from "mongoose";

// A newsletter subscriber captured from the storefront's subscribe form.
// Kept deliberately minimal — email + timestamps; unsubscribing is a delete.
export interface INewsletterSubscriber extends Document {
    email: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface NewsletterSubscriberModel
    extends Model<INewsletterSubscriber> {}
