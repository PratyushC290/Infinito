import dotenv from "dotenv";
import { gmailTransporter, outlookTransporter, verifyTransporters } from "./transporters.js";
import { getEnhancedOTPTemplate } from "./templates/enhancedTemplate.js";
import { renderEJSTemplate } from "./templates/ejsRenderer.js";
import { getSenderInfo, isIITPEmail } from "./utils.js";

dotenv.config();
verifyTransporters();

const getTransporter = (email) => (isIITPEmail(email) ? outlookTransporter : gmailTransporter);

export const sendOTPEmail = async (email, otp, type = "signup", userData = {}) => {
  try {
    const transporter = getTransporter(email);
    const senderInfo = getSenderInfo(email, process.env);

    const ejsContent = await renderEJSTemplate(`${type}-otp.ejs`, {
      ...userData,
      email,
      otp,
      type
    });

    const emailContent = ejsContent || getEnhancedOTPTemplate(otp, type, { ...userData, email });

    const info = await transporter.sendMail({
      from: "Team Infinito 2025 <no-reply@infinito2025.com>",
      to: email,
      subject: emailContent.subject,
      html: emailContent.html
    });

    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error(err);
    return { success: false, error: err.message };
  }
};

export const sendWelcomeEmail = async (email, userData) => {
  const transporter = getTransporter(email);
  const senderInfo = getSenderInfo(email, process.env);

  const html = `<h1>Welcome, ${userData.fullname}</h1>`;
  await transporter.sendMail({ from: senderInfo, to: email, subject: "🎉 Welcome!", html });
};
