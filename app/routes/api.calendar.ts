import { type LoaderFunctionArgs, json } from "@remix-run/node";
import { db } from "~/lib/db.server";
import { requireEmailVerification } from "~/lib/auth.middleware";
import logger from "~/lib/logger";
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  addDays,
  format,
} from "date-fns";

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    // Require authentication
    const user = await requireEmailVerification(request);

    // Get URL parameters
    const url = new URL(request.url);
    const view = url.searchParams.get("view") || "daily"; // daily, weekly
    const date = url.searchParams.get("date");
    const machineId = url.searchParams.get("machineId");

    // Parse date or use today
    const targetDate = date ? new Date(date) : new Date();

    if (view === "daily") {
      return await getDailyCalendar(user, targetDate, machineId);
    } else if (view === "weekly") {
      return await getWeeklyCalendar(user, targetDate, machineId);
    } else {
      return json(
        { error: 'Invalid view parameter. Use "daily" or "weekly"' },
        { status: 400 }
      );
    }
  } catch (error) {
    logger.error("Failed to fetch calendar data", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return json({ error: "Failed to fetch calendar data" }, { status: 500 });
  }
}

async function getDailyCalendar(
  user: any,
  targetDate: Date,
  machineId?: string | null
) {
  const startDate = startOfDay(targetDate);
  const endDate = endOfDay(targetDate);

  // Get reservations for the day
  const reservations = await db.reservation.findMany({
    where: {
      ...(machineId ? { machineId } : {}),
      status: "ACTIVE",
      OR: [
        {
          startTime: { gte: startDate, lte: endDate },
        },
        {
          endTime: { gte: startDate, lte: endDate },
        },
        {
          startTime: { lte: startDate },
          endTime: { gte: endDate },
        },
      ],
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
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          apartmentNumber: true,
        },
      },
    },
    orderBy: { startTime: "asc" },
  });

  // Get machines for the calendar
  const machines = await db.machine.findMany({
    where: machineId ? { id: machineId } : {},
    select: {
      id: true,
      name: true,
      type: true,
      location: true,
      status: true,
      isOutOfOrder: true,
      cycleTimeMinutes: true,
    },
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });

  // Create time slots (every 30 minutes from 6 AM to 11 PM)
  const timeSlots = [];
  for (let hour = 6; hour <= 23; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const slotTime = new Date(targetDate);
      slotTime.setHours(hour, minute, 0, 0);
      timeSlots.push({
        time: slotTime,
        timeString: format(slotTime, "HH:mm"),
      });
    }
  }

  // Build calendar grid
  const calendarGrid = machines.map(machine => {
    const machineSlots = timeSlots.map(slot => {
      const slotReservations = reservations.filter(
        r =>
          r.machineId === machine.id &&
          r.startTime <= slot.time &&
          r.endTime > slot.time
      );

      return {
        time: slot.time,
        timeString: slot.timeString,
        isAvailable:
          slotReservations.length === 0 &&
          !machine.isOutOfOrder &&
          machine.status === "AVAILABLE",
        reservations: slotReservations.map(r => ({
          id: r.id,
          startTime: r.startTime,
          endTime: r.endTime,
          duration: r.estimatedDuration,
          isOwner: r.userId === user.id,
          user:
            r.userId === user.id
              ? r.user
              : {
                  id: r.user.id,
                  firstName: r.user.firstName,
                  lastName: r.user.lastName[0] + ".", // Only show first letter for privacy
                  apartmentNumber: r.user.apartmentNumber,
                },
          notes: r.notes,
        })),
      };
    });

    return {
      machine,
      slots: machineSlots,
    };
  });

  logger.info("Daily calendar fetched successfully", {
    userId: user.id,
    date: format(targetDate, "yyyy-MM-dd"),
    machineId: machineId || "all",
    reservationsCount: reservations.length,
    machinesCount: machines.length,
  });

  return json({
    success: true,
    view: "daily",
    date: format(targetDate, "yyyy-MM-dd"),
    calendar: calendarGrid,
    timeSlots: timeSlots.map(slot => slot.timeString),
    totalReservations: reservations.length,
    userReservations: reservations.filter(r => r.userId === user.id).length,
  });
}

