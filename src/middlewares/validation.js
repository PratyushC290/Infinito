import rateLimit from 'express-rate-limit';
import { body, validationResult } from 'express-validator';
import ErrorHandler from '../utils/ErrorHandler.js';

// Rate limiting for password change
export const passwordChangeRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, //max 3 req/IP
  message: {
    success: false,
    message: 'Too many password change attempts, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Validation middleware for password change
export const validatePasswordChange = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required')
    .isLength({ min: 1 })
    .withMessage('Current password cannot be empty'),
  
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number'),
  
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Password confirmation does not match new password');
      }
      return true;
    }),

  // Error handling middleware
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorMessage = errors.array()[0].msg;
      return next(new ErrorHandler(errorMessage, 400));
    }
    next();
  },
];

// Validation middleware for profile update
export const validateProfileUpdate = [
  body('fullname')
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage('Full name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Full name can only contain letters and spaces'),
  
  body('collegeName')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('College name must be between 2 and 100 characters')
    .trim(),
  
  body('rollNo')
    .optional()
    .isLength({ min: 1, max: 20 })
    .withMessage('Roll number must be between 1 and 20 characters')
    .matches(/^[a-zA-Z0-9]+$/)
    .withMessage('Roll number can only contain letters and numbers'),
  
  body('PORs')
    .optional()
    .isArray()
    .withMessage('PORs must be an array')
    .custom((value) => {
      if (value.length > 10) {
        throw new Error('Cannot have more than 10 PORs');
      }
      // POR is a valid string or not
      value.forEach((por, index) => {
        if (typeof por !== 'string' || por.trim().length < 2) {
          throw new Error(`POR at index ${index} must be a valid string with at least 2 characters`);
        }
      });
      return true;
    }),

  // Error handling middleware
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorMessage = errors.array()[0].msg;
      return next(new ErrorHandler(errorMessage, 400));
    }
    next();
  },
];

// General rate limiting for sensitive operations
export const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // max 100 req/IP
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

