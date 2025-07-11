import {
  type LoaderFunctionArgs,
  type ActionFunctionArgs,
  json,
} from "@remix-run/node";
import { db } from "~/lib/db.server";
import { requireEmailVerification } from "~/lib/auth.middleware";
import {
  markNotificationAsRead,
  getNotificationStats,
} from "~/lib/notification.server";
import logger from "~/lib/logger";

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    // Require authentication
    const user = await requireEmailVerification(request);

    // Get URL parameters
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "20");
    const status = url.searchParams.get("status");
    const type = url.searchParams.get("type");

    // Build where clause
    const where: any = { userId: user.id };
    if (status) where.status = status;
    if (type) where.type = type;

    // Get notifications with pagination
    const [notifications, totalCount, stats] = await Promise.all([
      db.notification.findMany({
        where,
        include: {
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
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.notification.count({ where }),
      getNotificationStats(user.id),
    ]);

    logger.info("Notifications fetched successfully", {
      userId: user.id,
      page,
      limit,
      totalCount,
      returnedCount: notifications.length,
    });

    return json({
      success: true,
      notifications,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNextPage: page * limit < totalCount,
        hasPreviousPage: page > 1,
      },
      stats,
    });
  } catch (error) {
    logger.error("Failed to fetch notifications", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return json({ error: "Failed to fetch notifications" }, { status: 500 });
  }
}

export async function action({ request }: ActionFunctionArgs) {
  try {
    // Require authentication
    const user = await requireEmailVerification(request);

    if (request.method === "POST") {
      return await markNotificationRead(request, user);
    } else if (request.method === "DELETE") {
      return await deleteNotification(request, user);
    } else {
      return json({ error: "Method not allowed" }, { status: 405 });
    }
  } catch (error) {
    logger.error("Notification action failed", {
      method: request.method,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return json({ error: "Request failed" }, { status: 500 });
  }
}

async function markNotificationRead(request: Request, user: any) {
  const body = await request.json();
  const { notificationId } = body;

  if (!notificationId) {
    return json({ error: "Notification ID is required" }, { status: 400 });
  }

  try {
    const notification = await markNotificationAsRead(notificationId, user.id);

    return json({
      success: true,
      message: "Notification marked as read",
      notification,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("not found")) {
      return json({ error: "Notification not found" }, { status: 404 });
    }
    throw error;
  }
}

async function deleteNotification(request: Request, user: any) {
  const body = await request.json();
  const { notificationId } = body;

  if (!notificationId) {
    return json({ error: "Notification ID is required" }, { status: 400 });
  }

  try {
    // Check if notification exists and belongs to user
    const notification = await db.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      return json({ error: "Notification not found" }, { status: 404 });
    }

    if (notification.userId !== user.id) {
      return json({ error: "Unauthorized" }, { status: 403 });
    }

    // Delete notification
    await db.notification.delete({
      where: { id: notificationId },
    });

    logger.info("Notification deleted successfully", {
      userId: user.id,
      notificationId,
    });

    return json({
      success: true,
      message: "Notification deleted successfully",
    });
  } catch (error) {
    throw error;
  }
}
