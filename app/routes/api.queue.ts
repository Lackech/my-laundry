import {
  type LoaderFunctionArgs,
  type ActionFunctionArgs,
  json,
} from "@remix-run/node";
import { db } from "~/lib/db.server";
import { requireEmailVerification } from "~/lib/auth.middleware";
import logger from "~/lib/logger";

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    // Require authentication
    const user = await requireEmailVerification(request);

    // Get user's queue entries
    const queueEntries = await db.queueEntry.findMany({
      where: { userId: user.id },
      include: {
        machine: {
          select: {
            id: true,
            name: true,
            type: true,
            location: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Get queue statistics
    const queueStats = await db.queueEntry.groupBy({
      by: ["machineId", "status"],
      _count: true,
      where: {
        status: { in: ["WAITING", "NOTIFIED"] },
      },
    });

    logger.info("Queue entries fetched successfully", {
      userId: user.id,
      userEntriesCount: queueEntries.length,
      totalActiveEntries: queueStats.reduce(
        (sum, stat) => sum + stat._count,
        0
      ),
    });

    return json({
      success: true,
      queueEntries,
      queueStats,
    });
  } catch (error) {
    logger.error("Failed to fetch queue entries", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return json({ error: "Failed to fetch queue entries" }, { status: 500 });
  }
}

export async function action({ request }: ActionFunctionArgs) {
  try {
    // Require authentication
    const user = await requireEmailVerification(request);

    if (request.method === "POST") {
      return await joinQueue(request, user);
    } else if (request.method === "DELETE") {
      return await leaveQueue(request, user);
    } else {
      return json({ error: "Method not allowed" }, { status: 405 });
    }
  } catch (error) {
    logger.error("Queue action failed", {
      method: request.method,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return json({ error: "Request failed" }, { status: 500 });
  }
}

async function joinQueue(request: Request, user: any) {
  const body = await request.json();
  const {
    machineId,
    machineType,
    preferredStartTime,
    notifyWhenAvailable = true,
  } = body;

  // Validation
  if (!machineId && !machineType) {
    return json(
      { error: "Either machineId or machineType is required" },
      { status: 400 }
    );
  }

  // If machineId provided, verify it exists
  if (machineId) {
    const machine = await db.machine.findUnique({
      where: { id: machineId },
    });

    if (!machine) {
      return json({ error: "Machine not found" }, { status: 404 });
    }

    if (machine.isOutOfOrder) {
      return json({ error: "Machine is out of order" }, { status: 400 });
    }
  }

  // Check if user is already in queue for this machine/type
  const existingEntry = await db.queueEntry.findFirst({
    where: {
      userId: user.id,
      status: { in: ["WAITING", "NOTIFIED"] },
      OR: [
        { machineId: machineId || undefined },
        { machineType: machineType || undefined },
      ],
    },
  });

  if (existingEntry) {
    return json(
      { error: "Already in queue for this machine or type" },
      { status: 409 }
    );
  }

  // Get next position in queue
  const lastPosition = await db.queueEntry.findFirst({
    where: {
      OR: [
        { machineId: machineId || undefined },
        { machineType: machineType || undefined },
      ],
      status: { in: ["WAITING", "NOTIFIED"] },
    },
    orderBy: { position: "desc" },
    select: { position: true },
  });

  const nextPosition = (lastPosition?.position || 0) + 1;

  // Calculate estimated wait time
  const queueLength = await db.queueEntry.count({
    where: {
      OR: [
        { machineId: machineId || undefined },
        { machineType: machineType || undefined },
      ],
      status: { in: ["WAITING", "NOTIFIED"] },
    },
  });

  // Get average cycle time for this machine type
  const avgCycleTime = await db.machine.aggregate({
    where: machineType ? { type: machineType } : { id: machineId },
    _avg: { cycleTimeMinutes: true },
  });

  const estimatedWaitTime = Math.ceil(
    queueLength * (avgCycleTime._avg.cycleTimeMinutes || 30)
  );

  // Create queue entry
  const queueEntry = await db.queueEntry.create({
    data: {
      userId: user.id,
      machineId: machineId || null,
      machineType: machineType || null,
      position: nextPosition,
      preferredStartTime: preferredStartTime
        ? new Date(preferredStartTime)
        : null,
      estimatedWaitTime,
      notifyWhenAvailable,
      status: "WAITING",
    },
    include: {
      machine: {
        select: {
          id: true,
          name: true,
          type: true,
          location: true,
        },
      },
    },
  });

  logger.info("User joined queue successfully", {
    userId: user.id,
    queueEntryId: queueEntry.id,
    machineId: machineId || null,
    machineType: machineType || null,
    position: nextPosition,
    estimatedWaitTime,
  });

  return json({
    success: true,
    message: "Successfully joined queue",
    queueEntry,
  });
}

async function leaveQueue(request: Request, user: any) {
  const body = await request.json();
  const { queueEntryId } = body;

  if (!queueEntryId) {
    return json({ error: "Queue entry ID is required" }, { status: 400 });
  }

  // Find queue entry
  const queueEntry = await db.queueEntry.findUnique({
    where: { id: queueEntryId },
  });

  if (!queueEntry) {
    return json({ error: "Queue entry not found" }, { status: 404 });
  }

  if (queueEntry.userId !== user.id) {
    return json({ error: "Unauthorized" }, { status: 403 });
  }

  if (queueEntry.status === "CANCELLED" || queueEntry.status === "EXPIRED") {
    return json({ error: "Queue entry is already inactive" }, { status: 400 });
  }

  // Remove from queue
  await db.queueEntry.update({
    where: { id: queueEntryId },
    data: { status: "CANCELLED" },
  });

  // Reorder remaining queue entries
  await db.queueEntry.updateMany({
    where: {
      OR: [
        { machineId: queueEntry.machineId },
        { machineType: queueEntry.machineType },
      ],
      status: { in: ["WAITING", "NOTIFIED"] },
      position: { gt: queueEntry.position },
    },
    data: {
      position: {
        decrement: 1,
      },
    },
  });

  logger.info("User left queue successfully", {
    userId: user.id,
    queueEntryId: queueEntryId,
    machineId: queueEntry.machineId,
    machineType: queueEntry.machineType,
    position: queueEntry.position,
  });

  return json({
    success: true,
    message: "Successfully left queue",
  });
}
