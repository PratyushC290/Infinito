import express from 'express';
import { googleLogin } from "../controllers/auth.controller.js";
import {
    sendSignupOTP,
    verifySignupOTP,
    sendLoginOTP,
    login,
    loginWithOTP,
    logout,
    resendOTP,
    // googleLogin // Add this import
} from '../controllers/auth.controller.js';
import { verifyToken } from '../middlewares/verifyToken.js';

const router = express.Router();

// Google OAuth route
// router.post('/google-login', googleLogin);

router.post("/google-login", googleLogin);

// Signup routes
router.post('/signup/send-otp', sendSignupOTP);
router.post('/signup/verify-otp', verifySignupOTP);

// Login routes
router.post('/login', login); // Regular password login
router.post('/login/send-otp', sendLoginOTP); // Send OTP for passwordless login
router.post('/login/verify-otp', loginWithOTP); // Verify OTP and login

// Common routes
router.post('/resend-otp', resendOTP);
router.post('/logout', verifyToken, logout);

// Test route for OTP email (development only)
if (process.env.NODE_ENV === 'development') {
    router.post('/test-email', async (req, res) => {
        try {
            const { sendTestEmail } = await import('../utils/emailService.js');
            const { email } = req.body;
            
            if (!email) {
                return res.status(400).json({ success: false, message: 'Email is required' });
            }
            
            const result = await sendTestEmail(email);
            res.json(result);
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    });
}

export default router;