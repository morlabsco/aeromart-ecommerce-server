import { StatusCodes } from "http-status-codes";
import AppError from "../errors/appError";
import catchAsync from "../utils/catchAsync";
import { NextFunction, Request, Response } from "express";

export const parseBody = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
        // JSON bodies pass straight through (express.json already parsed
        // them) — the `data` envelope is only the MULTIPART convention, where
        // multer leaves fields as strings and the JSON payload rides in data.
        const isMultipart = (req.headers["content-type"] ?? "").includes(
            "multipart",
        );
        if (!isMultipart) {
            next();
            return;
        }

        if (!req.body.data) {
            throw new AppError(
                StatusCodes.BAD_REQUEST,
                "Please provide data in the body under data key",
            );
        }
        req.body = JSON.parse(req.body.data);

        next();
    },
);
