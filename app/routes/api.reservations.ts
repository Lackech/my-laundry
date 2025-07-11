import {
  type LoaderFunctionArgs,
  type ActionFunctionArgs,
  json,
} from "@remix-run/node";
import { db } from "~/lib/db.server";
import { requireEmailVerification } from "~/lib/auth.middleware";
import { sendReservationConfirmation } from "~/lib/email.server";
import logger from "~/lib/logger";

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    // Require authentication
    const user = await requireEmailVerification(request);

    // Get user's reservations
    const reservations = await db.reservation.findMany({
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
      orderBy: { startTime: "desc" },
    });

    logger.info("User reservations fetched successfully", {
      userId: user.id,
      count: reservations.length,
    });

    return json({
      success: true,
      reservations,
    });
  } catch (error) {
    logger.error("Failed to fetch reservations", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return json({ error: "Failed to fetch reservations" }, { status: 500 });
  }
}

export async function action({ request }: ActionFunctionArgs) {
  try {
    // Require authentication
    const user = await requireEmailVerification(request);

    if (request.method === "POST") {
      return await createReservation(request, user);
    } else if (request.method === "DELETE") {
      return await cancelReservation(request, user);
    } else {
      return json({ error: "Method not allowed" }, { status: 405 });
    }
  } catch (error) {
    logger.error("Reservation action failed", {
      method: request.method,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return json({ error: "Request failed" }, { status: 500 });
  }
}

async function createReservation(request: Request, user: any) {
  const body = await request.json();
  const { machineId, startTime, estimatedDuration } = body;

  // Validation
  if (!machineId || !startTime || !estimatedDuration) {
    return json({ error: "Missing required fields" }, { status: 400 });
  }

  const start = new Date(startTime);
  const end = new Date(start.getTime() + estimatedDuration * 60000);

  // Check if start time is in the future
  if (start <= new Date()) {
    return json({ error: "Start time must be in the future" }, { status: 400 });
  }

  // Check if machine exists and is available
  const machine = await db.machine.findUnique({
    where: { id: machineId },
  });

  if (!machine) {
    return json({ error: "Machine not found" }, { status: 404 });
  }

  if (machine.isOutOfOrder) {
    return json({ error: "Machine is out of order" }, { status: 400 });
  }

  // Check for conflicting reservations
  const conflictingReservations = await db.reservation.findMany({
    where: {
      machineId,
      status: "ACTIVE",
      OR: [
        {
          startTime: { lte: start },
          endTime: { gt: start },
        },
        {
          startTime: { lt: end },
          endTime: { gte: end },
        },
        {
          startTime: { gte: start },
          endTime: { lte: end },
        },
      ],
    },
  });

  if (conflictingReservations.length > 0) {
    return json({ error: "Time slot is already booked" }, { status: 409 });
  }

  // Create reservation
  const reservation = await db.reservation.create({
    data: {
      userId: user.id,
      machineId,
      startTime: start,
      endTime: end,
      estimatedDuration,
      status: "ACTIVE",
    },
    include: {
      machine: {
        select: {
          name: true,
          type: true,
          location: true,
        },
      },
    },
  });

  // Send confirmation email
  try {
    await sendReservationConfirmation(
      user.email,
      user.firstName,
      reservation.machine.type,
      reservation.machine.name,
      reservation.startTime,
      reservation.endTime
    );
  } catch (emailError) {
    logger.error("Failed to send reservation confirmation email", {
      userId: user.id,
      reservationId: reservation.id,
      error: emailError instanceof Error ? emailError.message : "Unknown error",
    });
    // Don't fail the reservation if email fails
  }

  logger.info("Reservation created successfully", {
    userId: user.id,
    reservationId: reservation.id,
    machineId,
    startTime: start,
    endTime: end,
  });

  return json({
    success: true,
    message: "Reservation created successfully",
    reservation,
  });
}

async function cancelReservation(request: Request, user: any) {
  const body = await request.json();
  const { reservationId } = body;

  if (!reservationId) {
    return json({ error: "Reservation ID is required" }, { status: 400 });
  }

  // Find reservation
  const reservation = await db.reservation.findUnique({
    where: { id: reservationId },
    include: {
      machine: {
        select: {
          name: true,
          type: true,
        },
      },
    },
  });

  if (!reservation) {
    return json({ error: "Reservation not found" }, { status: 404 });
  }

  if (reservation.userId !== user.id) {
    return json({ error: "Unauthorized" }, { status: 403 });
  }

  if (reservation.status !== "ACTIVE") {
    return json({ error: "Reservation cannot be cancelled" }, { status: 400 });
  }

  // Check if reservation can be cancelled (e.g., not too late)
  const now = new Date();
  const minutesUntilStart = Math.floor(
    (reservation.startTime.getTime() - now.getTime()) / 60000
  );

  if (minutesUntilStart < 15) {
    return json(
      {
        error:
          "Cannot cancel reservation less than 15 minutes before start time",
      },
      { status: 400 }
    );
  }

  // Cancel reservation
  await db.reservation.update({
    where: { id: reservationId },
    data: {
      status: "CANCELLED",
      cancelledAt: new Date(),
    },
  });

  // Update machine status if it was in use
  if (reservation.startTime <= now && reservation.endTime >= now) {
    await db.machine.update({
      where: { id: reservation.machineId },
      data: { status: "AVAILABLE" },
    });
  }

  logger.info("Reservation cancelled successfully", {
    userId: user.id,
    reservationId: reservation.id,
    machineId: reservation.machineId,
  });

  return json({
    success: true,
    message: "Reservation cancelled successfully",
  });
}
