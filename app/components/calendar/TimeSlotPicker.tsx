import { useState, useEffect } from "react";
import { format, addMinutes } from "date-fns";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  generateTimeSlots,
  validateBookingRequest,
  formatDuration,
  suggestBookingTime,
} from "~/lib/calendar-utils";
import AvailabilityIndicator, {
  AvailabilityBadge,
} from "./AvailabilityIndicator";
import type { Machine, User } from "~/types";

interface TimeSlotPickerProps {
  selectedDate: Date;
  machines: Machine[];
  onBooking: (
    startTime: Date,
    endTime: Date,
    machineId: string,
    notes?: string
  ) => void;
  onClose: () => void;
  currentUser: User;
}

export default function TimeSlotPicker({
  selectedDate,
  machines,
  onBooking,
  onClose,
}: TimeSlotPickerProps) {
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<Date | null>(null);
  const [duration, setDuration] = useState(30); // Default 30 minutes
  const [notes, setNotes] = useState("");
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch reservations for the selected date
  useEffect(() => {
    const fetchReservations = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `/api/calendar?view=daily&date=${format(selectedDate, "yyyy-MM-dd")}`
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch data: ${response.statusText}`);
        }

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || "Failed to load calendar data");
        }

        if (data.calendar) {
          // Extract all reservations from the calendar data
          const allReservations = data.calendar.flatMap((machineData: any) =>
            machineData.slots.flatMap((slot: any) => slot.reservations)
          );
          setReservations(allReservations);
        } else {
          setReservations([]);
        }
      } catch (err) {
        console.error("Error fetching reservations:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load availability data"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchReservations();
  }, [selectedDate]);

  // Auto-select first available machine
  useEffect(() => {
    if (machines.length > 0 && !selectedMachine) {
      setSelectedMachine(machines[0]);
    }
  }, [machines, selectedMachine]);

  const handleBooking = () => {
    if (!selectedMachine || !selectedTimeSlot) return;

    const endTime = addMinutes(selectedTimeSlot, duration);
    const validation = validateBookingRequest(
      selectedTimeSlot,
      endTime,
      selectedMachine,
      reservations
    );

    if (!validation.isValid) {
      setError(validation.error || "Invalid booking request");
      return;
    }

    onBooking(selectedTimeSlot, endTime, selectedMachine.id, notes);
  };

  const suggestOptimalTime = () => {
    if (!selectedMachine) return;

    const suggestion = suggestBookingTime(
      selectedMachine,
      reservations,
      selectedDate,
      duration
    );

    if (suggestion) {
      setSelectedTimeSlot(suggestion.startTime);
      setError(null);
    } else {
      setError("No available time slots found for this machine");
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <Card className="mx-4 w-full max-w-md">
          <CardContent className="p-6 text-center">
            <div className="flex flex-col items-center space-y-4">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
              <p>Loading availability...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <Card className="mx-4 w-full max-w-md">
          <CardContent className="p-6 text-center">
            <div className="mb-2 text-red-600">⚠️ Error</div>
            <p className="mb-4 text-gray-600">{error}</p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
              <Button onClick={() => window.location.reload()}>Retry</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-2 md:p-4">
      <Card className="max-h-[95vh] w-full max-w-4xl overflow-hidden md:max-h-[90vh]">
        <CardHeader className="border-b p-4 md:p-6">
          <div className="flex items-start justify-between md:items-center">
            <CardTitle className="pr-4 text-lg md:text-xl">
              Book a Machine - {format(selectedDate, "EEEE, MMMM d, yyyy")}
            </CardTitle>
            <Button variant="ghost" onClick={onClose} className="shrink-0">
              ✕
            </Button>
          </div>
        </CardHeader>

        <CardContent className="overflow-y-auto p-4 md:p-6">
          <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-2">
            {/* Machine Selection */}
            <div className="space-y-4">
              <div>
                <Label className="text-base font-semibold">
                  Select Machine
                </Label>
                <div className="mt-2 grid grid-cols-1 gap-2">
                  {machines.map(machine => (
                    <div
                      key={machine.id}
                      className={`
                        cursor-pointer rounded-lg border p-2 transition-all md:p-3
                        ${
                          selectedMachine?.id === machine.id
                            ? "border-blue-500 bg-blue-50 ring-1 ring-blue-200 md:ring-2"
                            : "border-gray-200 hover:bg-gray-50"
                        }
                        ${
                          machine.isOutOfOrder || machine.status !== "AVAILABLE"
                            ? "cursor-not-allowed opacity-50"
                            : ""
                        }
                      `}
                      onClick={() => {
                        if (
                          !machine.isOutOfOrder &&
                          machine.status === "AVAILABLE"
                        ) {
                          setSelectedMachine(machine);
                          setSelectedTimeSlot(null);
                          setError(null);
                        }
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-medium">{machine.name}</div>
                          <div className="text-sm text-gray-600">
                            {machine.location}
                          </div>
                          <div className="mt-1 flex items-center gap-2">
                            <Badge
                              variant={
                                machine.type === "WASHER"
                                  ? "default"
                                  : "secondary"
                              }
                            >
                              {machine.type.toLowerCase()}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              {machine.capacity} lbs
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          {machine.isOutOfOrder ? (
                            <Badge variant="destructive">Out of Order</Badge>
                          ) : machine.status !== "AVAILABLE" ? (
                            <Badge variant="secondary">{machine.status}</Badge>
                          ) : (
                            <AvailabilityBadge
                              availability={calculateMachineAvailability(
                                machine
                              )}
                              size="sm"
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Duration Selection */}
              <div>
                <Label htmlFor="duration" className="text-base font-semibold">
                  Duration
                </Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {[30, 60, 90, 120].map(mins => (
                    <Button
                      key={mins}
                      variant={duration === mins ? "default" : "outline"}
                      size="sm"
                      onClick={() => setDuration(mins)}
                      className="text-xs md:text-sm"
                    >
                      {formatDuration(mins)}
                    </Button>
                  ))}
                </div>
                <Input
                  id="duration"
                  type="number"
                  value={duration}
                  onChange={e =>
                    setDuration(
                      Math.max(
                        30,
                        Math.min(180, parseInt(e.target.value) || 30)
                      )
                    )
                  }
                  min={30}
                  max={180}
                  step={15}
                  className="mt-2"
                  placeholder="Custom duration (minutes)"
                />
              </div>

              {/* Notes */}
              <div>
                <Label htmlFor="notes" className="text-base font-semibold">
                  Notes (Optional)
                </Label>
                <Input
                  id="notes"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Any special notes for your booking..."
                  className="mt-2"
                />
              </div>

              {/* Quick Actions */}
              <div className="space-y-2">
                <Button
                  variant="outline"
                  onClick={suggestOptimalTime}
                  disabled={!selectedMachine}
                  className="w-full"
                >
                  Suggest Best Time
                </Button>
              </div>
            </div>

            {/* Time Slot Selection */}
            <div className="space-y-4">
              <div>
                <Label className="text-base font-semibold">
                  Available Time Slots
                </Label>
                {selectedMachine && (
                  <div className="mt-2 max-h-96 space-y-1 overflow-y-auto">
                    {generateTimeSlots(
                      selectedDate,
                      selectedMachine,
                      reservations,
                      30
                    ).map(slot => {
                      const endTime = addMinutes(slot.time, duration);
                      const isValidSlot = validateBookingRequest(
                        slot.time,
                        endTime,
                        selectedMachine,
                        reservations
                      ).isValid;

                      return (
                        <div
                          key={slot.timeString}
                          className={`
                            cursor-pointer rounded border p-2 transition-all md:p-3
                            ${
                              selectedTimeSlot?.getTime() ===
                              slot.time.getTime()
                                ? "border-blue-500 bg-blue-50 ring-1 ring-blue-200 md:ring-2"
                                : slot.isAvailable && isValidSlot
                                ? "border-green-200 bg-green-50 hover:bg-green-100"
                                : "cursor-not-allowed border-red-200 bg-red-50 opacity-50"
                            }
                          `}
                          onClick={() => {
                            if (slot.isAvailable && isValidSlot) {
                              setSelectedTimeSlot(slot.time);
                              setError(null);
                            }
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">
                                {slot.timeString} - {format(endTime, "HH:mm")}
                              </div>
                              <div className="text-sm text-gray-600">
                                {formatDuration(duration)}
                              </div>
                            </div>
                            <div>
                              {slot.isAvailable && isValidSlot ? (
                                <Badge
                                  variant="outline"
                                  className="border-green-300 text-green-700"
                                >
                                  Available
                                </Badge>
                              ) : (
                                <Badge variant="secondary">
                                  {slot.reservations.length > 0
                                    ? "Booked"
                                    : "Unavailable"}
                                </Badge>
                              )}
                            </div>
                          </div>

                          {slot.reservations.length > 0 && (
                            <div className="mt-1 text-xs text-gray-600">
                              {slot.reservations.map((reservation: any) => (
                                <div key={reservation.id}>
                                  {reservation.isOwner
                                    ? "Your booking"
                                    : "Reserved"}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-red-800">
              {error}
            </div>
          )}

          {/* Booking Summary */}
          {selectedMachine && selectedTimeSlot && (
            <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
              <h4 className="mb-2 font-semibold text-blue-900">
                Booking Summary
              </h4>
              <div className="space-y-1 text-sm text-blue-800">
                <div>
                  <strong>Machine:</strong> {selectedMachine.name} (
                  {selectedMachine.type.toLowerCase()})
                </div>
                <div>
                  <strong>Date:</strong>{" "}
                  {format(selectedDate, "EEEE, MMMM d, yyyy")}
                </div>
                <div>
                  <strong>Time:</strong> {format(selectedTimeSlot, "HH:mm")} -{" "}
                  {format(addMinutes(selectedTimeSlot, duration), "HH:mm")}
                </div>
                <div>
                  <strong>Duration:</strong> {formatDuration(duration)}
                </div>
                {notes && (
                  <div>
                    <strong>Notes:</strong> {notes}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-4 flex flex-col gap-3 md:mt-6 md:flex-row">
            <Button
              onClick={handleBooking}
              disabled={!selectedMachine || !selectedTimeSlot}
              className="order-2 flex-1 md:order-1"
            >
              Confirm Booking
            </Button>
            <Button
              variant="outline"
              onClick={onClose}
              className="order-1 md:order-2"
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  function calculateMachineAvailability(machine: Machine): number {
    if (machine.isOutOfOrder || machine.status !== "AVAILABLE") {
      return 0;
    }

    const slots = generateTimeSlots(selectedDate, machine, reservations, 30);
    const availableSlots = slots.filter(slot => slot.isAvailable);

    return slots.length > 0 ? (availableSlots.length / slots.length) * 100 : 0;
  }
}
