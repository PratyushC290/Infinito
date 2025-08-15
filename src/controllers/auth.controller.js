import bcrypt from "bcryptjs";
import crypto from 'crypto';
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import { CatchAsyncErrror } from "../middlewares/catchAsyncError.js";
import { OAuth2Client } from "google-auth-library";
import { sendEmail } from '../utils/sendEmailGoogleAuth.js'
import ErrorHandler from "../utils/ErrorHandler.js";
import { sendOTPEmail } from "../utils/emails/index.js";
import { isIITPEmail } from "../utils/emails/utils.js";
// In-memory OTP storage (use Redis in production)
const otpStorage = new Map();

// Generate OTP
function generateOTP(length = 6) {
    const digits = '0123456789';
    let otp = '';
    for (let i = 0; i < length; i++) {
        otp += digits[Math.floor(Math.random() * digits.length)];
    }
    return otp;
}

// // Store OTP with user data for signup
// function storeSignupOTP(email, userData, otp) {
//     otpStorage.set(email, {
//         otp: otp,
//         type: 'signup',
//         userData: userData, // Store signup data temporarily
//         expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
//         isUsed: false,
//         attempts: 0
//     });
// }

// // Store OTP for login verification
// function storeLoginOTP(email, otp) {
//     otpStorage.set(email, {
//         otp: otp,
//         type: 'login',
//         expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
//         isUsed: false,
//         attempts: 0
//     });
// }

// export const sendSignupOTP = CatchAsyncErrror(async (req, res, next) => {
//     console.log("Processing signup OTP request");
//     try {
//         const { username, email, password } = req.body;

//         if (!username || !email || !password ) {
//             return next(new ErrorHandler("All required fields must be provided", 400));
//         }

//         // const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

//         const emailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;

//         if (!emailRegex.test(email)) {
//             return next(new ErrorHandler("Please provide a valid gmail address", 400));
//         }

//         const normalizedEmail = email.toLowerCase().trim();


//         const existingUser = await User.findOne({
//           $or: [
//             { email: normalizedEmail },
//             { username: { $regex: `^${username.trim()}$`, $options: 'i' } } // case-insensitive exact match
//           ]
//         });

//         if (existingUser) {
//             return res.status(400).json({ message: "User already exists with this email or username" });
//         }

//         const existing = otpStorage.get(normalizedEmail);
//         if (existing && existing.type === 'signup' && new Date() < existing.expiresAt && !existing.isUsed) {
//             const timeLeft = Math.ceil((existing.expiresAt - new Date()) / 1000 / 60);
//             return res.json({
//                 success: false,
//                 message: `An OTP is already active for this email. Please check your mail inbox or wait ${timeLeft} minutes for it to expire.`,
//                 timeLeft: timeLeft
//             });
//         }
//         const otp = generateOTP(6);
//         const userData = {
//             username: username.trim(),
//             email: normalizedEmail,
//             password: await bcrypt.hash(password, parseInt(process.env.SALT_ROUNDS) || 12),
//             role: 'user',
//         };
//         storeSignupOTP(normalizedEmail, userData, otp);
//         const emailResult = await sendOTPEmail(normalizedEmail, otp, 'signup', {
//             fullname: userData.fullname,
//             email: userData.email
//         });
//         if (!emailResult.success) {
//             return next(new ErrorHandler("Failed to send verification email", 500));
//         }

//         console.log(` Signup OTP sent to ${normalizedEmail} `);

//         res.status(200).json({
//             success: true,
//             message: "Verification code sent to your email. Please check your inbox.",
//             email: normalizedEmail,
//         });

//     } catch (error) {
//         console.error("Signup OTP Error:", error);
//         return next(new ErrorHandler(error.message, 500));
//     }
// });


// Store OTP with cooldown timestamp
function storeSignupOTP(email, userData, otp) {
    otpStorage.set(email, {
        otp: otp,
        type: 'signup',
        userData: userData,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        lastSentAt: Date.now(), 
        isUsed: false,
        attempts: 0
    });
}

