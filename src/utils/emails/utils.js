import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
export const __dirname = path.dirname(__filename);

export const isIITPEmail = (email) =>
  email && email.toLowerCase().endsWith("@iitp.ac.in");

export const getSenderInfo = (recipientEmail, config) => {
  if (isIITPEmail(recipientEmail)) {
    return {
      name: "IITP Community Platform",
      address: config.OUTLOOK_USERNAME || config.GMAIL_USERNAME
    };
  }
  return {
    name: config.COMPANY_NAME || "Community Platform",
    address: config.GMAIL_USERNAME
  };
};
