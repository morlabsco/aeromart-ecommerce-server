import { IActivity, ActivityModule, ActivityType } from "./activity.interface";
import Activity from "./activity.model";
import QueryBuilder from "../../builder/QueryBuilder";
import AppError from "../../errors/appError";
import { StatusCodes } from "http-status-codes";
import { ActivitySearchableFields } from "./activity.constant";

const getAllActivities = async (query: Record<string, unknown>) => {
    const activityQuery = new QueryBuilder(Activity.find(), query)
        .search(ActivitySearchableFields)
        .filter()
        .sort()
        .paginate()
        .fields();

    const result = await activityQuery.modelQuery;
    const meta = await activityQuery.countTotal();

    return { result, meta };
};

const getSingleActivity = async (activityId: string) => {
    const activity = await Activity.findById(activityId);

    if (!activity) {
        throw new AppError(StatusCodes.NOT_FOUND, "Activity not found!");
    }

    return activity;
};

// Removes a single activity record.
const clearSingleActivity = async (activityId: string) => {
    const activity = await Activity.findByIdAndDelete(activityId);

    if (!activity) {
        throw new AppError(StatusCodes.NOT_FOUND, "Activity not found!");
    }

    return activity;
};

// Clears activities. Two modes:
//   { clearAll: true }                 → deletes everything.
//   { from: Date, to: Date }           → deletes records created in the range (inclusive).
// An empty body / unknown shape is rejected so a client cannot wipe the log by accident.
const clearActivities = async (payload: {
    clearAll?: boolean;
    from?: string;
    to?: string;
}) => {
    let filter: Record<string, unknown> = {};

    if (payload.clearAll) {
        filter = {};
    } else if (payload.from || payload.to) {
        const range: Record<string, Date> = {};
        if (payload.from) {
            const fromDate = new Date(payload.from);
            if (isNaN(fromDate.getTime())) {
                throw new AppError(
                    StatusCodes.BAD_REQUEST,
                    "Invalid from date!",
                );
            }
            range.$gte = fromDate;
        }
        if (payload.to) {
            const toDate = new Date(payload.to);
            if (isNaN(toDate.getTime())) {
                throw new AppError(StatusCodes.BAD_REQUEST, "Invalid to date!");
            }
            range.$lte = toDate;
        }
        filter = { createdAt: range };
    } else {
        throw new AppError(
            StatusCodes.BAD_REQUEST,
            "Provide clearAll: true or a from/to date range!",
        );
    }

    const result = await Activity.deleteMany(filter);

    return { deletedCount: result.deletedCount };
};

// Shared helper — called by other module services after a write so every
// important mutation is recorded in the activity log without a transaction.
const logActivity = async (payload: {
    module: ActivityModule;
    type: ActivityType;
    message: string;
    referenceId?: string;
    reference?: string;
    performedBy?: string;
    metadata?: Record<string, unknown>;
}) => {
    await Activity.create({
        module: payload.module,
        type: payload.type,
        message: payload.message,
        referenceId: payload.referenceId || null,
        reference: payload.reference || "",
        performedBy: payload.performedBy || null,
        metadata: payload.metadata || {},
    } as IActivity);
};

export const ActivityServices = {
    getAllActivities,
    getSingleActivity,
    clearSingleActivity,
    clearActivities,
    logActivity,
};
