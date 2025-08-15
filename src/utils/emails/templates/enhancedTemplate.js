import { isIITPEmail } from "../utils.js";

export const getEnhancedOTPTemplate = (otp, type, { fullname = "User", email }) => {
  const isIITP = isIITPEmail(email);
  const color = isIITP ? "#1e3c72" : "#667eea";
  const subject = type === "signup"
    ? (isIITP ? "Welcome to IITP Community" : "Welcome! Verify Your Account")
    : (isIITP ? "IITP Community - Secure Login" : "Login Verification Code");

  return {
    subject,
    html: `
      <html>
      <head>
        <style>
          .otp { font-size: 36px; font-weight: bold; color: ${color}; }
        </style>
      </head>
      <body>
        <h1>${subject}</h1>
        <p>Hello ${fullname},</p>
        <p>Your ${type} code is:</p>
        <div class="otp">${otp}</div>
        <p>Expires in 10 minutes.</p>
      </body>
      </html>
    `
  };
};
