import nodemailer from "nodemailer";
import ejs from "ejs";
import path from "path";
import { fileURLToPath } from 'url';
import fs from 'fs';
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Check if email is from IITP domain
export const isIITPEmail = (email) => {
    return email && email.toLowerCase().endsWith('@iitp.ac.in');
};

// Gmail transporter setup
const gmailTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USERNAME,
        pass: process.env.GMAIL_PASSWORD
    }
});

// Outlook transporter setup for IITP emails
const outlookTransporter = nodemailer.createTransport({
    service: 'outlook',  // Change this from detailed config to simple 'outlook'
    auth: {
        user: process.env.OUTLOOK_USERNAME,
        pass: process.env.OUTLOOK_PASSWORD
    }
});

// Alternative Outlook configuration using service
const outlookServiceTransporter = nodemailer.createTransport({
    service: 'hotmail', // or 'outlook'
    auth: {
        user: process.env.OUTLOOK_USERNAME,
        pass: process.env.OUTLOOK_PASSWORD
    }
});

// Get appropriate transporter based on recipient email
const getTransporter = (recipientEmail) => {
    if (isIITPEmail(recipientEmail)) {
        console.log('Using Outlook transporter for IITP email:', recipientEmail);
        return outlookTransporter; 
    } else {
        console.log('Using Gmail transporter for regular email:', recipientEmail);
        return gmailTransporter;
    }
};

// Get sender info based on recipient
const getSenderInfo = (recipientEmail) => {
    if (isIITPEmail(recipientEmail)) {
        return {
            name: 'IITP Community Platform',
            address: process.env.OUTLOOK_USERNAME || process.env.GMAIL_USERNAME
        };
    } else {
        return {
            name: process.env.COMPANY_NAME || 'Community Platform',
            address: process.env.GMAIL_USERNAME
        };
    }
};

// Verify transporters on startup
gmailTransporter.verify((error, success) => {
    if (error) {
        console.log('Gmail transporter verification failed:', error.message);
    } else {
        console.log('Gmail email server is ready to send messages');
    }
});

outlookTransporter.verify((error, success) => {
    if (error) {
        console.log('Outlook transporter verification failed:', error.message);
        console.log('Make sure OUTLOOK_USERNAME and OUTLOOK_PASSWORD are set in environment variables');
    } else {
        console.log('Outlook email server is ready to send messages');
    }
});

