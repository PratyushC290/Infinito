import jwt from 'jsonwebtoken';
import { User } from '../models/user.model.js';
import ErrorHandler from '../utils/ErrorHandler.js';
import { CatchAsyncErrror } from './catchAsyncError.js';

export const verifyToken = CatchAsyncErrror(async (req, res, next) => {
    // Get token from cookies or header
    const token = req.cookies?.accessToken || req.headers.authorization?.split(' ')[1];

    if (!token) {
        return next(new ErrorHandler('Please login to access this resource', 401));
    }

    try {
        // Verify token
        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        
        // Get user from token
        const user = await User.findById(decoded.userId).select('-password');
        if (!user) {
            return next(new ErrorHandler('User not found', 401));
        }

        // Attach user to request
        req.user = user;
        next();
    } catch (error) {
        return next(new ErrorHandler('Invalid or expired token', 401));
    }
});

// Optional: Add role-based authorization
export const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return next(new ErrorHandler(`Role (${req.user.role}) is not allowed to access this resource`, 403));
        }
        next();
    };
};