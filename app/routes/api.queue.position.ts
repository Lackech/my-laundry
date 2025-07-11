import { type LoaderFunctionArgs, json } from "@remix-run/node";
import { db } from "~/lib/db.server";
import { requireEmailVerification } from "~/lib/auth.middleware";
import logger from "~/lib/logger";

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    // Require authentication
    const user = await requireEmailVerification(request);

    // Get URL parameters
    const url = new URL(request.url);
    const queueEntryId = url.searchParams.get("queueEntryId");

    if (!queueEntryId) {
      return json({ error: "Queue entry ID is required" }, { status: 400 });
    }

    // Find queue entry
    const queueEntry = await db.queueEntry.findUnique({
      where: { id: queueEntryId },
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

    if (!queueEntry) {
      return json({ error: "Queue entry not found" }, { status: 404 });
    }

    if (queueEntry.userId !== user.id) {
      return json({ error: "Unauthorized" }, { status: 403 });
    }

    // Get current position and queue statistics
    const aheadCount = await db.queueEntry.count({
      where: {
        OR: [
          { machineId: queueEntry.machineId },
          { machineType: queueEntry.machineType },
        ],
        status: { in: ["WAITING", "NOTIFIED"] },
        position: { lt: queueEntry.position },
      },
    });

    const totalInQueue = await db.queueEntry.count({
      where: {
        OR: [
          { machineId: queueEntry.machineId },
          { machineType: queueEntry.machineType },
        ],
        status: { in: ["WAITING", "NOTIFIED"] },
      },
    });

    // Calculate updated estimated wait time
    const avgCycleTime = await db.machine.aggregate({
      where: queueEntry.machineType
        ? { type: queueEntry.machineType }
        : { id: queueEntry.machineId },
      _avg: { cycleTimeMinutes: true },
    });

    const estimatedWaitTime = Math.ceil(
      aheadCount * (avgCycleTime._avg?.cycleTimeMinutes || 30)
    );

    // Check if any machines are currently available
    const availableMachines = await db.machine.findMany({
      where: {
        ...(queueEntry.machineId
          ? { id: queueEntry.machineId }
          : { type: queueEntry.machineType }),
        status: "AVAILABLE",
        isOutOfOrder: false,
      },
      select: {
        id: true,
        name: true,
        type: true,
        location: true,
        _count: {
          select: {
            reservations: {
              where: {
                status: "ACTIVE",
                startTime: { lte: new Date() },
                endTime: { gte: new Date() },
              },
            },
          },
        },
      },
    });

    const trulyAvailableMachines = availableMachines.filter(
      m => m._count.reservations === 0
    );

    // Update estimated wait time in database
    await db.queueEntry.update({
      where: { id: queueEntryId },
      data: { estimatedWaitTime },
    });

    logger.info("Queue position fetched successfully", {
      userId: user.id,
      queueEntryId: queueEntryId,
      position: queueEntry.position,
      aheadCount,
      totalInQueue,
      estimatedWaitTime,
      availableMachines: trulyAvailableMachines.length,
    });

    return json({
      success: true,
      queueEntry: {
        ...queueEntry,
        estimatedWaitTime,
      },
      position: {
        current: queueEntry.position,
        aheadOfYou: aheadCount,
        totalInQueue,
        estimatedWaitTime,
      },
      availableMachines: trulyAvailableMachines,
    });
  } catch (error) {
    logger.error("Failed to fetch queue position", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return json({ error: "Failed to fetch queue position" }, { status: 500 });
  }
}
