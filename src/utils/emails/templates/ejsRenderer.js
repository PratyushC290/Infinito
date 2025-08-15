import ejs from "ejs";
import fs from "fs";
import path from "path";
import { __dirname, isIITPEmail } from "../utils.js";

export const renderEJSTemplate = async (templateName, data) => {
  const templatePath = path.join(__dirname, "..", "views", "emails", templateName);
  if (!fs.existsSync(templatePath)) return null;

  return {
    html: await ejs.renderFile(templatePath, data),
    subject: isIITPEmail(data.email)
      ? `IITP - ${data.type} Verification`
      : `${data.type} Verification`
  };
};
