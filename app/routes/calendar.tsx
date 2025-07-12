import {
  type LoaderFunctionArgs,
  type ActionFunctionArgs,
  json,
} from "@remix-run/node";
import { useLoaderData, useFetcher, useSearchParams } from "@remix-run/react";
import { useState, useEffect } from "react";
import { db } from "~/lib/db.server";
import { requireEmailVerification } from "~/lib/auth.middleware";
import logger from "~/lib/logger";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import CalendarView from "~/components/calendar/CalendarView";
import TimeSlotPicker from "~/components/calendar/TimeSlotPicker";
import { generateMonthlyCalendar } from "~/lib/calendar-utils";
import type { Machine, User } from "~/types";
import { format, addMonths, subMonths } from "date-fns";

interface LoaderData {
  user: User;
  machines: Machine[];
  currentDate: string;
  calendar: any;
  view: "monthly" | "weekly" | "daily";
  selectedMachine?: Machine;
}

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const user = await requireEmailVerification(request);
    const url = new URL(request.url);

    // Parse query parameters
    const view =
      (url.searchParams.get("view") as "monthly" | "weekly" | "daily") ||
      "monthly";
    const dateParam = url.searchParams.get("date");
    const machineId = url.searchParams.get("machineId");

    const currentDate = dateParam ? new Date(dateParam) : new Date();

    // Fetch machines
    const machines = await db.machine.findMany({
      where: {
        isOutOfOrder: false,
      },
      orderBy: [{ type: "asc" }, { name: "asc" }],
    });

    // Get selected machine if specified
    const selectedMachine = machineId
      ? machines.find(m => m.id === machineId)
      : undefined;

    // Fetch calendar data based on view
    let calendar;
    if (view === "monthly") {
      calendar = await getMonthlyCalendarData(currentDate, machineId);
    } else {
      // For weekly/daily, use existing API logic
      const response = await fetch(
        `${url.origin}/api/calendar?view=${view}&date=${format(
          currentDate,
          "yyyy-MM-dd"
        )}${machineId ? `&machineId=${machineId}` : ""}`,
        {
          headers: {
            Cookie: request.headers.get("Cookie") || "",
          },
        }
      );
      const apiData = await response.json();
      calendar = apiData;
    }

    logger.info("Calendar page loaded", {
      userId: user.id,
      view,
      date: format(currentDate, "yyyy-MM-dd"),
      machineId: machineId || "all",
    });

    return json({
      user,
      machines,
      currentDate: format(currentDate, "yyyy-MM-dd"),
      calendar,
      view,
      selectedMachine,
    });
  } catch (error) {
    logger.error("Failed to load calendar page", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    throw new Response("Failed to load calendar", { status: 500 });
  }
}

