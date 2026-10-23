import { NextFunction, Request, Response } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import config from "../config";
import { UserRole } from "../modules/user/user.interface";
import User from "../modules/user/user.model";
import AppError from "../errors/appError";
import catchAsync from "../utils/catchAsync";
import { StatusCodes } from "http-status-codes";

/**
 * Optional authentication middleware.
 *
 * If a valid Bearer token is present, it verifies it and attaches the decoded
 * user to `req.user` (like `auth`). If no token is present, the request simply
 * continues as a guest (used by guest checkout — the order is saved with
 * `user: null`). An invalid/expired token is still rejected — a client that
 * sends a bad token must fix it rather than silently being treated as a guest.
 */
const optionalAuth = () => {
    return catchAsync(
        async (req: Request, _res: Response, next: NextFunction) => {
            const token = req.headers.authorization;

            if (!token) {
                return next();
            }

            const decoded = jwt.verify(
                token,
                config.jwt_access_secret as string,
            ) as JwtPayload;

            const { role, email } = decoded;

            const user = await User.findOne({
                email,
                role,
                isActive: true,
            });

            if (!user) {
                throw new AppError(
                    StatusCodes.NOT_FOUND,
                    "This user is not found!",
                );
            }

            req.user = decoded as JwtPayload & { role: UserRole };
            next();
        },
    );
};

export default optionalAuth;