export const sendSignupOTP = CatchAsyncErrror(async (req, res, next) => {
    console.log("Processing signup OTP request");
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            return next(new ErrorHandler("All required fields must be provided", 400));
        }

        const emailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
        if (!emailRegex.test(email)) {
            return next(new ErrorHandler("Please provide a valid gmail address", 400));
        }

        const normalizedEmail = email.toLowerCase().trim();

        // Check for existing user
        const existingUser = await User.findOne({
            $or: [
                { email: normalizedEmail },
                { username: { $regex: `^${username.trim()}$`, $options: 'i' } }
            ]
        });
        if (existingUser) {
            return res.status(400).json({ message: "User already exists with this email or username" });
        }

        const existing = otpStorage.get(normalizedEmail);

        // Check cooldown period of 45 seconds
        if (existing && existing.lastSentAt && Date.now() - existing.lastSentAt < 45 * 1000) {
            const waitTime = Math.ceil((45 * 1000 - (Date.now() - existing.lastSentAt)) / 1000);
            return res.status(429).json({
                success: false,
                message: `Please wait ${waitTime} seconds before requesting a new OTP.`
            });
        }

        // If there's already an unused OTP still valid
        // if (existing && existing.type === 'signup' && new Date() < existing.expiresAt && !existing.isUsed) {
        //     const timeLeft = Math.ceil((existing.expiresAt - new Date()) / 1000 / 60);
        //     return res.json({
        //         success: false,
        //         message: `An OTP is already active for this email. Please check your mail inbox or wait ${timeLeft} minutes for it to expire.`,
        //         timeLeft: timeLeft
        //     });
        // }

        const otp = generateOTP(6);
        const userData = {
            username: username.trim(),
            email: normalizedEmail,
            password: await bcrypt.hash(password, parseInt(process.env.SALT_ROUNDS) || 12),
            role: 'user',
        };

        storeSignupOTP(normalizedEmail, userData, otp);

        const emailResult = await sendOTPEmail(normalizedEmail, otp, 'signup', {
            fullname: userData.fullname,
            email: userData.email
        });
        if (!emailResult.success) {
            return next(new ErrorHandler("Failed to send verification email", 500));
        }

        console.log(`Signup OTP sent to ${normalizedEmail}`);

        res.status(200).json({
            success: true,
            message: "Verification code sent to your email. Please check your inbox.",
            email: normalizedEmail,
        });

    } catch (error) {
        console.error("Signup OTP Error:", error);
        return next(new ErrorHandler(error.message, 500));
    }
});



// export const verifySignupOTP = CatchAsyncErrror(async (req, res, next) => {
//     try {
//         const { email, otp } = req.body;

//         if (!email || !otp) {
//             return next(new ErrorHandler("Email and OTP are required", 400));
//         }

//         const normalizedEmail = email.toLowerCase().trim();
//         const storedData = otpStorage.get(normalizedEmail);

//         if (!storedData || storedData.type !== 'signup') {
//             return next(new ErrorHandler("No signup OTP found for this email", 400));
//         }

//         if (storedData.isUsed) {
//             return next(new ErrorHandler("This OTP has already been used", 400));
//         }

//         if (new Date() > storedData.expiresAt) {
//             otpStorage.delete(normalizedEmail);
//             return next(new ErrorHandler("OTP has expired. Please request a new one", 400));
//         }

//         // Increment attempt counter
//         storedData.attempts = (storedData.attempts || 0) + 1;

//         if (storedData.attempts > 3) {
//             otpStorage.delete(normalizedEmail);
//             return next(new ErrorHandler("Too many failed attempts. Please request a new OTP", 400));
//         }

//         if (storedData.otp !== otp) {
//             otpStorage.set(normalizedEmail, storedData);
//             return next(new ErrorHandler(`Invalid OTP. ${4 - storedData.attempts} attempts remaining`, 400));
//         }

