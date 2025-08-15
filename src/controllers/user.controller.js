import { CatchAsyncErrror } from "../middlewares/catchAsyncError.js";
import { User } from "../models/user.model.js";
import ErrorHandler from "../utils/ErrorHandler.js";

export const getMe = CatchAsyncErrror(async (req, res, next) => {
    const userId = req.user?._id;

    if (!userId) {
        return next(new ErrorHandler("User not found", 404));
    }

    const user = await User.findById(userId)
                    .select("-password -refreshToken")
                    .populate('caApplication');

    if (!user) {
        return next(new ErrorHandler("User not found", 404));
    }

    res.status(200).json({
        success: true,
        user
    });
});