import nodemailer from "nodemailer";
import logger from "./logger";

// Email configuration
const EMAIL_HOST = process.env.EMAIL_HOST || "smtp.gmail.com";
const EMAIL_PORT = parseInt(process.env.EMAIL_PORT || "587");
const EMAIL_USER = process.env.EMAIL_USER || "your-email@gmail.com";
const EMAIL_PASS = process.env.EMAIL_PASS || "your-app-password";
const EMAIL_FROM =
  process.env.EMAIL_FROM || "My Laundry App <noreply@mylaundry.com>";
const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

// Create nodemailer transporter
const transporter = nodemailer.createTransport({
  host: EMAIL_HOST,
  port: EMAIL_PORT,
  secure: false, // true for 465, false for other ports
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS,
  },
});

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

/**
 * Send email with retry logic
 */
export async function sendEmail(
  to: string,
  template: EmailTemplate,
  retries = 3
): Promise<boolean> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const info = await transporter.sendMail({
        from: EMAIL_FROM,
        to,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });

      logger.info("Email sent successfully", {
        to,
        subject: template.subject,
        messageId: info.messageId,
        attempt,
      });

      return true;
    } catch (error) {
      logger.error("Failed to send email", {
        to,
        subject: template.subject,
        attempt,
        error: error instanceof Error ? error.message : "Unknown error",
      });

      if (attempt === retries) {
        throw error;
      }

      // Wait before retry (exponential backoff)
      await new Promise(resolve =>
        setTimeout(resolve, Math.pow(2, attempt) * 1000)
      );
    }
  }

  return false;
}

/**
 * Generate email verification template
 */
export function generateEmailVerificationTemplate(
  firstName: string,
  verificationToken: string
): EmailTemplate {
  const verificationUrl = `${BASE_URL}/verify-email?token=${verificationToken}`;

  const subject = "Verify Your Email - My Laundry App";

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background-color: #3b82f6;
          color: white;
          padding: 30px;
          text-align: center;
          border-radius: 8px 8px 0 0;
        }
        .content {
          background-color: white;
          padding: 30px;
          border: 1px solid #e5e7eb;
          border-top: none;
        }
        .button {
          display: inline-block;
          background-color: #3b82f6;
          color: white;
          padding: 12px 24px;
          text-decoration: none;
          border-radius: 6px;
          font-weight: 500;
          margin: 20px 0;
        }
        .footer {
          background-color: #f9fafb;
          padding: 20px;
          text-align: center;
          border: 1px solid #e5e7eb;
          border-top: none;
          border-radius: 0 0 8px 8px;
          font-size: 14px;
          color: #6b7280;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Welcome to My Laundry App!</h1>
      </div>
      
      <div class="content">
        <h2>Hi ${firstName},</h2>
        
        <p>Thank you for signing up for My Laundry App! To complete your registration and start managing your laundry schedule, please verify your email address.</p>
        
        <p>Click the button below to verify your email:</p>
        
        <a href="${verificationUrl}" class="button">Verify Email Address</a>
        
        <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
        <p><a href="${verificationUrl}">${verificationUrl}</a></p>
        
        <p>This verification link will expire in 24 hours. If you didn't create an account with us, please ignore this email.</p>
        
        <p>Best regards,<br>The My Laundry App Team</p>
      </div>
      
      <div class="footer">
        <p>My Laundry App | Simplifying your laundry schedule</p>
      </div>
    </body>
    </html>
  `;

  const text = `
    Welcome to My Laundry App!
    
    Hi ${firstName},
    
    Thank you for signing up for My Laundry App! To complete your registration and start managing your laundry schedule, please verify your email address.
    
    Click this link to verify your email: ${verificationUrl}
    
    This verification link will expire in 24 hours. If you didn't create an account with us, please ignore this email.
    
    Best regards,
    The My Laundry App Team
  `;

  return { subject, html, text };
}

/**
 * Generate password reset template
 */
export function generatePasswordResetTemplate(
  firstName: string,
  resetToken: string
): EmailTemplate {
  const resetUrl = `${BASE_URL}/reset-password?token=${resetToken}`;

  const subject = "Reset Your Password - My Laundry App";

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background-color: #dc2626;
          color: white;
          padding: 30px;
          text-align: center;
          border-radius: 8px 8px 0 0;
        }
        .content {
          background-color: white;
          padding: 30px;
          border: 1px solid #e5e7eb;
          border-top: none;
        }
        .button {
          display: inline-block;
          background-color: #dc2626;
          color: white;
          padding: 12px 24px;
          text-decoration: none;
          border-radius: 6px;
          font-weight: 500;
          margin: 20px 0;
        }
        .footer {
          background-color: #f9fafb;
          padding: 20px;
          text-align: center;
          border: 1px solid #e5e7eb;
          border-top: none;
          border-radius: 0 0 8px 8px;
          font-size: 14px;
          color: #6b7280;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Password Reset Request</h1>
      </div>
      
      <div class="content">
        <h2>Hi ${firstName},</h2>
        
        <p>We received a request to reset your password for your My Laundry App account.</p>
        
        <p>Click the button below to reset your password:</p>
        
        <a href="${resetUrl}" class="button">Reset Password</a>
        
        <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
        
        <p>This password reset link will expire in 1 hour. If you didn't request a password reset, please ignore this email and your password will remain unchanged.</p>
        
        <p>Best regards,<br>The My Laundry App Team</p>
      </div>
      
      <div class="footer">
        <p>My Laundry App | Simplifying your laundry schedule</p>
      </div>
    </body>
    </html>
  `;

  const text = `
    Password Reset Request
    
    Hi ${firstName},
    
    We received a request to reset your password for your My Laundry App account.
    
    Click this link to reset your password: ${resetUrl}
    
    This password reset link will expire in 1 hour. If you didn't request a password reset, please ignore this email and your password will remain unchanged.
    
    Best regards,
    The My Laundry App Team
  `;

  return { subject, html, text };
}