//         const userData = storedData.userData;
//         const existingUser = await User.findOne({
//             $or: [{ email: userData.email }, { username: userData.username }]
//         });

//         let user;
//         if (existingUser && !existingUser.isEmailVerified) {
//             user = await User.findByIdAndUpdate(existingUser._id, userData, { new: true });
//         } else if (!existingUser) {
//             user = await User.create(userData);
//         } else {
//             return next(new ErrorHandler("User already exists", 400));
//         }

//         storedData.isUsed = true;
//         otpStorage.set(normalizedEmail, storedData);

//         // Generate tokens
//         const accessToken = jwt.sign(
//             { userId: user._id },
//             process.env.ACCESS_TOKEN_SECRET,
//             { expiresIn: '15m' }
//         );

//         const refreshToken = jwt.sign(
//             { userId: user._id },
//             process.env.REFRESH_TOKEN_SECRET,
//             { expiresIn: '7d' }
//         );

//         // Save refresh token to user
//         user.refreshToken = refreshToken;
//         await user.save({ validateBeforeSave: false });

//         // Clean up OTP storage
//         setTimeout(() => otpStorage.delete(normalizedEmail), 60000); // Delete after 1 minute

//         const userResponse = {
//             _id: user._id,
//             username: user.username,
//             email: user.email,
//             role: user.role,
//             isEmailVerified: user.isEmailVerified
//         };

//         const successMessage ="Account created and email verified successfully";

//         console.log(` User created successfully: ${user.email} `);

//         res.status(201)
//             .cookie("accessToken", accessToken, {
//                 httpOnly: true,
//                 secure: process.env.NODE_ENV === "production",
//                 maxAge: 15 * 60 * 1000 // 15 minutes
//             })
//             .cookie("refreshToken", refreshToken, {
//                 httpOnly: true,
//                 secure: process.env.NODE_ENV === "production",
//                 maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
//             })
//             .json({
//                 success: true,
//                 message: successMessage,
//                 user: userResponse,
//                 accessToken
//             });

//     } catch (error) {
//         console.error("Verify signup OTP Error:", error);
//         return next(new ErrorHandler(error.message, 500));
//     }
// });

export const verifySignupOTP = CatchAsyncErrror(async (req, res, next) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return next(new ErrorHandler("Email and OTP are required", 400));
        }

        const normalizedEmail = email.toLowerCase().trim();
        const storedData = otpStorage.get(normalizedEmail);

        if (!storedData || storedData.type !== 'signup') {
            return next(new ErrorHandler("No signup OTP found for this email", 400));
        }

        if (storedData.isUsed) {
            return next(new ErrorHandler("This OTP has already been used", 400));
        }

        if (new Date() > storedData.expiresAt) {
            otpStorage.delete(normalizedEmail);
            return next(new ErrorHandler("OTP has expired. Please request a new one", 400));
        }

        // Increment attempt counter
        storedData.attempts = (storedData.attempts || 0) + 1;

        if (storedData.attempts > 3) {
            otpStorage.delete(normalizedEmail);
            return next(new ErrorHandler("Too many failed attempts. Please request a new OTP", 400));
        }

        if (storedData.otp !== otp) {
            otpStorage.set(normalizedEmail, storedData);
            return next(new ErrorHandler(`Invalid OTP. ${4 - storedData.attempts} attempts remaining`, 400));
        }

        storedData.isUsed = true;
        otpStorage.set(normalizedEmail, storedData);

        const userData = storedData.userData;
        const existingUser = await User.findOne({
            $or: [{ email: userData.email }, { username: userData.username }]
        });

        let user;
        if (existingUser && !existingUser.isEmailVerified) {
            user = await User.findByIdAndUpdate(existingUser._id, userData, { new: true });
        } else if (!existingUser) {
            user = await User.create(userData);
        } else {
            return next(new ErrorHandler("User already exists", 400));
        }

        // Generate tokens
        const accessToken = jwt.sign(
            { userId: user._id },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: '15m' }
        );

        const refreshToken = jwt.sign(
            { userId: user._id },
            process.env.REFRESH_TOKEN_SECRET,
            { expiresIn: '7d' }
        );

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        otpStorage.delete(normalizedEmail);

        const userResponse = {
            _id: user._id,
            username: user.username,
            email: user.email,
            role: user.role,
            isEmailVerified: user.isEmailVerified
        };

        console.log(`User created successfully: ${user.email}`);

        res.status(201)
            .cookie("accessToken", accessToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                maxAge: 15 * 60 * 1000
            })
            .cookie("refreshToken", refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                maxAge: 7 * 24 * 60 * 60 * 1000
            })
            .json({
                success: true,
                message: "Account created and email verified successfully",
                user: userResponse,
                accessToken
            });

    } catch (error) {
        console.error("Verify signup OTP Error:", error);
        return next(new ErrorHandler(error.message, 500));
    }
});





