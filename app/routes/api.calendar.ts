import { type LoaderFunctionArgs, json } from "@remix-run/node";
import { db } from "~/lib/db.server";
import { requireEmailVerification } from "~/lib/auth.middleware";
import logger from "~/lib/logger";
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addDays,
  format,
} from "date-fns";

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    // Require authentication
    const user = await requireEmailVerification(request);

    // Get URL parameters
    const url = new URL(request.url);
    const view = url.searchParams.get("view") || "daily"; // daily, weekly, monthly
    const date = url.searchParams.get("date");
    const machineId = url.searchParams.get("machineId");

    // Parse date or use today
    const targetDate = date ? new Date(date) : new Date();

    if (view === "daily") {
      return await getDailyCalendar(user, targetDate, machineId);
    } else if (view === "weekly") {
      return await getWeeklyCalendar(user, targetDate, machineId);
    } else if (view === "monthly") {
      return await getMonthlyCalendar(user, targetDate, machineId);
    } else {
      return json(
        { error: 'Invalid view parameter. Use "daily", "weekly", or "monthly"' },
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
  const timeSlots: { time: Date; timeString: string }[] = [];
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
  const weekDays: Array<{
    date: Date;
    dateString: string;
    dayName: string;
    dayShort: string;
    isToday: boolean;
  }> = [];
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

async function getMonthlyCalendar(
  user: any,
  targetDate: Date,
  machineId?: string | null
) {
  const startDate = startOfMonth(targetDate);
  const endDate = endOfMonth(targetDate);
  
  // Extend to full calendar view (include previous/next month days)
  const calendarStart = startOfWeek(startDate, { weekStartsOn: 1 }); // Monday
  const calendarEnd = endOfWeek(endDate, { weekStartsOn: 1 }); // Sunday

  // Get reservations for the entire calendar view
  const reservations = await db.reservation.findMany({
    where: {
      ...(machineId ? { machineId } : {}),
      status: "ACTIVE",
      OR: [
        {
          startTime: { gte: calendarStart, lte: calendarEnd },
        },
        {
          endTime: { gte: calendarStart, lte: calendarEnd },
        },
        {
          startTime: { lte: calendarStart },
          endTime: { gte: calendarEnd },
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

  // Generate monthly calendar structure
  const weeks: Array<{
    weekNumber: number;
    days: Array<{
      date: Date;
      dateString: string;
      dayNumber: number;
      dayName: string;
      dayShort: string;
      isToday: boolean;
      isCurrentMonth: boolean;
      isWeekend: boolean;
    }>;
  }> = [];
  const weekDays: Array<{
    date: Date;
    dateString: string;
    dayNumber: number;
    dayName: string;
    dayShort: string;
    isToday: boolean;
    isCurrentMonth: boolean;
    isWeekend: boolean;
  }> = [];
  let currentWeek: Array<{
    date: Date;
    dateString: string;
    dayNumber: number;
    dayName: string;
    dayShort: string;
    isToday: boolean;
    isCurrentMonth: boolean;
    isWeekend: boolean;
  }> = [];
  let currentDate = calendarStart;

  while (currentDate <= calendarEnd) {
    const dayData = {
      date: currentDate,
      dateString: format(currentDate, "yyyy-MM-dd"),
      dayNumber: parseInt(format(currentDate, "d")),
      dayName: format(currentDate, "EEEE"),
      dayShort: format(currentDate, "EEE"),
      isToday: format(currentDate, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd"),
      isCurrentMonth: currentDate >= startDate && currentDate <= endDate,
      isWeekend: [0, 6].includes(currentDate.getDay()),
    };

    currentWeek.push(dayData);
    weekDays.push(dayData);

    if (currentWeek.length === 7) {
      weeks.push({
        weekNumber: weeks.length + 1,
        days: currentWeek,
      });
      currentWeek = [];
    }

    currentDate = addDays(currentDate, 1);
  }

  // Calculate daily availability for each machine
  const calendar = machines.map(machine => {
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

  logger.info("Monthly calendar fetched successfully", {
    userId: user.id,
    month: format(targetDate, "yyyy-MM"),
    machineId: machineId || "all",
    reservationsCount: reservations.length,
    machinesCount: machines.length,
  });

  return json({
    success: true,
    view: "monthly",
    month: format(startDate, "yyyy-MM-dd"),
    monthName: format(startDate, "MMMM yyyy"),
    weeks,
    calendar,
    reservations,
    totalReservations: reservations.length,
    userReservations: reservations.filter(r => r.userId === user.id).length,
  });
}
