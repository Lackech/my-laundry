import { Card, CardHeader, CardTitle, CardContent } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";

interface QueueEntry {
  id: string;
  position: number;
  status: "WAITING" | "NOTIFIED" | "EXPIRED" | "CANCELLED";
  machineType?: "WASHER" | "DRYER";
  estimatedWaitTime?: number;
  joinedAt: string;
  machine?: {
    id: string;
    name: string;
    type: "WASHER" | "DRYER";
    location: string;
  };
}

interface QueueStatusProps {
  queueEntries: QueueEntry[];
}

export function QueueStatus({ queueEntries }: QueueStatusProps) {
  const getMachineIcon = (type: string) => {
    return type === "WASHER" ? "🧺" : "🌀";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "WAITING":
        return "bg-yellow-100 text-yellow-800";
      case "NOTIFIED":
        return "bg-green-100 text-green-800";
      case "EXPIRED":
        return "bg-red-100 text-red-800";
      case "CANCELLED":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatWaitTime = (minutes?: number) => {
    if (!minutes) return "Unknown";

    if (minutes < 60) {
      return `${minutes} min`;
    } else {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return `${hours}h ${remainingMinutes}m`;
    }
  };

  const formatJoinTime = (joinedAt: string) => {
    const date = new Date(joinedAt);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Queue Status</CardTitle>
      </CardHeader>

      <CardContent>
        {queueEntries.length > 0 ? (
          <div className="space-y-4">
            {queueEntries.map(entry => (
              <div
                key={entry.id}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">
                    {getMachineIcon(
                      entry.machine?.type || entry.machineType || "WASHER"
                    )}
                  </span>
                  <div>
                    <p className="font-medium">
                      {entry.machine?.name ||
                        `Any ${entry.machineType?.toLowerCase()}`}
                    </p>
                    {entry.machine?.location && (
                      <p className="text-sm text-gray-600">
                        {entry.machine.location}
                      </p>
                    )}
                    <p className="text-sm text-gray-500">
                      Joined: {formatJoinTime(entry.joinedAt)}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <div className="mb-2 flex items-center gap-2">
                    <Badge className={getStatusColor(entry.status)}>
                      {entry.status.toLowerCase()}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600">
                    Position:{" "}
                    <span className="font-medium">#{entry.position}</span>
                  </p>
                  {entry.estimatedWaitTime && (
                    <p className="text-sm text-gray-600">
                      Wait:{" "}
                      <span className="font-medium">
                        {formatWaitTime(entry.estimatedWaitTime)}
                      </span>
                    </p>
                  )}
                </div>
              </div>
            ))}

            <div className="flex justify-center pt-4">
              <Button variant="outline" size="sm" asChild>
                <a href="/queue">Manage Queue</a>
              </Button>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center">
            <div className="mb-2 text-gray-400">
              <span className="text-4xl">⏳</span>
            </div>
            <p className="text-gray-500">You&apos;re not in any queues</p>
            <Button className="mt-3" size="sm" asChild>
              <a href="/queue">Join Queue</a>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
