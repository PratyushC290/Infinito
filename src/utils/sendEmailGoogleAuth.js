import nodemailer from 'nodemailer';
import ejs from 'ejs';
import path from 'path';

export const sendEmail = async ({ to, subject, template, data }) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USERNAME,
      pass: process.env.GMAIL_PASSWORD
    }
  });

  // Render the EJS template
  const templatePath = path.join(process.cwd(), 'views', 'email', `${template}.ejs`);
  const html = await ejs.renderFile(templatePath, data);

  await transporter.sendMail({
    from: `"Infinito" <${process.env.GMAIL_USERNAME}>`,
    to,
    subject,
    html
  });
};