export async function action({ request }: ActionFunctionArgs) {
  try {
    const user = await requireEmailVerification(request);
    const formData = await request.formData();
    const intent = formData.get("intent");

    if (intent === "book") {
      const machineId = formData.get("machineId") as string;
      const startTime = formData.get("startTime") as string;
      const endTime = formData.get("endTime") as string;
      const notes = formData.get("notes") as string;

      // Validate booking data
      if (!machineId || !startTime || !endTime) {
        return json(
          { error: "Missing required booking information" },
          { status: 400 }
        );
      }

      const start = new Date(startTime);
      const end = new Date(endTime);

      // Check for conflicts
      const existingReservation = await db.reservation.findFirst({
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

      if (existingReservation) {
        return json({ error: "Time slot is already booked" }, { status: 409 });
      }

      // Create reservation
      const reservation = await db.reservation.create({
        data: {
          userId: user.id,
          machineId,
          startTime: start,
          endTime: end,
          estimatedDuration: Math.round(
            (end.getTime() - start.getTime()) / (1000 * 60)
          ),
          notes: notes || undefined,
        },
        include: {
          machine: true,
        },
      });

      logger.info("Reservation created via calendar", {
        userId: user.id,
        reservationId: reservation.id,
        machineId,
        startTime: startTime,
        endTime: endTime,
      });

      return json({ success: true, reservation });
    }

    return json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    logger.error("Failed to process calendar action", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return json({ error: "Failed to process request" }, { status: 500 });
  }
}

async function getMonthlyCalendarData(
  currentDate: Date,
  machineId?: string | null
) {
  const monthCalendar = generateMonthlyCalendar(currentDate);
  const startDate = monthCalendar.weeks[0].days[0].date;
  const endDate =
    monthCalendar.weeks[monthCalendar.weeks.length - 1].days[6].date;

  // Fetch reservations for the entire calendar view
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

  return {
    ...monthCalendar,
    reservations,
  };
}

export default function CalendarPage() {
  const { user, machines, currentDate, calendar, view, selectedMachine } =
    useLoaderData<LoaderData>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showTimeSlotPicker, setShowTimeSlotPicker] = useState(false);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [calendarError, setCalendarError] = useState<string | null>(null);
  const fetcher = useFetcher();

  const currentViewDate = new Date(currentDate);

  // Navigation handlers
  const navigateMonth = (direction: "prev" | "next") => {
    const newDate =
      direction === "prev"
        ? subMonths(currentViewDate, 1)
        : addMonths(currentViewDate, 1);

    setCalendarLoading(true);
    setCalendarError(null);

    const newParams = new URLSearchParams(searchParams);
    newParams.set("date", format(newDate, "yyyy-MM-dd"));
    setSearchParams(newParams);
  };

  const changeView = (newView: "monthly" | "weekly" | "daily") => {
    setCalendarLoading(true);
    setCalendarError(null);

    const newParams = new URLSearchParams(searchParams);
    newParams.set("view", newView);
    setSearchParams(newParams);
  };

  const selectMachine = (machineId: string | null) => {
    setCalendarLoading(true);
    setCalendarError(null);

    const newParams = new URLSearchParams(searchParams);
    if (machineId) {
      newParams.set("machineId", machineId);
    } else {
      newParams.delete("machineId");
    }
    setSearchParams(newParams);
  };

  // Reset loading state when data changes
  useEffect(() => {
    setCalendarLoading(false);
    setCalendarError(null);
  }, [calendar, view, currentDate]);

  // Handle booking errors
  useEffect(() => {
    if (fetcher.data && "error" in fetcher.data && fetcher.data.error) {
      setCalendarError(fetcher.data.error as string);
    }
  }, [fetcher.data]);

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setShowTimeSlotPicker(true);
  };

  const handleBooking = (
    startTime: Date,
    endTime: Date,
    machineId: string,
    notes?: string
  ) => {
    fetcher.submit(
      {
        intent: "book",
        machineId,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        notes: notes || "",
      },
      { method: "post" }
    );
    setShowTimeSlotPicker(false);
    setSelectedDate(null);
  };

  return (
    <div className="container mx-auto space-y-4 p-2 md:space-y-6 md:p-4">
      {/* Header */}
      <div className="flex flex-col items-start justify-between space-y-4 md:flex-row md:items-center md:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">
            Laundry Calendar
          </h1>
          <p className="text-sm text-gray-600 md:text-base">
            Book machines and view availability
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={view === "monthly" ? "default" : "outline"}
            onClick={() => changeView("monthly")}
            size="sm"
            className="text-xs md:text-sm"
          >
            Month
          </Button>
          <Button
            variant={view === "weekly" ? "default" : "outline"}
            onClick={() => changeView("weekly")}
            size="sm"
            className="text-xs md:text-sm"
          >
            Week
          </Button>
          <Button
            variant={view === "daily" ? "default" : "outline"}
            onClick={() => changeView("daily")}
            size="sm"
            className="text-xs md:text-sm"
          >
            Day
          </Button>
        </div>
      </div>

      {/* Machine Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-2">
            <Button
              variant={!selectedMachine ? "default" : "outline"}
              onClick={() => selectMachine(null)}
              size="sm"
            >
              All Machines
            </Button>
            {machines.map(machine => (
              <Button
                key={machine.id}
                variant={
                  selectedMachine?.id === machine.id ? "default" : "outline"
                }
                onClick={() => selectMachine(machine.id)}
                size="sm"
              >
                {machine.name}
                <Badge
                  variant={machine.type === "WASHER" ? "default" : "secondary"}
                  className="ml-2"
                >
                  {machine.type.toLowerCase()}
                </Badge>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Calendar Navigation */}
      {view === "monthly" && (
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => navigateMonth("prev")}>
            ← Previous
          </Button>
          <h2 className="text-xl font-semibold">
            {format(currentViewDate, "MMMM yyyy")}
          </h2>
          <Button variant="outline" onClick={() => navigateMonth("next")}>
            Next →
          </Button>
        </div>
      )}

      {/* Loading States */}
      {fetcher.state === "submitting" && (
        <div className="rounded border border-blue-200 bg-blue-50 px-4 py-3 text-blue-800">
          Creating your reservation...
        </div>
      )}

      {/* Error Messages */}
      {fetcher.data && "error" in fetcher.data && fetcher.data.error && (
        <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-red-800">
          {fetcher.data.error as string}
        </div>
      )}

      {/* Success Messages */}
      {fetcher.data && "success" in fetcher.data && fetcher.data.success && (
        <div className="rounded border border-green-200 bg-green-50 px-4 py-3 text-green-800">
          Reservation created successfully!
        </div>
      )}

      {/* Calendar View */}
      <CalendarView
        calendar={calendar}
        view={view}
        machines={machines}
        selectedMachine={selectedMachine}
        currentUser={user}
        onDateClick={handleDateClick}
        isLoading={calendarLoading}
        error={calendarError || undefined}
      />

      {/* Time Slot Picker Modal */}
      {showTimeSlotPicker && selectedDate && (
        <TimeSlotPicker
          selectedDate={selectedDate}
          machines={selectedMachine ? [selectedMachine] : machines}
          onBooking={handleBooking}
          onClose={() => {
            setShowTimeSlotPicker(false);
            setSelectedDate(null);
          }}
          currentUser={user}
        />
      )}
    </div>
  );
}
