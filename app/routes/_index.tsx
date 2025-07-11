import type { MetaFunction, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import { MainLayout } from "~/components/layout/MainLayout";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { createLogger } from "~/lib/logging";

const logger = createLogger("routes/_index");

export const meta: MetaFunction = () => {
  return [
    { title: "My Laundry - Home" },
    { name: "description", content: "Welcome to My Laundry Calendar!" },
  ];
};

export async function loader({ request }: LoaderFunctionArgs) {
  logger.info("Home page loaded", {
    url: request.url,
    userAgent: request.headers.get("User-Agent"),
  });

  // Simulate some async work to demonstrate performance logging
  const data = await logger.measureAsync("load-dashboard-data", async () => {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 100));

    return {
      scheduledLoads: 0,
      completedToday: 0,
      upcomingReminders: [],
      loadTime: Date.now(),
    };
  });

  logger.info("Dashboard data loaded successfully", {
    scheduledLoads: data.scheduledLoads,
    completedToday: data.completedToday,
  });

  return json(data);
}

export default function Index() {
  const data = useLoaderData<typeof loader>();

  return (
    <MainLayout>
      <div className="container py-8">
        <div className="flex flex-col items-center gap-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none">
              Welcome to My Laundry
            </h1>
            <p className="mx-auto mt-4 max-w-[700px] text-gray-500 dark:text-gray-400 md:text-xl">
              Keep track of your laundry schedule and never forget to move
              clothes from washer to dryer again.
            </p>
            <p className="mt-2 text-sm text-gray-400">
              Page loaded at {new Date(data.loadTime).toLocaleTimeString()}
            </p>
          </div>

          <div className="grid w-full max-w-4xl gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Schedule Laundry
                  <Badge variant="secondary">New</Badge>
                </CardTitle>
                <CardDescription>
                  Plan your laundry loads for the week ahead
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" size="sm" asChild>
                  <Link to="/login">Create Schedule</Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Add</CardTitle>
                <CardDescription>
                  Add items to your laundry basket quickly
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full" size="sm" asChild>
                  <Link to="/login">Add Items</Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>View Progress</CardTitle>
                <CardDescription>
                  Check the status of your current loads
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full" size="sm" asChild>
                  <Link to="/login">View Status</Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="w-full max-w-4xl">
            <Card>
              <CardHeader>
                <CardTitle>Today&apos;s Laundry</CardTitle>
                <CardDescription>
                  You have no laundry scheduled for today
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="py-8 text-center">
                  <p className="text-muted-foreground">
                    Great! You&apos;re all caught up. Enjoy your free time!
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
