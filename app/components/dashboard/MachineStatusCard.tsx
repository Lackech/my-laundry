import { Card, CardHeader, CardTitle, CardContent } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";

interface Machine {
  id: string;
  name: string;
  type: "WASHER" | "DRYER";
  status: "AVAILABLE" | "IN_USE" | "MAINTENANCE" | "OUT_OF_ORDER";
  location: string;
  capacity: number;
  isOutOfOrder: boolean;
  outOfOrderReason?: string;
  currentReservations: number;
  queueLength: number;
  isAvailable: boolean;
  estimatedAvailableAt?: Date;
}

interface MachineStatusCardProps {
  machine: Machine;
}

export function MachineStatusCard({ machine }: MachineStatusCardProps) {
  const getStatusColor = (status: string, isOutOfOrder: boolean) => {
    if (isOutOfOrder) return "bg-red-100 text-red-800";

    switch (status) {
      case "AVAILABLE":
        return "bg-green-100 text-green-800";
      case "IN_USE":
        return "bg-blue-100 text-blue-800";
      case "MAINTENANCE":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (machine: Machine) => {
    if (machine.isOutOfOrder) return "Out of Order";
    if (machine.currentReservations > 0) return "In Use";
    if (machine.status === "MAINTENANCE") return "Maintenance";
    return "Available";
  };

  const getMachineIcon = (type: string) => {
    return type === "WASHER" ? "🧺" : "🌀";
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{getMachineIcon(machine.type)}</span>
            <div>
              <CardTitle className="text-lg">{machine.name}</CardTitle>
              <p className="text-sm text-gray-500">{machine.location}</p>
            </div>
          </div>
          <Badge
            className={getStatusColor(machine.status, machine.isOutOfOrder)}
          >
            {getStatusText(machine)}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Capacity:</span>
            <span className="font-medium">{machine.capacity} lbs</span>
          </div>

          {machine.queueLength > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Queue:</span>
              <span className="font-medium">{machine.queueLength} waiting</span>
            </div>
          )}

          {machine.isOutOfOrder && machine.outOfOrderReason && (
            <div className="rounded bg-red-50 p-2 text-sm text-red-600">
              {machine.outOfOrderReason}
            </div>
          )}

          {machine.currentReservations > 0 && machine.estimatedAvailableAt && (
            <div className="rounded bg-blue-50 p-2 text-sm text-blue-600">
              Available at{" "}
              {new Date(machine.estimatedAvailableAt).toLocaleTimeString()}
            </div>
          )}

          <div className="space-y-2 pt-2">
            {machine.isAvailable ? (
              <Button className="w-full" size="sm" asChild>
                <a href={`/machines/${machine.id}/book`}>Book Now</a>
              </Button>
            ) : (
              <Button variant="outline" className="w-full" size="sm" asChild>
                <a href={`/queue?machine=${machine.id}`}>Join Queue</a>
              </Button>
            )}

            <Button variant="ghost" size="sm" className="w-full" asChild>
              <a href={`/machines/${machine.id}`}>View Details</a>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
