import { type LoaderFunctionArgs, json } from "@remix-run/node";
import { db } from "~/lib/db.server";
import { requireEmailVerification } from "~/lib/auth.middleware";
import logger from "~/lib/logger";

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    // Require authentication
    await requireEmailVerification(request);

    // Get all machines with their current status
    const machines = await db.machine.findMany({
      select: {
        id: true,
        name: true,
        type: true,
        status: true,
        location: true,
        capacity: true,
        cycleTimeMinutes: true,
        isOutOfOrder: true,
        outOfOrderReason: true,
        lastMaintenanceAt: true,
        nextMaintenanceAt: true,
        _count: {
          select: {
            reservations: {
              where: {
                status: "ACTIVE",
                startTime: { lte: new Date() },
                endTime: { gte: new Date() },
              },
            },
            queueEntries: {
              where: { status: "WAITING" },
            },
          },
        },
      },
      orderBy: [{ type: "asc" }, { name: "asc" }],
    });

    // Add computed fields
    const machinesWithStatus = machines.map(machine => ({
      ...machine,
      currentReservations: machine._count.reservations,
      queueLength: machine._count.queueEntries,
      isAvailable:
        !machine.isOutOfOrder &&
        machine.status === "AVAILABLE" &&
        machine._count.reservations === 0,
      estimatedAvailableAt: machine._count.reservations > 0 ? null : new Date(), // TODO: Calculate based on current reservation
    }));

    logger.info("Machines fetched successfully", {
      count: machines.length,
      available: machinesWithStatus.filter(m => m.isAvailable).length,
      inUse: machinesWithStatus.filter(m => m.currentReservations > 0).length,
      outOfOrder: machinesWithStatus.filter(m => m.isOutOfOrder).length,
    });

    return json({
      success: true,
      machines: machinesWithStatus,
    });
  } catch (error) {
    logger.error("Failed to fetch machines", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return json({ error: "Failed to fetch machines" }, { status: 500 });
  }
}
