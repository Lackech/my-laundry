import { db } from "./db.server";
import {
  sendEmail,
  generateReservationConfirmationTemplate,
} from "./email.server";
import logger from "./logger";

export interface CreateNotificationData {
  userId: string;
  reservationId?: string;
  queueEntryId?: string;
  type:
    | "RESERVATION_CONFIRMED"
    | "RESERVATION_REMINDER"
    | "RESERVATION_CANCELLED"
    | "CYCLE_COMPLETE"
    | "QUEUE_POSITION_UPDATED"
    | "MACHINE_AVAILABLE"
    | "MAINTENANCE_SCHEDULED"
    | "SYSTEM_ANNOUNCEMENT";
  title: string;
  message: string;
  recipientEmail?: string;
  recipientPhone?: string;
  deliveryMethod?: "EMAIL" | "SMS" | "PUSH" | "IN_APP";
}

/**
 * Create a new notification
 */
export async function createNotification(data: CreateNotificationData) {
  try {
    const notification = await db.notification.create({
      data: {
        userId: data.userId,
        reservationId: data.reservationId,
        queueEntryId: data.queueEntryId,
        type: data.type,
        title: data.title,
        message: data.message,
        recipientEmail: data.recipientEmail,
        recipientPhone: data.recipientPhone,
        deliveryMethod: data.deliveryMethod || "EMAIL",
        status: "PENDING",
        attempts: 0,
        maxAttempts: 3,
      },
    });

    logger.info("Notification created", {
      notificationId: notification.id,
      userId: data.userId,
      type: data.type,
      deliveryMethod: data.deliveryMethod || "EMAIL",
    });

    // Try to send immediately
    await processNotification(notification.id);

    return notification;
  } catch (error) {
    logger.error("Failed to create notification", {
      userId: data.userId,
      type: data.type,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}

/**
 * Process a notification (send it)
 */
export async function processNotification(notificationId: string) {
  try {
    const notification = await db.notification.findUnique({
      where: { id: notificationId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
            notificationPreferences: true,
          },
        },
        reservation: {
          include: {
            machine: {
              select: {
                name: true,
                type: true,
                location: true,
              },
            },
          },
        },
        queueEntry: {
          include: {
            machine: {
              select: {
                name: true,
                type: true,
                location: true,
              },
            },
          },
        },
      },
    });

    if (!notification) {
      throw new Error("Notification not found");
    }

    if (notification.status === "DELIVERED" || notification.status === "READ") {
      return notification;
    }

    // Check if user wants to receive notifications
    if (notification.user.notificationPreferences === "NONE") {
      await db.notification.update({
        where: { id: notificationId },
        data: { status: "DELIVERED", deliveredAt: new Date() },
      });
      return notification;
    }

    // Check if we've exceeded max attempts
    if (notification.attempts >= notification.maxAttempts) {
      await db.notification.update({
        where: { id: notificationId },
        data: { status: "FAILED" },
      });
      throw new Error("Max notification attempts exceeded");
    }

    // Send notification based on delivery method
    let sent = false;

    if (notification.deliveryMethod === "EMAIL") {
      sent = await sendEmailNotification(notification);
    } else if (notification.deliveryMethod === "SMS") {
      // TODO: Implement SMS sending
      sent = await sendSMSNotification(notification);
    } else if (notification.deliveryMethod === "PUSH") {
      // TODO: Implement push notification sending
      sent = await sendPushNotification(notification);
    }

    // Update notification status
    const updateData: any = {
      attempts: notification.attempts + 1,
      lastAttemptAt: new Date(),
    };

    if (sent) {
      updateData.status = "SENT";
      updateData.sentAt = new Date();
    } else {
      // Schedule retry
      const retryDelay = Math.pow(2, notification.attempts) * 5 * 60 * 1000; // Exponential backoff: 5, 10, 20 minutes
      updateData.nextRetryAt = new Date(Date.now() + retryDelay);
    }

    await db.notification.update({
      where: { id: notificationId },
      data: updateData,
    });

    logger.info("Notification processed", {
      notificationId,
      sent,
      attempts: notification.attempts + 1,
      nextRetryAt: updateData.nextRetryAt,
    });

    return notification;
  } catch (error) {
    logger.error("Failed to process notification", {
      notificationId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}

/**
 * Send email notification
 */
async function sendEmailNotification(notification: any): Promise<boolean> {
  try {
    const recipient = notification.recipientEmail || notification.user.email;

    if (!recipient) {
      logger.warn("No email recipient for notification", {
        notificationId: notification.id,
      });
      return false;
    }

    let template;

    if (
      notification.type === "RESERVATION_CONFIRMED" &&
      notification.reservation
    ) {
      template = generateReservationConfirmationTemplate(
        notification.user.firstName,
        notification.reservation.machine.type,
        notification.reservation.machine.name,
        notification.reservation.startTime,
        notification.reservation.endTime
      );
    } else {
      // Generic template
      template = {
        subject: notification.title,
        html: generateGenericEmailTemplate(
          notification.user.firstName,
          notification.title,
          notification.message
        ),
        text: `Hi ${notification.user.firstName},\n\n${notification.message}\n\nBest regards,\nThe My Laundry App Team`,
      };
    }

    const sent = await sendEmail(recipient, template);

    if (sent) {
      // Mark as delivered (assuming email service confirms delivery)
      await db.notification.update({
        where: { id: notification.id },
        data: { status: "DELIVERED", deliveredAt: new Date() },
      });
    }

    return sent;
  } catch (error) {
    logger.error("Failed to send email notification", {
      notificationId: notification.id,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return false;
  }
}

/**
 * Send SMS notification (placeholder)
 */
async function sendSMSNotification(notification: any): Promise<boolean> {
  // TODO: Implement SMS sending with service like Twilio
  logger.info("SMS notification not implemented yet", {
    notificationId: notification.id,
  });
  return false;
}

/**
 * Send push notification (placeholder)
 */
async function sendPushNotification(notification: any): Promise<boolean> {
  // TODO: Implement push notifications with service like Firebase
  logger.info("Push notification not implemented yet", {
    notificationId: notification.id,
  });
  return false;
}

/**
 * Generate generic email template
 */
function generateGenericEmailTemplate(
  firstName: string,
  title: string,
  message: string
): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
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
        <h1>${title}</h1>
      </div>
      
      <div class="content">
        <h2>Hi ${firstName},</h2>
        <p>${message}</p>
        <p>Best regards,<br>The My Laundry App Team</p>
      </div>
      
      <div class="footer">
        <p>My Laundry App | Simplifying your laundry schedule</p>
      </div>
    </body>
    </html>
  `;
}

/**
 * Process pending notifications (to be called by a scheduled job)
 */
export async function processPendingNotifications() {
  try {
    const pendingNotifications = await db.notification.findMany({
      where: {
        status: "PENDING",
        attempts: { lt: 3 },
        OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: new Date() } }],
      },
      take: 100, // Process in batches
    });

    logger.info("Processing pending notifications", {
      count: pendingNotifications.length,
    });

    const results = await Promise.allSettled(
      pendingNotifications.map(notification =>
        processNotification(notification.id)
      )
    );

    const successful = results.filter(r => r.status === "fulfilled").length;
    const failed = results.filter(r => r.status === "rejected").length;

    logger.info("Pending notifications processed", { successful, failed });

    return { successful, failed };
  } catch (error) {
    logger.error("Failed to process pending notifications", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}

/**
 * Get notification stats for a user
 */
export async function getNotificationStats(userId: string) {
  try {
    const stats = await db.notification.groupBy({
      by: ["status"],
      where: { userId },
      _count: true,
    });

    return stats.reduce((acc, stat) => {
      acc[stat.status.toLowerCase()] = stat._count;
      return acc;
    }, {} as Record<string, number>);
  } catch (error) {
    logger.error("Failed to get notification stats", {
      userId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(
  notificationId: string,
  userId: string
) {
  try {
    const notification = await db.notification.update({
      where: {
        id: notificationId,
        userId,
      },
      data: {
        status: "READ",
        readAt: new Date(),
      },
    });

    logger.info("Notification marked as read", {
      notificationId,
      userId,
    });

    return notification;
  } catch (error) {
    logger.error("Failed to mark notification as read", {
      notificationId,
      userId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}

/**
 * Clean up old notifications
 */
export async function cleanupOldNotifications(olderThanDays: number = 30) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await db.notification.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
        status: { in: ["DELIVERED", "READ", "FAILED"] },
      },
    });

    logger.info("Old notifications cleaned up", {
      deletedCount: result.count,
      cutoffDate,
    });

    return result.count;
  } catch (error) {
    logger.error("Failed to cleanup old notifications", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}
