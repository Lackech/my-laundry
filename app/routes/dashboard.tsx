import { type LoaderFunctionArgs, json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { requireEmailVerification } from "~/lib/auth.middleware";
import { Header } from "~/components/layout/Header";
import { MachineStatusCard } from "~/components/dashboard/MachineStatusCard";
import { QueueStatus } from "~/components/dashboard/QueueStatus";
import { Button } from "~/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "~/components/ui/card";

export async function loader({ request }: LoaderFunctionArgs) {
  // Require authentication
  const user = await requireEmailVerification(request);

  // Fetch data in parallel
  const [machinesResponse, reservationsResponse, queueResponse] =
    await Promise.all([
      fetch(new URL("/api/machines", request.url), {
        headers: {
          Authorization: `Bearer ${
            request.headers.get("Authorization")?.substring(7) || ""
          }`,
        },
      }),
      fetch(new URL("/api/reservations", request.url), {
        headers: {
          Authorization: `Bearer ${
            request.headers.get("Authorization")?.substring(7) || ""
          }`,
        },
      }),
      fetch(new URL("/api/queue", request.url), {
        headers: {
          Authorization: `Bearer ${
            request.headers.get("Authorization")?.substring(7) || ""
          }`,
        },
      }),
    ]);

  const machines = machinesResponse.ok
    ? await machinesResponse.json()
    : { machines: [] };
  const reservations = reservationsResponse.ok
    ? await reservationsResponse.json()
    : { reservations: [] };
  const queue = queueResponse.ok
    ? await queueResponse.json()
    : { queueEntries: [] };

  return json({
    user,
    machines: machines.machines || [],
    reservations: reservations.reservations || [],
    queueEntries: queue.queueEntries || [],
  });
}

export default function Dashboard() {
  const { user, machines, reservations, queueEntries } =
    useLoaderData<typeof loader>();

  // Filter and organize data
  const availableMachines = machines.filter((m: any) => m.isAvailable);
  const inUseMachines = machines.filter((m: any) => m.currentReservations > 0);

  const activeReservations = reservations.filter(
    (r: any) => r.status === "ACTIVE"
  );
  const upcomingReservations = activeReservations.filter(
    (r: any) => new Date(r.startTime) > new Date()
  );
  const currentReservations = activeReservations.filter(
    (r: any) =>
      new Date(r.startTime) <= new Date() && new Date(r.endTime) >= new Date()
  );

  const activeQueueEntries = queueEntries.filter(
    (q: any) => q.status === "WAITING"
  );

  return (
    <div className="min-h-screen">
      <Header user={user} />
      <div className="container mx-auto p-6">
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold text-gray-900">
            Welcome back, {user.firstName}!
          </h1>
          <p className="text-gray-600">
            Here&apos;s your laundry schedule overview
          </p>
        </div>

        {/* Quick Actions */}
        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
          <Button className="h-12" asChild>
            <a href="/machines">Book a Machine</a>
          </Button>
          <Button variant="outline" className="h-12" asChild>
            <a href="/calendar">View Calendar</a>
          </Button>
          <Button variant="outline" className="h-12" asChild>
            <a href="/queue">Join Queue</a>
          </Button>
        </div>

        {/* Stats Overview */}
        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Available Machines
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {availableMachines.length}
              </div>
              <p className="text-xs text-gray-500">Ready to use</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                In Use
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {inUseMachines.length}
              </div>
              <p className="text-xs text-gray-500">Currently occupied</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Your Reservations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {activeReservations.length}
              </div>
              <p className="text-xs text-gray-500">Active bookings</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Queue Position
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {activeQueueEntries.length > 0
                  ? activeQueueEntries[0].position
                  : "-"}
              </div>
              <p className="text-xs text-gray-500">
                {activeQueueEntries.length > 0 ? "In queue" : "Not in queue"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Current Status */}
        <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Current Reservations</CardTitle>
            </CardHeader>
            <CardContent>
              {currentReservations.length > 0 ? (
                <div className="space-y-4">
                  {currentReservations.map((reservation: any) => (
                    <div
                      key={reservation.id}
                      className="flex items-center justify-between rounded-lg bg-green-50 p-3"
                    >
                      <div>
                        <p className="font-medium">
                          {reservation.machine.name}
                        </p>
                        <p className="text-sm text-gray-600">
                          Ends at{" "}
                          {new Date(reservation.endTime).toLocaleTimeString()}
                        </p>
                      </div>
                      <div className="font-semibold text-green-600">Active</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-4 text-center text-gray-500">
                  No active reservations
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Upcoming Reservations</CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingReservations.length > 0 ? (
                <div className="space-y-4">
                  {upcomingReservations.slice(0, 3).map((reservation: any) => (
                    <div
                      key={reservation.id}
                      className="flex items-center justify-between rounded-lg bg-blue-50 p-3"
                    >
                      <div>
                        <p className="font-medium">
                          {reservation.machine.name}
                        </p>
                        <p className="text-sm text-gray-600">
                          {new Date(reservation.startTime).toLocaleString()}
                        </p>
                      </div>
                      <div className="font-semibold text-blue-600">
                        Upcoming
                      </div>
                    </div>
                  ))}
                  {upcomingReservations.length > 3 && (
                    <p className="text-center">
                      <a
                        href="/reservations"
                        className="text-blue-600 hover:underline"
                      >
                        View all {upcomingReservations.length} reservations
                      </a>
                    </p>
                  )}
                </div>
              ) : (
                <p className="py-4 text-center text-gray-500">
                  No upcoming reservations
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Machine Status Grid */}
        <div className="mb-8">
          <h2 className="mb-4 text-xl font-semibold">Machine Status</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {machines.map((machine: any) => (
              <MachineStatusCard key={machine.id} machine={machine} />
            ))}
          </div>
        </div>

        {/* Queue Status */}
        {activeQueueEntries.length > 0 && (
          <div className="mb-8">
            <h2 className="mb-4 text-xl font-semibold">Queue Status</h2>
            <QueueStatus queueEntries={activeQueueEntries} />
          </div>
        )}
      </div>
    </div>
  );
}
