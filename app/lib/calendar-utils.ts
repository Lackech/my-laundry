import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  format,
  isToday,
  isSameMonth,
  isSameDay,
  startOfDay,
  endOfDay,
  addMinutes,
  differenceInMinutes,
  isWithinInterval,
  parseISO,
} from "date-fns";
import type { Reservation, Machine } from "~/types";

export interface CalendarDay {
  date: Date;
  dateString: string;
  dayNumber: number;
  isToday: boolean;
  isCurrentMonth: boolean;
  isWeekend: boolean;
}

export interface TimeSlot {
  time: Date;
  timeString: string;
  isAvailable: boolean;
  reservations: any[];
  duration: number; // in minutes
}

export interface CalendarWeek {
  weekNumber: number;
  days: CalendarDay[];
}

export interface MonthlyCalendar {
  month: Date;
  monthName: string;
  year: number;
  weeks: CalendarWeek[];
  totalDays: number;
}

/**
 * Generates a monthly calendar grid with weeks and days
 */
export function generateMonthlyCalendar(targetDate: Date): MonthlyCalendar {
  const monthStart = startOfMonth(targetDate);
  const monthEnd = endOfMonth(targetDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 }); // Sunday

  const weeks: CalendarWeek[] = [];
  let currentWeek: CalendarDay[] = [];
  let weekNumber = 1;
  let currentDate = calendarStart;

  while (currentDate <= calendarEnd) {
    const day: CalendarDay = {
      date: currentDate,
      dateString: format(currentDate, "yyyy-MM-dd"),
      dayNumber: parseInt(format(currentDate, "d")),
      isToday: isToday(currentDate),
      isCurrentMonth: isSameMonth(currentDate, targetDate),
      isWeekend: [0, 6].includes(currentDate.getDay()), // Sunday or Saturday
    };

    currentWeek.push(day);

    if (currentWeek.length === 7) {
      weeks.push({
        weekNumber,
        days: currentWeek,
      });
      currentWeek = [];
      weekNumber++;
    }

    currentDate = addDays(currentDate, 1);
  }

  return {
    month: monthStart,
    monthName: format(monthStart, "MMMM"),
    year: parseInt(format(monthStart, "yyyy")),
    weeks,
    totalDays: weeks.length * 7,
  };
}

/**
 * Generates time slots for a given day (6 AM to 11 PM in 30-minute intervals)
 */
export function generateTimeSlots(
  targetDate: Date,
  machine: Machine,
  reservations: Reservation[] = [],
  slotDuration: number = 30
): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const dayStart = startOfDay(targetDate);

  // Operating hours: 6 AM to 11 PM
  for (let hour = 6; hour <= 23; hour++) {
    for (let minute = 0; minute < 60; minute += slotDuration) {
      const slotTime = new Date(dayStart);
      slotTime.setHours(hour, minute, 0, 0);
      const slotEnd = addMinutes(slotTime, slotDuration);

      // Check if slot conflicts with any reservation
      const conflictingReservations = reservations.filter((reservation) =>
        isTimeSlotConflicting(slotTime, slotEnd, reservation)
      );

      slots.push({
        time: slotTime,
        timeString: format(slotTime, "HH:mm"),
        isAvailable:
          conflictingReservations.length === 0 &&
          !machine.isOutOfOrder &&
          machine.status === "AVAILABLE",
        reservations: conflictingReservations,
        duration: slotDuration,
      });
    }
  }

  return slots;
}

/**
 * Checks if a time slot conflicts with a reservation
 */
export function isTimeSlotConflicting(
  slotStart: Date,
  slotEnd: Date,
  reservation: Reservation
): boolean {
  const reservationStart = new Date(reservation.startTime);
  const reservationEnd = new Date(reservation.endTime);

  return (
    isWithinInterval(slotStart, {
      start: reservationStart,
      end: reservationEnd,
    }) ||
    isWithinInterval(slotEnd, {
      start: reservationStart,
      end: reservationEnd,
    }) ||
    isWithinInterval(reservationStart, { start: slotStart, end: slotEnd }) ||
    isWithinInterval(reservationEnd, { start: slotStart, end: slotEnd })
  );
}

/**
 * Calculates availability percentage for a given day
 */
