import { StatusCodes } from "http-status-codes";
import AppError from "../../errors/appError";
import QueryBuilder from "../../builder/QueryBuilder";
import NewsletterSubscriber from "./newsletter.model";
import { NewsletterSearchableFields } from "./newsletter.constant";
import { ActivityServices } from "../activity/activity.service";
import { ActivityModule, ActivityType } from "../activity/activity.interface";

/**
 * Subscribe an email. Idempotent by design: subscribing an address that is
 * already on the list returns 200 with `alreadySubscribed: true` instead of
 * an error — a storefront form should never punish a double opt-in.
 */
const subscribe = async (email: string) => {
    const normalized = email.trim().toLowerCase();

    const existing = await NewsletterSubscriber.findOne({
        email: normalized,
    });

    if (existing) {
        return { subscriber: existing, alreadySubscribed: true };
    }

    const subscriber = await NewsletterSubscriber.create({
        email: normalized,
    });

    await ActivityServices.logActivity({
        module: ActivityModule.SETTINGS,
        type: ActivityType.CREATE,
        message: `New newsletter subscriber: ${normalized}`,
    });

    return { subscriber, alreadySubscribed: false };
};

const getAllSubscribers = async (query: Record<string, unknown>) => {
    const subscriberQuery = new QueryBuilder(
        NewsletterSubscriber.find(),
        query,
    )
        .search(NewsletterSearchableFields)
        .filter()
        .sort()
        .paginate()
        .fields();

    const result = await subscriberQuery.modelQuery.exec();
    const meta = await subscriberQuery.countTotal();

    return { result, meta };
};

const deleteSubscriber = async (subscriberId: string) => {
    const subscriber = await NewsletterSubscriber.findByIdAndDelete(
        subscriberId,
    );

    if (!subscriber) {
        throw new AppError(StatusCodes.NOT_FOUND, "Subscriber not found!");
    }

    await ActivityServices.logActivity({
        module: ActivityModule.SETTINGS,
        type: ActivityType.DELETE,
        message: `Newsletter subscriber removed: ${subscriber.email}`,
    });

    return subscriber;
};

export const NewsletterServices = {
    subscribe,
    getAllSubscribers,
    deleteSubscriber,
};
