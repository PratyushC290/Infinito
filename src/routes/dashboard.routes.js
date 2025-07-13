import express from 'express';
import {
  getDashboardData,
  getUserProfile,
  changePassword,
  updateProfile,
} from '../controllers/dashboard.controller.js';
import { isAuthenticated } from '../middleware/auth.js';
import { updateAccessToken } from '../controllers/user.controller.js';
import { 
  validatePasswordChange, 
  validateProfileUpdate, 
  passwordChangeRateLimit 
} from '../middleware/validation.js';

const dashboardRouter = express.Router();

// Main dashboard route - accessible to all authenticated users
dashboardRouter.get(
  '/dashboard',
  updateAccessToken,
  isAuthenticated,
  getDashboardData
);

// User profile route
dashboardRouter.get(
  '/profile',
  updateAccessToken,
  isAuthenticated,
  getUserProfile
);

// Change password route
dashboardRouter.put(
  '/change-password',
  updateAccessToken,
  isAuthenticated,
  passwordChangeRateLimit,
  validatePasswordChange,
  changePassword
);

// Update profile route
dashboardRouter.put(
  '/update-profile',
  updateAccessToken,
  isAuthenticated,
  validateProfileUpdate,
  updateProfile
);

export default dashboardRouter;