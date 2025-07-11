import { Card, CardHeader, CardTitle, CardContent } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";

interface Reservation {
  id: string;
  startTime: string;
  endTime: string;
  status: "ACTIVE" | "COMPLETED" | "CANCELLED";
  machine: {
    id: string;
    name: string;
    type: "WASHER" | "DRYER";
    location: string;
  };
  notes?: string;
}

interface ReservationSummaryProps {
  reservations: Reservation[];
  title?: string;
  maxItems?: number;
}

export function ReservationSummary({
  reservations,
  title = "Your Reservations",
  maxItems = 5,
}: ReservationSummaryProps) {
  const displayReservations = reservations.slice(0, maxItems);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-100 text-green-800";
      case "COMPLETED":
        return "bg-blue-100 text-blue-800";
      case "CANCELLED":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getMachineIcon = (type: string) => {
    return type === "WASHER" ? "🧺" : "🌀";
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const isUpcoming = (startTime: string) => {
    return new Date(startTime) > new Date();
  };

  const isCurrent = (startTime: string, endTime: string) => {
    const now = new Date();
    return new Date(startTime) <= now && new Date(endTime) >= now;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{title}</CardTitle>
          {reservations.length > maxItems && (
            <Button variant="ghost" size="sm" asChild>
              <a href="/reservations">View All</a>
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {displayReservations.length > 0 ? (
          <div className="space-y-4">
            {displayReservations.map(reservation => (
              <div
                key={reservation.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">
                    {getMachineIcon(reservation.machine.type)}
                  </span>
                  <div>
                    <p className="font-medium">{reservation.machine.name}</p>
                    <p className="text-sm text-gray-600">
                      {reservation.machine.location}
                    </p>
                    <p className="text-sm text-gray-500">
                      {formatTime(reservation.startTime)} -{" "}
                      {formatTime(reservation.endTime)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isCurrent(reservation.startTime, reservation.endTime) && (
                    <Badge className="bg-green-100 text-green-800">
                      Active
                    </Badge>
                  )}
                  {isUpcoming(reservation.startTime) && (
                    <Badge className="bg-blue-100 text-blue-800">
                      Upcoming
                    </Badge>
                  )}
                  <Badge className={getStatusColor(reservation.status)}>
                    {reservation.status.toLowerCase()}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center">
            <div className="mb-2 text-gray-400">
              <span className="text-4xl">📅</span>
            </div>
            <p className="text-gray-500">No reservations found</p>
            <Button className="mt-3" size="sm" asChild>
              <a href="/machines">Book a Machine</a>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