async function getWeeklyCalendar(
  user: any,
  targetDate: Date,
  machineId?: string | null
) {
  const startDate = startOfWeek(targetDate, { weekStartsOn: 1 }); // Monday
  const endDate = endOfWeek(targetDate, { weekStartsOn: 1 }); // Sunday

  // Get reservations for the week
  const reservations = await db.reservation.findMany({
    where: {
      ...(machineId ? { machineId } : {}),
      status: "ACTIVE",
      OR: [
        {
          startTime: { gte: startDate, lte: endDate },
        },
        {
          endTime: { gte: startDate, lte: endDate },
        },
        {
          startTime: { lte: startDate },
          endTime: { gte: endDate },
        },
      ],
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
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          apartmentNumber: true,
        },
      },
    },
    orderBy: { startTime: "asc" },
  });

  // Get machines for the calendar
  const machines = await db.machine.findMany({
    where: machineId ? { id: machineId } : {},
    select: {
      id: true,
      name: true,
      type: true,
      location: true,
      status: true,
      isOutOfOrder: true,
      cycleTimeMinutes: true,
    },
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });

  // Create days of the week
  const weekDays = [];
  for (let i = 0; i < 7; i++) {
    const day = addDays(startDate, i);
    weekDays.push({
      date: day,
      dateString: format(day, "yyyy-MM-dd"),
      dayName: format(day, "EEEE"),
      dayShort: format(day, "EEE"),
      isToday: format(day, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd"),
    });
  }

  // Build weekly calendar grid
  const calendarGrid = machines.map(machine => {
    const machineDays = weekDays.map(day => {
      const dayStart = startOfDay(day.date);
      const dayEnd = endOfDay(day.date);

      const dayReservations = reservations.filter(
        r =>
          r.machineId === machine.id &&
          ((r.startTime >= dayStart && r.startTime <= dayEnd) ||
            (r.endTime >= dayStart && r.endTime <= dayEnd) ||
            (r.startTime <= dayStart && r.endTime >= dayEnd))
      );

      // Calculate availability percentage for the day
      const totalMinutesInDay = 17 * 60; // 6 AM to 11 PM = 17 hours
      const reservedMinutes = dayReservations.reduce((sum, r) => {
        const start = r.startTime > dayStart ? r.startTime : dayStart;
        const end = r.endTime < dayEnd ? r.endTime : dayEnd;
        return (
          sum + Math.max(0, (end.getTime() - start.getTime()) / (1000 * 60))
        );
      }, 0);

      const availabilityPercentage = Math.max(
        0,
        Math.min(
          100,
          ((totalMinutesInDay - reservedMinutes) / totalMinutesInDay) * 100
        )
      );

      return {
        ...day,
        reservations: dayReservations.map(r => ({
          id: r.id,
          startTime: r.startTime,
          endTime: r.endTime,
          duration: r.estimatedDuration,
          isOwner: r.userId === user.id,
          user:
            r.userId === user.id
              ? r.user
              : {
                  id: r.user.id,
                  firstName: r.user.firstName,
                  lastName: r.user.lastName[0] + ".", // Only show first letter for privacy
                  apartmentNumber: r.user.apartmentNumber,
                },
          notes: r.notes,
        })),
        availabilityPercentage,
        isAvailable:
          availabilityPercentage > 0 &&
          !machine.isOutOfOrder &&
          machine.status === "AVAILABLE",
      };
    });

    return {
      machine,
      days: machineDays,
    };
  });

  logger.info("Weekly calendar fetched successfully", {
    userId: user.id,
    weekStart: format(startDate, "yyyy-MM-dd"),
    weekEnd: format(endDate, "yyyy-MM-dd"),
    machineId: machineId || "all",
    reservationsCount: reservations.length,
    machinesCount: machines.length,
  });

  return json({
    success: true,
    view: "weekly",
    weekStart: format(startDate, "yyyy-MM-dd"),
    weekEnd: format(endDate, "yyyy-MM-dd"),
    calendar: calendarGrid,
    weekDays: weekDays.map(day => ({
      date: day.dateString,
      dayName: day.dayName,
      dayShort: day.dayShort,
      isToday: day.isToday,
    })),
    totalReservations: reservations.length,
    userReservations: reservations.filter(r => r.userId === user.id).length,
  });
}