// Send OTP for login (optional 2FA)
export const sendLoginOTP = CatchAsyncErrror(async (req, res, next) => {
    try {
        const { email } = req.body;

        if (!email) {
            return next(new ErrorHandler("Email is required", 400));
        }

        const normalizedEmail = email.toLowerCase().trim();

        // Check if user exists and is verified
        const user = await User.findOne({ email: normalizedEmail });
        if (!user) {
            return next(new ErrorHandler("No account found with this email", 404));
        }

        if (!user.isEmailVerified) {
            return next(new ErrorHandler("Please verify your email first", 400));
        }

        // Check if there's already an active login OTP
        const existing = otpStorage.get(normalizedEmail);
        if (existing && existing.type === 'login' && new Date() < existing.expiresAt && !existing.isUsed) {
            const timeLeft = Math.ceil((existing.expiresAt - new Date()) / 1000 / 60);
            return res.json({
                success: false,
                message: `An OTP is already active for login. Please check your ${isIITPEmail(normalizedEmail) ? 'Outlook' : 'email'} inbox.`,
                timeLeft: timeLeft
            });
        }

        // Generate OTP
        const otp = generateOTP(6);
        storeLoginOTP(normalizedEmail, otp);

        // Send OTP email
        const emailResult = await sendOTPEmail(normalizedEmail, otp, 'login', {
            fullname: user.fullname,
            email: user.email
        });

        if (!emailResult.success) {
            return next(new ErrorHandler("Failed to send login verification email", 500));
        }


        res.status(200).json({
            success: true,
            message: "Login verification code sent to your email",
            email: normalizedEmail,
            transporterUsed: emailResult.transporterUsed
        });

    } catch (error) {
        console.error("Send login OTP Error:", error);
        return next(new ErrorHandler(error.message, 500));
    }
});

// Regular login (with password)
export const login = CatchAsyncErrror(async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return next(new ErrorHandler("Email and password are required", 400));
        }

        const normalizedEmail = email.toLowerCase().trim();

        // Find user with password field
        const user = await User.findOne({ email: normalizedEmail }).select("+password");
        if (!user) {
            return next(new ErrorHandler("Invalid email or password", 401));
        }


        // Check password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return next(new ErrorHandler("Invalid email or password", 401));
        }

        // Generate tokens
        const accessToken = jwt.sign(
            { userId: user._id },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: '15m' }
        );

        const refreshToken = jwt.sign(
            { userId: user._id },
            process.env.REFRESH_TOKEN_SECRET,
            { expiresIn: '7d' }
        );

        // Save refresh token
        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        const userResponse = {
            _id: user._id,
            username: user.username,
            email: user.email,
            fullname: user.fullname,
            role: user.role,
            isEmailVerified: user.isEmailVerified,
            collegeName: user.collegeName,
            rollNo: user.rollNo,
            isIITPStud: user.isIITPStud,
            score: user.score
        };

        console.log(`User logged in successfully: ${user.email}`);

        res.status(200)
            .cookie("accessToken", accessToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                maxAge: 15 * 60 * 1000
            })
            .cookie("refreshToken", refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                maxAge: 7 * 24 * 60 * 60 * 1000
            })
            .json({
                success: true,
                message: user.isIITPStud ? "Welcome back, IITP student!" : "Login successful",
                user: userResponse,
                accessToken
            });

    } catch (error) {
        console.error("Login Error:", error);
        return next(new ErrorHandler(error.message, 500));
    }
});

