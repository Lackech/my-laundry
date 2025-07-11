import { type LoaderFunctionArgs, json } from "@remix-run/node";
import { db } from "~/lib/db.server";
import { requireEmailVerification } from "~/lib/auth.middleware";
import logger from "~/lib/logger";

export async function loader({ request, params }: LoaderFunctionArgs) {
  try {
    // Require authentication
    await requireEmailVerification(request);

    const { id } = params;
    if (!id) {
      return json({ error: "Machine ID is required" }, { status: 400 });
    }

    // Get machine details with reservations and queue
    const machine = await db.machine.findUnique({
      where: { id },
      include: {
        reservations: {
          where: {
            status: "ACTIVE",
            endTime: { gte: new Date() },
          },
          orderBy: { startTime: "asc" },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                apartmentNumber: true,
              },
            },
          },
        },
        queueEntries: {
          where: { status: "WAITING" },
          orderBy: { position: "asc" },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                apartmentNumber: true,
              },
            },
          },
        },
      },
    });

    if (!machine) {
      return json({ error: "Machine not found" }, { status: 404 });
    }

    // Find current reservation
    const currentReservation = machine.reservations.find(
      r => r.startTime <= new Date() && r.endTime >= new Date()
    );

    // Calculate next available time
    const nextAvailableTime =
      machine.reservations.length > 0
        ? machine.reservations[machine.reservations.length - 1].endTime
        : new Date();

    // Calculate estimated wait time based on queue position
    const estimatedWaitTime =
      machine.queueEntries.length > 0
        ? machine.queueEntries.length * machine.cycleTimeMinutes
        : 0;

    const machineDetails = {
      ...machine,
      currentReservation,
      nextAvailableTime,
      estimatedWaitTime,
      isAvailable:
        !machine.isOutOfOrder &&
        machine.status === "AVAILABLE" &&
        !currentReservation,
      upcomingReservations: machine.reservations.filter(
        r => r.startTime > new Date()
      ),
      activeQueue: machine.queueEntries,
    };

    logger.info("Machine details fetched successfully", {
      machineId: id,
      machineName: machine.name,
      currentReservation: !!currentReservation,
      queueLength: machine.queueEntries.length,
      upcomingReservations: machineDetails.upcomingReservations.length,
    });

    return json({
      success: true,
      machine: machineDetails,
    });
  } catch (error) {
    logger.error("Failed to fetch machine details", {
      machineId: params.id,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return json({ error: "Failed to fetch machine details" }, { status: 500 });
  }
}
