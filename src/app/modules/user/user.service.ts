import { IUser, UserRole } from "./user.interface";
import User from "./user.model";
import AppError from "../../errors/appError";
import { StatusCodes } from "http-status-codes";
import { UserSearchableFields } from "./user.constant";
import mongoose from "mongoose";
import { IImageFile } from "../../interface/IImageFile";
import { AuthService } from "../auth/auth.service";
import QueryBuilder from "../../builder/QueryBuilder";
import { IJwtPayload } from "../auth/auth.interface";
import { ActivityServices } from "../activity/activity.service";
import { ActivityModule, ActivityType } from "../activity/activity.interface";
import { destroyCloudinaryUrls } from "../../config/cloudinary.config";

// Function to register user
const registerUser = async (userData: IUser) => {
    const session = await mongoose.startSession();

    try {
        session.startTransaction();

        // Public registration is ALWAYS a customer — any other role in the
        // payload (admin, manager) is a privilege-escalation attempt.
        if (userData.role && userData.role !== UserRole.CUSTOMER) {
            throw new AppError(
                StatusCodes.NOT_ACCEPTABLE,
                "Invalid role. Only customer is allowed.",
            );
        }
        userData.role = UserRole.CUSTOMER;

        // Check if the user already exists by email
        const existingUser = await User.findOne({
            email: userData.email,
        }).session(session);
        if (existingUser) {
            throw new AppError(
                StatusCodes.NOT_ACCEPTABLE,
                "Email is already registered",
            );
        }

        // Create the user
        const user = new User(userData);
        const createdUser = await user.save({ session });

        await session.commitTransaction();

        await ActivityServices.logActivity({
            module: ActivityModule.USER,
            type: ActivityType.CREATE,
            message: `User "${createdUser.name}" (${createdUser.email}) registered`,
            referenceId: createdUser._id.toString(),
            performedBy: createdUser._id.toString(),
        });

        return await AuthService.loginUser({
            email: createdUser.email,
            password: userData.password,
            clientInfo: userData.clientInfo,
        });
    } catch (error) {
        if (session.inTransaction()) {
            await session.abortTransaction();
        }
        throw error;
    } finally {
        session.endSession();
    }
};

const getAllUser = async (
    query: Record<string, unknown>,
    authUser: IJwtPayload,
) => {
    const UserQuery = new QueryBuilder(
        User.find({ _id: { $ne: authUser.userId } }),
        query,
    )
        .search(UserSearchableFields)
        .filter()
        .sort()
        .paginate()
        .fields();

    const result = await UserQuery.modelQuery;
    const meta = await UserQuery.countTotal();
    return {
        result,
        meta,
    };
};

const myProfile = async (authUser: IJwtPayload) => {
    const isUserExists = await User.findById(authUser.userId);
    if (!isUserExists) {
        throw new AppError(StatusCodes.NOT_FOUND, "User not found!");
    }
    if (!isUserExists.isActive) {
        throw new AppError(StatusCodes.BAD_REQUEST, "User is not active!");
    }

    return isUserExists;
};

const updateProfile = async (
    payload: Partial<IUser>,
    file: IImageFile,
    authUser: IJwtPayload,
) => {
    const isUserExists = await User.findById(authUser.userId);

    if (!isUserExists) {
        throw new AppError(StatusCodes.NOT_FOUND, "User not found!");
    }
    if (!isUserExists.isActive) {
        throw new AppError(StatusCodes.BAD_REQUEST, "User is not active!");
    }

    // A new uploaded photo overrides; photoUrl: "" removes the current photo.
    const previousPhotoUrl = isUserExists.photoUrl as string | null | undefined;
    if (file && file.path) {
        payload.photoUrl = file.path;
    } else if (payload.photoUrl === "") {
        payload.photoUrl = null as any;
    }

    const result = await User.findOneAndUpdate(
        { _id: authUser.userId },
        payload,
        {
            new: true,
        },
    );

    // DB write succeeded — destroy the replaced photo from Cloudinary.
    // Only when a NEW photo replaced an EXISTING one (photoUrl: "" removal
    // also destroys the old file; nothing to destroy when there was none).
    if (previousPhotoUrl && previousPhotoUrl !== result?.photoUrl) {
        await destroyCloudinaryUrls([previousPhotoUrl]);
    }

    await ActivityServices.logActivity({
        module: ActivityModule.USER,
        type: ActivityType.UPDATE,
        message: `User "${result?.name}" updated their profile`,
        referenceId: authUser.userId,
        performedBy: authUser.userId,
    });

    return result;
};

const updateUserStatus = async (
    userId: string,
    authUser: IJwtPayload,
) => {
    const user = await User.findById(userId);

    if (!user) {
        throw new AppError(StatusCodes.NOT_FOUND, "User is not found");
    }

    if (String(user._id) === authUser.userId) {
        throw new AppError(
            StatusCodes.BAD_REQUEST,
            "You cannot deactivate your own account!",
        );
    }

    user.isActive = !user.isActive;
    const updatedUser = await user.save();

    await ActivityServices.logActivity({
        module: ActivityModule.USER,
        type: ActivityType.STATUS,
        message: `User "${user.name}" is now ${user.isActive ? "active" : "inactive"}`,
        referenceId: user._id.toString(),
        performedBy: authUser.userId,
        metadata: { isActive: user.isActive },
    });

    return updatedUser;
};

// Admin-only: create a dashboard user (manager/customer/admin) from the
// panel — the ONLY path that can mint a non-customer role.
const createUserByAdmin = async (
    userData: Partial<IUser>,
    authUser: IJwtPayload,
) => {
    const existingUser = await User.findOne({ email: userData.email });
    if (existingUser) {
        throw new AppError(
            StatusCodes.NOT_ACCEPTABLE,
            "Email is already registered",
        );
    }

    // Admin-created users carry synthetic client info (first login overwrites it).
    const user = new User({
        ...userData,
        role: userData.role || UserRole.CUSTOMER,
        clientInfo: {
            device: "pc",
            browser: "Dashboard",
            ipAddress: "0.0.0.0",
            userAgent: `created by ${authUser.email}`,
        },
    });
    const createdUser = await user.save();

    await ActivityServices.logActivity({
        module: ActivityModule.USER,
        type: ActivityType.CREATE,
        message: `User "${createdUser.name}" (${createdUser.email}) was created as ${createdUser.role} from the dashboard`,
        referenceId: createdUser._id.toString(),
        performedBy: authUser.userId,
        metadata: { role: createdUser.role },
    });

    return createdUser;
};

export const UserServices = {
    registerUser,
    createUserByAdmin,
    getAllUser,
    myProfile,
    updateUserStatus,
    updateProfile,
};