/**
 * Generate reservation confirmation template
 */
export function generateReservationConfirmationTemplate(
  firstName: string,
  machineType: string,
  machineName: string,
  startTime: Date,
  endTime: Date
): EmailTemplate {
  const subject = `Reservation Confirmed - ${machineName}`;

  const formatTime = (date: Date) => {
    return date.toLocaleString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background-color: #10b981;
          color: white;
          padding: 30px;
          text-align: center;
          border-radius: 8px 8px 0 0;
        }
        .content {
          background-color: white;
          padding: 30px;
          border: 1px solid #e5e7eb;
          border-top: none;
        }
        .reservation-details {
          background-color: #f0f9ff;
          padding: 20px;
          border-radius: 6px;
          margin: 20px 0;
        }
        .footer {
          background-color: #f9fafb;
          padding: 20px;
          text-align: center;
          border: 1px solid #e5e7eb;
          border-top: none;
          border-radius: 0 0 8px 8px;
          font-size: 14px;
          color: #6b7280;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Reservation Confirmed!</h1>
      </div>
      
      <div class="content">
        <h2>Hi ${firstName},</h2>
        
        <p>Your laundry reservation has been confirmed. Here are the details:</p>
        
        <div class="reservation-details">
          <h3>Reservation Details</h3>
          <p><strong>Machine:</strong> ${machineName} (${machineType})</p>
          <p><strong>Start Time:</strong> ${formatTime(startTime)}</p>
          <p><strong>End Time:</strong> ${formatTime(endTime)}</p>
        </div>
        
        <p>We'll send you a reminder 15 minutes before your reservation starts, and another notification when your cycle is complete.</p>
        
        <p>If you need to cancel or modify your reservation, please log into your account.</p>
        
        <p>Best regards,<br>The My Laundry App Team</p>
      </div>
      
      <div class="footer">
        <p>My Laundry App | Simplifying your laundry schedule</p>
      </div>
    </body>
    </html>
  `;

  const text = `
    Reservation Confirmed!
    
    Hi ${firstName},
    
    Your laundry reservation has been confirmed. Here are the details:
    
    Machine: ${machineName} (${machineType})
    Start Time: ${formatTime(startTime)}
    End Time: ${formatTime(endTime)}
    
    We'll send you a reminder 15 minutes before your reservation starts, and another notification when your cycle is complete.
    
    If you need to cancel or modify your reservation, please log into your account.
    
    Best regards,
    The My Laundry App Team
  `;

  return { subject, html, text };
}

/**
 * Send email verification
 */
export async function sendEmailVerification(
  email: string,
  firstName: string,
  verificationToken: string
) {
  const template = generateEmailVerificationTemplate(
    firstName,
    verificationToken
  );
  return sendEmail(email, template);
}

/**
 * Send password reset email
 */
export async function sendPasswordReset(
  email: string,
  firstName: string,
  resetToken: string
) {
  const template = generatePasswordResetTemplate(firstName, resetToken);
  return sendEmail(email, template);
}

/**
 * Send reservation confirmation email
 */
export async function sendReservationConfirmation(
  email: string,
  firstName: string,
  machineType: string,
  machineName: string,
  startTime: Date,
  endTime: Date
) {
  const template = generateReservationConfirmationTemplate(
    firstName,
    machineType,
    machineName,
    startTime,
    endTime
  );
  return sendEmail(email, template);
}