// Login with OTP (passwordless login)
export const loginWithOTP = CatchAsyncErrror(async (req, res, next) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return next(new ErrorHandler("Email and OTP are required", 400));
        }

        const normalizedEmail = email.toLowerCase().trim();
        const storedData = otpStorage.get(normalizedEmail);

        if (!storedData || storedData.type !== 'login') {
            return next(new ErrorHandler("No login OTP found for this email", 400));
        }

        if (storedData.isUsed) {
            return next(new ErrorHandler("This OTP has already been used", 400));
        }

        if (new Date() > storedData.expiresAt) {
            otpStorage.delete(normalizedEmail);
            return next(new ErrorHandler("OTP has expired", 400));
        }

        storedData.attempts = (storedData.attempts || 0) + 1;

        if (storedData.attempts > 3) {
            otpStorage.delete(normalizedEmail);
            return next(new ErrorHandler("Too many failed attempts", 400));
        }

        if (storedData.otp !== otp) {
            otpStorage.set(normalizedEmail, storedData);
            return next(new ErrorHandler(`Invalid OTP. ${4 - storedData.attempts} attempts remaining`, 400));
        }

        // Find user
        const user = await User.findOne({ email: normalizedEmail });
        if (!user) {
            return next(new ErrorHandler("User not found", 404));
        }

        // Mark OTP as used
        storedData.isUsed = true;
        otpStorage.set(normalizedEmail, storedData);

        // Generate tokens
        const accessToken = jwt.sign(
            { userId: user._id },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: '15m' }
        );

        const refreshToken = jwt.sign(
            { userId: user._id },
            process.env.REFRESH_TOKEN_SECRET,
            { expiresIn: '7d' }
        );

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        // Clean up OTP storage
        setTimeout(() => otpStorage.delete(normalizedEmail), 60000);

        const userResponse = {
            _id: user._id,
            username: user.username,
            email: user.email,
            fullname: user.fullname,
            role: user.role,
            isEmailVerified: user.isEmailVerified,
            collegeName: user.collegeName,
            rollNo: user.rollNo,
            isIITPStud: user.isIITPStud,
            score: user.score
        };

        console.log(`User logged in with OTP: ${user.email} `);

        res.status(200)
            .cookie("accessToken", accessToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                maxAge: 15 * 60 * 1000
            })
            .cookie("refreshToken", refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                maxAge: 7 * 24 * 60 * 60 * 1000
            })
            .json({
                success: true,
                message: "Login successful with OTP",
                user: userResponse,
                accessToken
            });

    } catch (error) {
        console.error("Login with OTP Error:", error);
        return next(new ErrorHandler(error.message, 500));
    }
});

// Logout
export const logout = CatchAsyncErrror(async (req, res, next) => {
    try {
        const userId = req.user?._id;

        await User.findByIdAndUpdate(userId, {
            refreshToken: undefined
        });

        res.status(200)
            .clearCookie("accessToken")
            .clearCookie("refreshToken")
            .json({
                success: true,
                message: "Logged out successfully"
            });

    } catch (error) {
        return next(new ErrorHandler(error.message, 500));
    }
});