// Enhanced OTP email templates
const getEnhancedOTPTemplate = (otp, type, userData = {}) => {
    const { fullname = 'User', email } = userData;
    const isIITP = isIITPEmail(email);
    
    const commonStyle = `
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 0; background: #f4f4f4; }
        .container { background: white; margin: 20px auto; border-radius: 10px; overflow: hidden; box-shadow: 0 0 20px rgba(0,0,0,0.1); }
        .header { background: ${isIITP ? 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'}; color: white; padding: 40px 30px; text-align: center; }
        .logo { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
        .content { padding: 40px 30px; background: white; }
        .otp-section { background: #f8f9fa; border: 2px dashed ${isIITP ? '#1e3c72' : '#667eea'}; border-radius: 10px; padding: 30px; text-align: center; margin: 30px 0; }
        .otp-label { font-size: 16px; color: #666; margin-bottom: 15px; }
        .otp-code { font-size: 36px; font-weight: bold; color: ${isIITP ? '#1e3c72' : '#667eea'}; letter-spacing: 8px; font-family: 'Courier New', monospace; margin: 10px 0; }
        .otp-expire { font-size: 14px; color: #888; margin-top: 15px; }
        .iitp-badge { background: linear-gradient(135deg, #28a745, #20c997); color: white; padding: 8px 20px; border-radius: 25px; font-size: 14px; font-weight: bold; margin: 15px 0; display: inline-block; }
        .warning-box { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 25px 0; border-radius: 5px; }
        .info-box { background: #e7f3ff; border-left: 4px solid #007bff; padding: 15px; margin: 25px 0; border-radius: 5px; }
        .footer { background: #f8f9fa; padding: 30px; text-align: center; color: #666; font-size: 14px; border-top: 1px solid #eee; }
        .social-links { margin: 20px 0; }
        .social-links a { text-decoration: none; margin: 0 10px; color: #666; }
        .highlight { color: ${isIITP ? '#1e3c72' : '#667eea'}; font-weight: bold; }
    `;

    let subject, headerTitle, mainMessage, specificContent;

    if (type === 'signup') {
        subject = isIITP ? '🎓 Welcome to IITP Community - Verify Your Student Account' : '✨ Welcome! Verify Your Account';
        headerTitle = isIITP ? '🏛️ IITP Community' : '🚀 Welcome!';
        mainMessage = isIITP 
            ? `Hello ${fullname}! Welcome to the official IIT Patna community platform.`
            : `Hello ${fullname}! Welcome to our community platform.`;
        
        specificContent = isIITP ? `
            <div class="iitp-badge">🎓 IIT Patna Student Verification</div>
            <div class="info-box">
                <h4>🏛️ IITP Student Benefits</h4>
                <p>Since you're using an official IITP email address, your account will be automatically verified as an <strong>IIT Patna student</strong> upon email confirmation. This gives you access to:</p>
                <ul style="text-align: left; margin: 10px 0;">
                    <li>🎯 Exclusive student resources and materials</li>
                    <li>🤝 IITP alumni network access</li>
                    <li>📚 Academic collaboration tools</li>
                    <li>🏆 Student competitions and events</li>
                </ul>
            </div>
        ` : `
            <div class="info-box">
                <h4>🌟 Getting Started</h4>
                <p>Once your email is verified, you'll have access to all platform features and can start connecting with our community!</p>
            </div>
        `;
    } else if (type === 'login') {
        subject = isIITP ? '🔐 IITP Community - Secure Login Verification' : '🔐 Login Verification Code';
        headerTitle = isIITP ? '🏛️ IITP Login' : '🔐 Secure Login';
        mainMessage = `Hello ${fullname}! A login attempt was made to your account.`;
        
        specificContent = isIITP ? `
            <div class="iitp-badge">🎓 IITP Student Login</div>
            <div class="warning-box">
                <h4>🛡️ Security Notice</h4>
                <p>This login attempt is for your <strong>IIT Patna student account</strong>. If this wasn't you, please secure your account immediately and contact IT support.</p>
            </div>
        ` : `
            <div class="warning-box">
                <h4>🛡️ Security Notice</h4>
                <p>If you didn't attempt to log in, please secure your account immediately.</p>
            </div>
        `;
    }

    return {
        subject,
        html: `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${subject}</title>
                <style>${commonStyle}</style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <div class="logo">${headerTitle}</div>
                        <p style="margin: 0; opacity: 0.9;">${mainMessage}</p>
                    </div>
                    
                    <div class="content">
                        ${specificContent}
                        
                        <div class="otp-section">
                            <div class="otp-label">Your ${type === 'signup' ? 'verification' : 'login'} code is:</div>
                            <div class="otp-code">${otp}</div>
                            <div class="otp-expire">⏰ Expires in <span class="highlight">10 minutes</span></div>
                        </div>

                        <div style="text-align: center; margin: 30px 0;">
                            <p style="margin: 0; color: #666;">Enter this code in the ${type === 'signup' ? 'signup' : 'login'} form to ${type === 'signup' ? 'complete your registration' : 'access your account'}.</p>
                        </div>

                        <div class="warning-box">
                            <strong>🔒 Security Tips:</strong>
                            <ul style="margin: 10px 0; text-align: left;">
                                <li>Never share this code with anyone</li>
                                <li>Our team will never ask for your verification code</li>
                                <li>This code expires automatically after 10 minutes</li>
                            </ul>
                        </div>
                    </div>

                    <div class="footer">
                        <p><strong>${isIITP ? 'IITP Community Platform' : 'Community Platform'}</strong></p>
                        <p>This is an automated message from our secure authentication system.</p>
                        ${isIITP ? '<p>🏛️ Official IIT Patna Community Platform</p>' : ''}
                        <p style="font-size: 12px; margin-top: 20px;">
                            If you didn't request this ${type === 'signup' ? 'verification' : 'login'}, please ignore this email.
                        </p>
                        <div class="social-links">
                            <p>&copy; ${new Date().getFullYear()} ${isIITP ? 'IIT Patna Community' : 'Community Platform'}. All rights reserved.</p>
                        </div>
                    </div>
                </div>
            </body>
            </html>
        `
    };
};

// Function to send OTP email with EJS template or fallback
export const sendOTPEmail = async (email, otp, type = 'signup', userData = {}) => {
    try {
        console.log(`Attempting to send ${type} OTP to ${email} `);
        
        // Get appropriate transporter and sender info
        const transporter = getTransporter(email);
        const senderInfo = getSenderInfo(email);
        
        // Determine template and subject based on type
        let templateName, emailContent;
        
        switch (type) {
            case 'signup':
                templateName = 'signup-otp.ejs';
                break;
            case 'login':
                templateName = 'login-otp.ejs';
                break;
            case 'password-reset':
                templateName = 'password-reset-otp.ejs';
                break;
            default:
                templateName = 'general-otp.ejs';
        }

        // Template path
        const templatePath = path.join(__dirname, '..', 'views', 'emails', templateName);
        
        // Try to use EJS template first, fallback to enhanced HTML template
        if (fs.existsSync(templatePath)) {
            console.log(`Using EJS template: ${templateName}`);
            
            const emailData = {
                otp,
                email,
                fullname: userData.fullname || 'User',
                type,
                isIITPEmail: isIITPEmail(email),
                expirationTime: '10',
                currentYear: new Date().getFullYear(),
                supportEmail: process.env.SUPPORT_EMAIL || (isIITPEmail(email) ? process.env.OUTLOOK_USERNAME : process.env.GMAIL_USERNAME),
                companyName: isIITPEmail(email) ? 'IITP Community' : (process.env.COMPANY_NAME || 'Community Platform'),
                websiteUrl: process.env.WEBSITE_URL || 'http://localhost:3000'
            };

            emailContent = {
                subject: isIITPEmail(email) ? `🎓 IITP - ${type.charAt(0).toUpperCase() + type.slice(1)} Verification` : `${type.charAt(0).toUpperCase() + type.slice(1)} Verification`,
                html: await ejs.renderFile(templatePath, emailData)
            };
        } else {
            console.log(`Using enhanced HTML template (EJS not found)`);
            emailContent = getEnhancedOTPTemplate(otp, type, { ...userData, email });
        }

        // Email options
        const mailOptions = {
            from: senderInfo,
            to: email,
            subject: emailContent.subject,
            html: emailContent.html,
            text: `Your ${type} verification code is: ${otp}. This code will expire in 10 minutes. ${isIITPEmail(email) ? '(IITP Student Account)' : ''}`
        };

        // Send email
        console.log(`Sending email using ${isIITPEmail(email) ? 'Outlook' : 'Gmail'} transporter...`);
        const info = await transporter.sendMail(mailOptions);
        
        console.log(`${type.toUpperCase()} OTP email sent successfully to ${email}:`, info.messageId);
        
        return {
            success: true,
            message: `${type} OTP sent successfully`,
            messageId: info.messageId,
            isIITPEmail: isIITPEmail(email),
            transporterUsed: isIITPEmail(email) ? 'Outlook' : 'Gmail'
        };

    } catch (error) {
        console.error(`Error sending ${type} OTP email to ${email}:`, error);
        
        return {
            success: false,
            message: `Failed to send ${type} OTP email`,
            error: error.message,
            isIITPEmail: isIITPEmail(email)
        };
    }
};

