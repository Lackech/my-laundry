import { useState } from "react";
import { Card, CardContent } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import AvailabilityIndicator from "./AvailabilityIndicator";
import {
  calculateDayAvailability,
  groupReservationsByDate,
} from "~/lib/calendar-utils";
import type { Machine } from "~/types";

interface CalendarViewProps {
  calendar: any;
  view: "monthly" | "weekly" | "daily";
  machines: Machine[];
  selectedMachine?: Machine;
  currentUser: User;
  onDateClick: (date: Date) => void;
  isLoading?: boolean;
  error?: string;
}

export default function CalendarView({
  calendar,
  view,
  machines,
  selectedMachine,
  currentUser,
  onDateClick,
  isLoading = false,
  error,
}: CalendarViewProps) {
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);

  // Error state
  if (error) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="mb-2 text-red-600">⚠️ Error</div>
          <p className="text-gray-600">{error}</p>
          <Button
            variant="outline"
            onClick={() => window.location.reload()}
            className="mt-4"
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: 7 }).map((_, i) => (
                <div
                  key={i}
                  className="h-8 animate-pulse rounded bg-gray-200"
                />
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: 35 }).map((_, i) => (
                <div
                  key={i}
                  className="h-20 animate-pulse rounded bg-gray-100"
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (view === "monthly") {
    return (
      <MonthlyCalendarView
        calendar={calendar}
        machines={machines}
        selectedMachine={selectedMachine}
        currentUser={currentUser}
        onDateClick={onDateClick}
        hoveredDate={hoveredDate}
        setHoveredDate={setHoveredDate}
      />
    );
  }

  if (view === "weekly") {
    return (
      <WeeklyCalendarView
        calendar={calendar}
        machines={machines}
        selectedMachine={selectedMachine}
        currentUser={currentUser}
        onDateClick={onDateClick}
      />
    );
  }

  if (view === "daily") {
    return (
      <DailyCalendarView
        calendar={calendar}
        machines={machines}
        selectedMachine={selectedMachine}
        currentUser={currentUser}
        onDateClick={onDateClick}
      />
    );
  }

  return null;
}

function MonthlyCalendarView({
  calendar,
  machines,
  selectedMachine,
  currentUser,
  onDateClick,
  hoveredDate,
  setHoveredDate,
}: {
  calendar: any;
  machines: Machine[];
  selectedMachine?: Machine;
  currentUser: User;
  onDateClick: (date: Date) => void;
  hoveredDate: string | null;
  setHoveredDate: (date: string | null) => void;
}) {
  const reservationsByDate = groupReservationsByDate(
    calendar.reservations || []
  );
  const machinesToShow = selectedMachine ? [selectedMachine] : machines;

  return (
    <Card>
      <CardContent className="p-6">
        {/* Calendar Header */}
        <div className="mb-4 grid grid-cols-7 gap-1">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(day => (
            <div
              key={day}
              className="p-1 text-center text-xs font-medium uppercase tracking-wide text-gray-500 md:p-2 md:text-sm"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-0.5 md:gap-1">
          {calendar.weeks?.map((week: any) =>
            week.days.map((day: any) => {
              const dateKey = day.dateString;
              const dayReservations = reservationsByDate[dateKey] || [];
              const isCurrentMonth = day.isCurrentMonth;
              const isHovered = hoveredDate === dateKey;

              // Calculate availability for each machine on this day
              const machineAvailabilities = machinesToShow.map(machine => {
                const machineReservations = dayReservations.filter(
                  r => r.machineId === machine.id
                );
                return {
                  machine,
                  availability: calculateDayAvailability(
                    day.date,
                    machine,
                    machineReservations
                  ),
                  reservationCount: machineReservations.length,
                };
              });

              const averageAvailability =
                machineAvailabilities.length > 0
                  ? machineAvailabilities.reduce(
                      (sum, m) => sum + m.availability,
                      0
                    ) / machineAvailabilities.length
                  : 0;

              return (
                <div
                  key={dateKey}
                  className={`
                    relative min-h-16 cursor-pointer border border-gray-200 p-1 transition-all duration-200 md:min-h-24 md:p-2
                    ${isCurrentMonth ? "bg-white" : "bg-gray-50"}
                    ${day.isToday ? "ring-1 ring-blue-500 md:ring-2" : ""}
                    ${isHovered ? "bg-blue-50 shadow-md" : "hover:bg-gray-50"}
                  `}
                  onClick={() => onDateClick(day.date)}
                  onMouseEnter={() => setHoveredDate(dateKey)}
                  onMouseLeave={() => setHoveredDate(null)}
                >
                  {/* Day Number */}
                  <div
                    className={`
                      mb-1 text-xs font-medium md:text-sm
                      ${isCurrentMonth ? "text-gray-900" : "text-gray-400"}
                      ${day.isToday ? "font-bold text-blue-600" : ""}
                    `}
                  >
                    {day.dayNumber}
                  </div>

                  {/* Availability Overview */}
                  {isCurrentMonth && (
                    <div className="space-y-1">
                      <AvailabilityIndicator
                        availability={averageAvailability}
                        size="sm"
                        showPercentage={false}
                      />

                      {/* Machine-specific indicators for selected machine */}
                      {selectedMachine && machineAvailabilities.length > 0 && (
                        <div className="text-xs text-gray-600">
                          {machineAvailabilities[0].reservationCount > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {machineAvailabilities[0].reservationCount}{" "}
                              bookings
                            </Badge>
                          )}
                        </div>
                      )}

                      {/* Multiple machine indicators */}
                      {!selectedMachine && machineAvailabilities.length > 1 && (
                        <div className="flex flex-wrap gap-1">
                          {machineAvailabilities
                            .slice(0, 3)
                            .map(({ machine, availability }) => (
                              <div
                                key={machine.id}
                                className={`
                                h-3 w-3 rounded-full text-xs
                                ${
                                  availability > 75
                                    ? "bg-green-400"
                                    : availability > 50
                                    ? "bg-yellow-400"
                                    : availability > 25
                                    ? "bg-orange-400"
                                    : "bg-red-400"
                                }
                              `}
                                title={`${machine.name}: ${Math.round(
                                  availability
                                )}% available`}
                              />
                            ))}
                          {machineAvailabilities.length > 3 && (
                            <div className="text-xs text-gray-500">
                              +{machineAvailabilities.length - 3}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* User's own reservations */}
                  {dayReservations.some(r => r.userId === currentUser.id) && (
                    <div className="absolute right-1 top-1">
                      <div
                        className="h-2 w-2 rounded-full bg-blue-500"
                        title="You have a booking"
                      ></div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              <div className="h-3 w-3 rounded-full bg-green-400"></div>
              <div className="h-3 w-3 rounded-full bg-yellow-400"></div>
              <div className="h-3 w-3 rounded-full bg-orange-400"></div>
              <div className="h-3 w-3 rounded-full bg-red-400"></div>
            </div>
            <span>Availability (High → Low)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-blue-500"></div>
            <span>Your bookings</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function WeeklyCalendarView({
  calendar,
  machines,
  selectedMachine,
  currentUser,
  onDateClick,
}: {
  calendar: any;
  machines: Machine[];
  selectedMachine?: Machine;
  currentUser: User;
  onDateClick: (date: Date) => void;
}) {
  const machinesToShow = selectedMachine ? [selectedMachine] : machines;

  return (
    <Card>
      <CardContent className="p-6">
        {/* Week Header */}
        <div className="mb-4 grid grid-cols-8 gap-2">
          <div className="p-2 text-sm font-medium text-gray-500">Machines</div>
          {calendar.weekDays?.map((day: any) => (
            <div
              key={day.date}
              className={`
                rounded-lg p-2 text-center text-sm font-medium
                ${day.isToday ? "bg-blue-100 text-blue-800" : "text-gray-700"}
              `}
            >
              <div>{day.dayShort}</div>
              <div className="text-xs text-gray-500">
                {day.date.split("-")[2]}
              </div>
            </div>
          ))}
        </div>

        {/* Machine Rows */}
        <div className="space-y-2">
          {calendar.calendar?.map((machineData: any) => (
            <div
              key={machineData.machine.id}
              className="grid grid-cols-8 items-center gap-2"
            >
              {/* Machine Info */}
              <div className="rounded-lg bg-gray-50 p-3">
                <div className="text-sm font-medium">
                  {machineData.machine.name}
                </div>
                <Badge
                  variant={
                    machineData.machine.type === "WASHER"
                      ? "default"
                      : "secondary"
                  }
                  className="mt-1 text-xs"
                >
                  {machineData.machine.type.toLowerCase()}
                </Badge>
              </div>

              {/* Daily Availability */}
              {machineData.days?.map((day: any) => (
                <div
                  key={day.dateString}
                  className="min-h-16 cursor-pointer rounded-lg border border-gray-200 p-2 hover:bg-gray-50"
                  onClick={() => onDateClick(new Date(day.date))}
                >
                  <AvailabilityIndicator
                    availability={day.availabilityPercentage}
                    size="sm"
                    showPercentage={true}
                  />

                  {day.reservations?.length > 0 && (
                    <div className="mt-1">
                      <Badge variant="outline" className="text-xs">
                        {day.reservations.length} bookings
                      </Badge>
                      {day.reservations.some(
                        (r: any) => r.userId === currentUser.id
                      ) && (
                        <div
                          className="mt-1 h-2 w-2 rounded-full bg-blue-500"
                          title="Your booking"
                        ></div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function DailyCalendarView({
  calendar,
  machines,
  selectedMachine,
  currentUser,
  onDateClick,
}: {
  calendar: any;
  machines: Machine[];
  selectedMachine?: Machine;
  currentUser: User;
  onDateClick: (date: Date) => void;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        {/* Time Header */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {calendar.calendar?.map((machineData: any) => (
            <div key={machineData.machine.id} className="space-y-2">
              {/* Machine Header */}
              <div className="rounded-lg bg-gray-50 p-3">
                <div className="font-medium">{machineData.machine.name}</div>
                <div className="mt-1 flex items-center gap-2">
                  <Badge
                    variant={
                      machineData.machine.type === "WASHER"
                        ? "default"
                        : "secondary"
                    }
                  >
                    {machineData.machine.type.toLowerCase()}
                  </Badge>
                  <span className="text-sm text-gray-600">
                    {machineData.machine.location}
                  </span>
                </div>
              </div>

              {/* Time Slots */}
              <div className="max-h-96 space-y-1 overflow-y-auto">
                {machineData.slots?.map((slot: any) => (
                  <div
                    key={slot.timeString}
                    className={`
                      cursor-pointer rounded border p-2 transition-colors
                      ${
                        slot.isAvailable
                          ? "border-green-200 bg-green-50 hover:bg-green-100"
                          : "border-red-200 bg-red-50"
                      }
                      ${
                        slot.reservations.some(
                          (r: any) => r.userId === currentUser.id
                        )
                          ? "ring-2 ring-blue-500"
                          : ""
                      }
                    `}
                    onClick={() =>
                      slot.isAvailable && onDateClick(new Date(slot.time))
                    }
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        {slot.timeString}
                      </span>
                      {slot.isAvailable ? (
                        <Badge
                          variant="outline"
                          className="border-green-300 text-green-700"
                        >
                          Available
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Booked</Badge>
                      )}
                    </div>

                    {slot.reservations.length > 0 && (
                      <div className="mt-1 text-xs text-gray-600">
                        {slot.reservations.map((reservation: any) => (
                          <div key={reservation.id}>
                            {reservation.isOwner
                              ? "Your booking"
                              : `${reservation.user.firstName} ${reservation.user.lastName}`}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
