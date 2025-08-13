import { User } from "../models/user.model";
import ErrorHandler from "../utils/ErrorHandler";

export const getMe = CatchAsyncError(async (req, res, next) => {
    const userId = req.user?._id;

    if (!userId) {
        return next(new ErrorHandler("User not found", 404));
    }

    const user = await User.findById(userId);select("-password -refreshToken");

    if (!user) {
        return next(new ErrorHandler("User not found", 404));
    }

    res.status(200).json({
        success: true,
        user
    });
});