// Function to send welcome email after successful signup
export const sendWelcomeEmail = async (email, userData) => {
    try {
        const isIITP = isIITPEmail(email);
        const transporter = getTransporter(email);
        const senderInfo = getSenderInfo(email);
        
        const welcomeHTML = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: ${isIITP ? 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'}; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                    .iitp-badge { background: #28a745; color: white; padding: 10px 20px; border-radius: 25px; font-size: 14px; margin: 15px 0; display: inline-block; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>🎉 Welcome${isIITP ? ' to IITP Community' : ''}!</h1>
                    <p>Hello, ${userData.fullname}!</p>
                    ${isIITP ? '<div class="iitp-badge">🎓 IIT Patna Student Verified</div>' : ''}
                </div>
                <div class="content">
                    <p>Your account has been successfully created and verified!</p>
                    ${isIITP ? '<p>🏛️ <strong>Congratulations!</strong> Your IIT Patna student status has been automatically confirmed.</p>' : ''}
                    <p>You can now access your dashboard and start participating in community activities.</p>
                    <p>Thank you for joining us!</p>
                </div>
            </body>
            </html>
        `;

        const mailOptions = {
            from: senderInfo,
            to: email,
            subject: isIITP ? '🎓 Welcome to IITP Community - Student Account Activated!' : '🎉 Welcome to Our Community!',
            html: welcomeHTML
        };

        const info = await transporter.sendMail(mailOptions);
        
        console.log(`Welcome email sent to ${email}:`, info.messageId);
        
        return {
            success: true,
            message: 'Welcome email sent successfully',
            messageId: info.messageId
        };

    } catch (error) {
        console.error('Error sending welcome email:', error);
        return {
            success: false,
            message: 'Failed to send welcome email',
            error: error.message
        };
    }
};

// Function to send password reset OTP
export const sendPasswordResetOTP = async (email, otp, userData = {}) => {
    return await sendOTPEmail(email, otp, 'password-reset', userData);
};

// Test email function
export const sendTestEmail = async (email) => {
    try {
        const isIITP = isIITPEmail(email);
        const transporter = getTransporter(email);
        const senderInfo = getSenderInfo(email);
        
        const testOTP = '123456';
        
        const mailOptions = {
            from: senderInfo,
            to: email,
            subject: `Test Email - ${isIITP ? 'IITP Community' : 'Community Platform'}`,
            html: `
                <h2>🧪 Test Email ${isIITP ? '(IITP)' : ''}</h2>
                <p>This is a test email to verify that the email service is working correctly.</p>
                ${isIITP ? '<p>🎓 <strong>IITP Email Detected:</strong> Using Outlook transporter</p>' : '<p>📧 <strong>Regular Email:</strong> Using Gmail transporter</p>'}
                <p><strong>Test OTP:</strong> ${testOTP}</p>
                <p>If you received this email, the configuration is successful!</p>
                <p><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
                <p><strong>Transporter:</strong> ${isIITP ? 'Microsoft Outlook' : 'Gmail'}</p>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        
        console.log(`Test email sent to ${email} using ${isIITP ? 'Outlook' : 'Gmail'}:`, info.messageId);
        
        return {
            success: true,
            message: `Test email sent successfully using ${isIITP ? 'Outlook' : 'Gmail'} transporter`,
            messageId: info.messageId,
            isIITPEmail: isIITP,
            transporterUsed: isIITP ? 'Outlook' : 'Gmail'
        };

    } catch (error) {
        console.error('Error sending test email:', error);
        return {
            success: false,
            message: 'Failed to send test email',
            error: error.message,
            isIITPEmail: isIITPEmail(email)
        };
    }
};