export function calculateDayAvailability(
  targetDate: Date,
  machine: Machine,
  reservations: Reservation[]
): number {
  if (machine.isOutOfOrder || machine.status !== "AVAILABLE") {
    return 0;
  }

  const dayStart = startOfDay(targetDate);
  const dayEnd = endOfDay(targetDate);
  
  // Operating hours: 6 AM to 11 PM = 17 hours = 1020 minutes
  const totalOperatingMinutes = 17 * 60;

  // Calculate total reserved minutes for this day
  const reservedMinutes = reservations.reduce((total, reservation) => {
    const reservationStart = new Date(reservation.startTime);
    const reservationEnd = new Date(reservation.endTime);

    // Only count reservations that overlap with this day
    if (
      reservationEnd < dayStart ||
      reservationStart > dayEnd ||
      reservation.machineId !== machine.id ||
      reservation.status !== "ACTIVE"
    ) {
      return total;
    }

    // Calculate overlap with operating hours (6 AM to 11 PM)
    const operatingStart = new Date(dayStart);
    operatingStart.setHours(6, 0, 0, 0);
    const operatingEnd = new Date(dayStart);
    operatingEnd.setHours(23, 0, 0, 0);

    const overlapStart = new Date(
      Math.max(reservationStart.getTime(), operatingStart.getTime())
    );
    const overlapEnd = new Date(
      Math.min(reservationEnd.getTime(), operatingEnd.getTime())
    );

    if (overlapStart >= overlapEnd) {
      return total;
    }

    return total + differenceInMinutes(overlapEnd, overlapStart);
  }, 0);

  return Math.max(0, ((totalOperatingMinutes - reservedMinutes) / totalOperatingMinutes) * 100);
}

/**
 * Gets the next available time slot for a machine
 */
export function getNextAvailableSlot(
  machine: Machine,
  reservations: Reservation[],
  startDate: Date = new Date(),
  durationMinutes: number = 30
): Date | null {
  if (machine.isOutOfOrder || machine.status !== "AVAILABLE") {
    return null;
  }

  const searchDate = startOfDay(startDate);
  
  // Search for the next 7 days
  for (let day = 0; day < 7; day++) {
    const currentDay = addDays(searchDate, day);
    const timeSlots = generateTimeSlots(currentDay, machine, reservations, durationMinutes);
    
    const availableSlot = timeSlots.find(slot => slot.isAvailable);
    if (availableSlot) {
      return availableSlot.time;
    }
  }

  return null;
}

/**
 * Validates if a booking request is valid
 */
export function validateBookingRequest(
  startTime: Date,
  endTime: Date,
  machine: Machine,
  reservations: Reservation[]
): { isValid: boolean; error?: string } {
  // Check if machine is available
  if (machine.isOutOfOrder) {
    return { isValid: false, error: "Machine is out of order" };
  }

  if (machine.status !== "AVAILABLE") {
    return { isValid: false, error: "Machine is not available" };
  }

  // Check if booking is in the past
  if (startTime < new Date()) {
    return { isValid: false, error: "Cannot book in the past" };
  }

  // Check if booking is within operating hours
  const startHour = startTime.getHours();
  const endHour = endTime.getHours();
  
  if (startHour < 6 || endHour > 23) {
    return { isValid: false, error: "Booking must be within operating hours (6 AM - 11 PM)" };
  }

  // Check if duration is reasonable (minimum 30 minutes, maximum 3 hours)
  const durationMinutes = differenceInMinutes(endTime, startTime);
  if (durationMinutes < 30) {
    return { isValid: false, error: "Minimum booking duration is 30 minutes" };
  }

  if (durationMinutes > 180) {
    return { isValid: false, error: "Maximum booking duration is 3 hours" };
  }

  // Check for conflicts with existing reservations
  const hasConflict = reservations.some((reservation) =>
    reservation.machineId === machine.id &&
    reservation.status === "ACTIVE" &&
    isTimeSlotConflicting(startTime, endTime, reservation)
  );

  if (hasConflict) {
    return { isValid: false, error: "Time slot conflicts with existing reservation" };
  }

  return { isValid: true };
}

/**
 * Formats a duration in minutes to human readable format
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${remainingMinutes}m`;
}

/**
 * Groups reservations by date for easy calendar rendering
 */
export function groupReservationsByDate(reservations: Reservation[]): Record<string, Reservation[]> {
  return reservations.reduce((groups, reservation) => {
    const dateKey = format(new Date(reservation.startTime), "yyyy-MM-dd");
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(reservation);
    return groups;
  }, {} as Record<string, Reservation[]>);
}

/**
 * Generates a suggested booking time based on machine availability
 */
export function suggestBookingTime(
  machine: Machine,
  reservations: Reservation[],
  preferredDate?: Date,
  durationMinutes: number = 30
): { startTime: Date; endTime: Date } | null {
  const searchDate = preferredDate || new Date();
  const nextAvailable = getNextAvailableSlot(machine, reservations, searchDate, durationMinutes);
  
  if (!nextAvailable) {
    return null;
  }

  return {
    startTime: nextAvailable,
    endTime: addMinutes(nextAvailable, durationMinutes),
  };
}

/**
 * Checks if two dates are on the same day
 */
export function isSameCalendarDay(date1: Date, date2: Date): boolean {
  return isSameDay(date1, date2);
}

/**
 * Gets the calendar month boundaries for a given date
 */
export function getMonthBoundaries(date: Date) {
  return {
    start: startOfMonth(date),
    end: endOfMonth(date),
  };
}

/**
 * Gets the calendar week boundaries for a given date
 */
export function getWeekBoundaries(date: Date) {
  return {
    start: startOfWeek(date, { weekStartsOn: 1 }),
    end: endOfWeek(date, { weekStartsOn: 1 }),
  };
}