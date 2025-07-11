import {
  type LoaderFunctionArgs,
  type ActionFunctionArgs,
  json,
} from "@remix-run/node";
import { db } from "~/lib/db.server";
import { requireEmailVerification } from "~/lib/auth.middleware";
import logger from "~/lib/logger";

export async function loader({ request, params }: LoaderFunctionArgs) {
  try {
    // Require authentication
    const user = await requireEmailVerification(request);

    const { id } = params;
    if (!id) {
      return json({ error: "Reservation ID is required" }, { status: 400 });
    }

    // Get reservation details
    const reservation = await db.reservation.findUnique({
      where: { id },
      include: {
        machine: {
          select: {
            id: true,
            name: true,
            type: true,
            location: true,
            capacity: true,
          },
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            apartmentNumber: true,
          },
        },
      },
    });

    if (!reservation) {
      return json({ error: "Reservation not found" }, { status: 404 });
    }

    // Check if user owns this reservation or is admin (for now, just check ownership)
    if (reservation.userId !== user.id) {
      return json({ error: "Unauthorized" }, { status: 403 });
    }

    logger.info("Reservation details fetched successfully", {
      userId: user.id,
      reservationId: id,
    });

    return json({
      success: true,
      reservation,
    });
  } catch (error) {
    logger.error("Failed to fetch reservation details", {
      reservationId: params.id,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return json(
      { error: "Failed to fetch reservation details" },
      { status: 500 }
    );
  }
}

export async function action({ request, params }: ActionFunctionArgs) {
  try {
    // Require authentication
    const user = await requireEmailVerification(request);

    const { id } = params;
    if (!id) {
      return json({ error: "Reservation ID is required" }, { status: 400 });
    }

    if (request.method === "PUT") {
      return await updateReservation(request, user, id);
    } else if (request.method === "DELETE") {
      return await deleteReservation(request, user, id);
    } else {
      return json({ error: "Method not allowed" }, { status: 405 });
    }
  } catch (error) {
    logger.error("Reservation action failed", {
      method: request.method,
      reservationId: params.id,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return json({ error: "Request failed" }, { status: 500 });
  }
}

async function updateReservation(
  request: Request,
  user: any,
  reservationId: string
) {
  const body = await request.json();
  const { startTime, estimatedDuration, notes } = body;

  // Find reservation
  const reservation = await db.reservation.findUnique({
    where: { id: reservationId },
    include: {
      machine: true,
    },
  });

  if (!reservation) {
    return json({ error: "Reservation not found" }, { status: 404 });
  }

  if (reservation.userId !== user.id) {
    return json({ error: "Unauthorized" }, { status: 403 });
  }

  if (reservation.status !== "ACTIVE") {
    return json({ error: "Reservation cannot be updated" }, { status: 400 });
  }

  // Check if reservation can be updated (not too late)
  const now = new Date();
  const minutesUntilStart = Math.floor(
    (reservation.startTime.getTime() - now.getTime()) / 60000
  );

  if (minutesUntilStart < 30) {
    return json(
      {
        error:
          "Cannot update reservation less than 30 minutes before start time",
      },
      { status: 400 }
    );
  }

  // Prepare update data
  const updateData: any = {};

  if (startTime && estimatedDuration) {
    const start = new Date(startTime);
    const end = new Date(start.getTime() + estimatedDuration * 60000);

    // Check if start time is in the future
    if (start <= new Date()) {
      return json(
        { error: "Start time must be in the future" },
        { status: 400 }
      );
    }

    // Check for conflicting reservations (excluding current reservation)
    const conflictingReservations = await db.reservation.findMany({
      where: {
        machineId: reservation.machineId,
        status: "ACTIVE",
        id: { not: reservationId },
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

    updateData.startTime = start;
    updateData.endTime = end;
    updateData.estimatedDuration = estimatedDuration;
  }

  if (notes !== undefined) {
    updateData.notes = notes;
  }

  // Update reservation
  const updatedReservation = await db.reservation.update({
    where: { id: reservationId },
    data: updateData,
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

  logger.info("Reservation updated successfully", {
    userId: user.id,
    reservationId: reservationId,
    updatedFields: Object.keys(updateData),
  });

  return json({
    success: true,
    message: "Reservation updated successfully",
    reservation: updatedReservation,
  });
}

async function deleteReservation(
  request: Request,
  user: any,
  reservationId: string
) {
  // Find reservation
  const reservation = await db.reservation.findUnique({
    where: { id: reservationId },
  });

  if (!reservation) {
    return json({ error: "Reservation not found" }, { status: 404 });
  }

  if (reservation.userId !== user.id) {
    return json({ error: "Unauthorized" }, { status: 403 });
  }

  if (reservation.status !== "ACTIVE") {
    return json({ error: "Reservation cannot be deleted" }, { status: 400 });
  }

  // Check if reservation can be deleted (not too late)
  const now = new Date();
  const minutesUntilStart = Math.floor(
    (reservation.startTime.getTime() - now.getTime()) / 60000
  );

  if (minutesUntilStart < 15) {
    return json(
      {
        error:
          "Cannot delete reservation less than 15 minutes before start time",
      },
      { status: 400 }
    );
  }

  // Delete reservation
  await db.reservation.delete({
    where: { id: reservationId },
  });

  // Update machine status if it was in use
  if (reservation.startTime <= now && reservation.endTime >= now) {
    await db.machine.update({
      where: { id: reservation.machineId },
      data: { status: "AVAILABLE" },
    });
  }

  logger.info("Reservation deleted successfully", {
    userId: user.id,
    reservationId: reservationId,
    machineId: reservation.machineId,
  });

  return json({
    success: true,
    message: "Reservation deleted successfully",
  });
}
