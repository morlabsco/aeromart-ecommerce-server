import { Request, Response } from "express";
import { NewsletterServices } from "./newsletter.service";
import { StatusCodes } from "http-status-codes";
import sendResponse from "../../utils/sendResponse";
import catchAsync from "../../utils/catchAsync";

const subscribe = catchAsync(async (req: Request, res: Response) => {
    const { subscriber, alreadySubscribed } = await NewsletterServices.subscribe(
        req.body.email,
    );

    sendResponse(res, {
        statusCode: StatusCodes.CREATED,
        success: true,
        message: alreadySubscribed
            ? "You are already subscribed — welcome back!"
            : "Thanks for subscribing!",
        data: { _id: subscriber._id, email: subscriber.email, alreadySubscribed },
    });
});

const getAllSubscribers = catchAsync(async (req: Request, res: Response) => {
    const result = await NewsletterServices.getAllSubscribers(req.query);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Subscribers retrieved successfully",
        meta: result.meta,
        data: result.result,
    });
});

const deleteSubscriber = catchAsync(async (req: Request, res: Response) => {
    const { subscriberId } = req.params;
    const result = await NewsletterServices.deleteSubscriber(
        subscriberId as string,
    );

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Subscriber removed successfully",
        data: result,
    });
});

export const NewsletterController = {
    subscribe,
    getAllSubscribers,
    deleteSubscriber,
};
