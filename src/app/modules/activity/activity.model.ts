import mongoose, { Schema } from "mongoose";
import {
    IActivity,
    ActivityModel,
    ActivityModule,
    ActivityType,
} from "./activity.interface";

const activitySchema = new Schema<IActivity, ActivityModel>(
    {
        module: {
            type: String,
            enum: Object.values(ActivityModule),
            required: true,
        },
        type: {
            type: String,
            enum: Object.values(ActivityType),
            required: true,
        },
        message: {
            type: String,
            required: true,
            trim: true,
        },
        referenceId: {
            type: Schema.Types.ObjectId,
            default: null,
        },
        reference: {
            type: String,
            default: "",
            trim: true,
        },
        performedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        metadata: {
            type: Schema.Types.Mixed,
            default: {},
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

// Always sort newest-first (activities are a chronological log).
activitySchema.pre("find", function () {
    this.sort({ createdAt: -1 });
});

const Activity = mongoose.model<IActivity, ActivityModel>(
    "Activity",
    activitySchema,
);

export default Activity;