// Resend OTP (for both signup and login)
export const resendOTP = CatchAsyncErrror(async (req, res, next) => {
    try {
        const { email, type } = req.body; // type: 'signup' or 'login'

        if (!email || !type) {
            return next(new ErrorHandler("Email and type are required", 400));
        }

        const normalizedEmail = email.toLowerCase().trim();

        // Remove existing OTP
        otpStorage.delete(normalizedEmail);

        if (type === 'signup') {
            // For signup, we need the original signup data
            // In a real app, you might want to store this in database temporarily
            return next(new ErrorHandler("Please restart the signup process", 400));
        } else if (type === 'login') {
            // Resend login OTP
            req.body.email = normalizedEmail; // Use normalized email
            return await sendLoginOTP(req, res, next);
        }
        
        return next(new ErrorHandler("Invalid OTP type", 400));
        
    } catch (error) {
        return next(new ErrorHandler(error.message, 500));
    }
});



const client = new OAuth2Client({
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_CALLBACK_URL
});


export const googleLogin = CatchAsyncErrror(async (req, res, next) => {
    try {
        const { credential } = req.body;
        
        if (!credential) {
            return next(new ErrorHandler("Google credential is required", 400));
        }

        const ticket = await client.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID
        });
        
        
        const payload = ticket.getPayload();
        
        if (!payload) {
            return next(new ErrorHandler("Invalid Google token", 400));
        }

        const { email, name, email_verified, picture } = payload;
        
        if (!email_verified) {
            return next(new ErrorHandler("Please use a verified Google account", 400));
        }

        let user = await User.findOne({ email: email.toLowerCase() });
        
        if (!user) {
            // Generate unique username
            let baseUsername = name.replace(/\s+/g, '').toLowerCase();
            let username = baseUsername;
            let counter = 1;
            const tempPassword = crypto.randomBytes(8).toString('hex');
            const hashedPassword = await bcrypt.hash(tempPassword, Number(process.env.SALT_ROUNDS) || 12);

            
            // Check if username exists and create unique one
            while (await User.findOne({ username })) {
                username = `${baseUsername}${counter}`;
                counter++;
            }


            user = await User.create({
                username,
                email: email.toLowerCase(),
                fullname: name,
                isEmailVerified: true, 
                role: "user",
                password: hashedPassword,
                authProvider: 'google',
                googleId: payload.sub
            });

            // await sendEmail({
            //          to: email,
            //         subject: "Your Temporary Password",
            //         html: `<p>Hello ${name},</p>
            //         <p>We’ve created a temporary password for your account:</p>
            //         <p><b>${tempPassword}</b></p>
            //         <p>Please log in and change it as soon as possible.</p>`,
            //         settings: { siteName: "Infinito" }
            // });

            await sendEmail({
                to: email,
                subject: "Google Login OTP",
                template: "googleOtp",
                data: {
                    name,
                    tempPassword,
                    settings: { siteName: "Infinito" }
                }
            });



            console.log(`New Google user created: ${email} `);
        }else {
            if (!user.googleId) {
                user.googleId = payload.sub;
                user.authProvider = user.authProvider || 'google';
                await user.save({ validateBeforeSave: false });
            }
            
            console.log(`Existing Google user logged in: ${email}`);
        }

        const accessToken = jwt.sign(
            { userId: user._id },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: "15m" }
        );

        const refreshToken = jwt.sign(
            { userId: user._id },
            process.env.REFRESH_TOKEN_SECRET,
            { expiresIn: "7d" }
        );

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        const userResponse = {
            _id: user._id,
            username: user.username,
            email: user.email,
            fullname: user.fullname,
            role: user.role,
            isEmailVerified: user.isEmailVerified,
        };

        const welcomeMessage ="Google login successful";

        res.status(200)
            .cookie("accessToken", accessToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                maxAge: 15 * 60 * 1000 // 15 minutes
            })
            .cookie("refreshToken", refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
            })
            .json({
                success: true,
                message: welcomeMessage,
                user: userResponse,
                accessToken
            });

    } catch (error) {
        console.error("Google login error:", error);
        if (error.message.includes('Token used too early')) {
            return next(new ErrorHandler("Invalid Google token timing", 400));
        }
        if (error.message.includes('Invalid token')) {
            return next(new ErrorHandler("Invalid Google token", 400));
        }
        return next(new ErrorHandler(error.message || "Google authentication failed", 500));
    }
});