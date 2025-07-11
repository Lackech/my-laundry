import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useRouteError,
  isRouteErrorResponse,
} from "@remix-run/react";
import type { LinksFunction } from "@remix-run/node";
import { useEffect } from "react";

import "./tailwind.css";
import {
  setupGlobalErrorHandlers,
  logRouteError,
} from "./lib/error-boundary-logger";
import { SystemLogger } from "./lib/logging-utils";

// Setup global error handlers on the server
if (typeof window === "undefined") {
  setupGlobalErrorHandlers();
}

export const links: LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Log application startup on client
    if (typeof window !== "undefined") {
      SystemLogger.logStartup("client-app", {
        userAgent: navigator.userAgent,
        url: window.location.href,
      });
    }
  }, []);

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

// Error boundary for the root of the application
export function ErrorBoundary() {
  const error = useRouteError();

  useEffect(() => {
    // Log the error when the component mounts
    logRouteError(error, "root", undefined, {
      url: typeof window !== "undefined" ? window.location.href : "unknown",
      userAgent:
        typeof window !== "undefined" ? navigator.userAgent : "unknown",
    });
  }, [error]);

  if (isRouteErrorResponse(error)) {
    return (
      <html lang="en">
        <head>
          <meta charSet="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <Meta />
          <Links />
          <title>Error {error.status}</title>
        </head>
        <body className="flex min-h-screen flex-col items-center justify-center bg-gray-100 px-4">
          <div className="max-w-md text-center">
            <h1 className="mb-4 text-6xl font-bold text-gray-900">
              {error.status}
            </h1>
            <p className="mb-6 text-xl text-gray-600">
              {error.statusText || "Something went wrong"}
            </p>
            <a
              href="/"
              className="inline-block rounded-lg bg-blue-600 px-6 py-3 text-white transition-colors hover:bg-blue-700"
            >
              Go Home
            </a>
          </div>
          <Scripts />
        </body>
      </html>
    );
  }

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
        <title>Application Error</title>
      </head>
      <body className="flex min-h-screen flex-col items-center justify-center bg-gray-100 px-4">
        <div className="max-w-md text-center">
          <h1 className="mb-4 text-6xl font-bold text-gray-900">Oops!</h1>
          <p className="mb-6 text-xl text-gray-600">
            Something went wrong. Please try again later.
          </p>
          <a
            href="/"
            className="inline-block rounded-lg bg-blue-600 px-6 py-3 text-white transition-colors hover:bg-blue-700"
          >
            Go Home
          </a>
        </div>
        <Scripts />
      </body>
    </html>
  );
}
