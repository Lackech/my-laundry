import type { DataFunctionArgs, EntryContext } from "@remix-run/node";
import { isbot } from "isbot";
import {
  generateRequestId,
  createLoggingContext,
  RequestLogger,
  ErrorLogger,
  PerformanceLogger,
  sanitizeForLogging,
} from "./logging-utils";
import logger from "./logger";
import type { LoggingContext } from "../types/logging";

// Request context storage (for server-side)
const requestContexts = new Map<string, LoggingContext>();

// Extract request information from Remix request
function extractRequestInfo(request: Request): {
  method: string;
  url: string;
  userAgent?: string;
  ip?: string;
  referer?: string;
  contentLength?: number;
} {
  const url = new URL(request.url);

  return {
    method: request.method,
    url: url.pathname + url.search,
    userAgent: request.headers.get("User-Agent") || undefined,
    ip:
      request.headers.get("X-Forwarded-For") ||
      request.headers.get("X-Real-IP") ||
      request.headers.get("CF-Connecting-IP") ||
      "unknown",
    referer: request.headers.get("Referer") || undefined,
    contentLength: request.headers.get("Content-Length")
      ? parseInt(request.headers.get("Content-Length")!, 10)
      : undefined,
  };
}

// Middleware for logging requests in Remix loaders and actions
export function createLoggingMiddleware() {
  return {
    // Wrap loader functions
    wrapLoader: <T extends DataFunctionArgs>(
      loader: (args: T) => Promise<Response> | Response | Promise<any> | any,
      routeName?: string
    ) => {
      return async (args: T) => {
        const requestId = generateRequestId();
        const requestInfo = extractRequestInfo(args.request);

        const context = createLoggingContext(requestId, {
          userAgent: requestInfo.userAgent,
          ip: requestInfo.ip,
        });

        // Store context for potential use in actions
        requestContexts.set(requestId, context);

        const requestLogger = new RequestLogger(context);

        // Log the incoming request
        requestLogger.logRequest(requestInfo.method, requestInfo.url, {
          ...requestInfo,
          routeName,
          isBot: isbot(requestInfo.userAgent),
        });

        const startTime = Date.now();

        try {
          const result = await PerformanceLogger.measureAsync(
            `loader:${routeName || "unknown"}`,
            () => loader(args),
            {
              route: routeName,
              method: requestInfo.method,
              url: requestInfo.url,
            }
          );

          const duration = Date.now() - startTime;

          // Log successful response
          requestLogger.logResponse(200, duration, {
            ...requestInfo,
            routeName,
            success: true,
          });

          return result;
        } catch (error) {
          const duration = Date.now() - startTime;

          // Log error response
          requestLogger.logError(error as Error, {
            ...requestInfo,
            routeName,
            duration,
          });

          // Clean up context
          requestContexts.delete(requestId);

          throw error;
        } finally {
          // Clean up context after some time
          setTimeout(() => {
            requestContexts.delete(requestId);
          }, 5000);
        }
      };
    },

    // Wrap action functions
    wrapAction: <T extends DataFunctionArgs>(
      action: (args: T) => Promise<Response> | Response | Promise<any> | any,
      routeName?: string
    ) => {
      return async (args: T) => {
        const requestId = generateRequestId();
        const requestInfo = extractRequestInfo(args.request);

        const context = createLoggingContext(requestId, {
          userAgent: requestInfo.userAgent,
          ip: requestInfo.ip,
        });

        const requestLogger = new RequestLogger(context);

        // Log the incoming action
        requestLogger.logRequest(requestInfo.method, requestInfo.url, {
          ...requestInfo,
          routeName,
          isBot: isbot(requestInfo.userAgent),
          actionType: "action",
        });

        const startTime = Date.now();

        try {
          // For actions, we might want to log the form data (sanitized)
          let formData: any = null;
          if (requestInfo.method === "POST" || requestInfo.method === "PUT") {
            try {
              const clonedRequest = args.request.clone();
              const formDataEntries = await clonedRequest.formData();
              formData = sanitizeForLogging(
                Object.fromEntries(formDataEntries)
              );
            } catch {
              // If we can't parse form data, that's okay
            }
          }

          const result = await PerformanceLogger.measureAsync(
            `action:${routeName || "unknown"}`,
            () => action(args),
            {
              route: routeName,
              method: requestInfo.method,
              url: requestInfo.url,
              formData,
            }
          );

          const duration = Date.now() - startTime;

          // Log successful response
          requestLogger.logResponse(200, duration, {
            ...requestInfo,
            routeName,
            success: true,
            actionType: "action",
          });

          return result;
        } catch (error) {
          const duration = Date.now() - startTime;

          // Log error response
          requestLogger.logError(error as Error, {
            ...requestInfo,
            routeName,
            duration,
            actionType: "action",
          });

          throw error;
        }
      };
    },
  };
}

// Server-side rendering logging
export function logServerRender(
  request: Request,
  context: EntryContext,
  startTime: number
) {
  const requestId = generateRequestId();
  const requestInfo = extractRequestInfo(request);

  const loggingContext = createLoggingContext(requestId, {
    userAgent: requestInfo.userAgent,
    ip: requestInfo.ip,
  });

  const requestLogger = new RequestLogger(loggingContext);
  const duration = Date.now() - startTime;

  requestLogger.logResponse(200, duration, {
    ...requestInfo,
    routeName: "server-render",
    isBot: isbot(requestInfo.userAgent),
    matches: (context as any).matches?.length || 0,
  });
}

// Error boundary logging
export function logErrorBoundary(
  error: Error,
  errorInfo: { componentStack?: string },
  request?: Request,
  context?: Record<string, any>
) {
  generateRequestId();

  let requestInfo = {};
  if (request) {
    requestInfo = extractRequestInfo(request);
  }

  ErrorLogger.logError(error, {
    ...requestInfo,
    componentStack: errorInfo.componentStack,
    boundaryType: "error-boundary",
    context,
  });
}

// Route-level logging helper
export function createRouteLogger(routeName: string) {
  return {
    info: (message: string, meta?: Record<string, any>) => {
      logger.info(`[${routeName}] ${message}`, meta);
    },
    warn: (message: string, meta?: Record<string, any>) => {
      logger.warn(`[${routeName}] ${message}`, meta);
    },
    error: (message: string, meta?: Record<string, any>) => {
      logger.error(`[${routeName}] ${message}`, meta);
    },
    debug: (message: string, meta?: Record<string, any>) => {
      logger.debug(`[${routeName}] ${message}`, meta);
    },
  };
}

// Utility to get current request context
export function getCurrentRequestContext(
  requestId: string
): LoggingContext | undefined {
  return requestContexts.get(requestId);
}

// Cleanup function for request contexts
export function cleanupRequestContexts() {
  const now = Date.now();
  const fiveMinutesAgo = now - 5 * 60 * 1000;

  for (const [requestId, context] of requestContexts.entries()) {
    if (context.startTime < fiveMinutesAgo) {
      requestContexts.delete(requestId);
    }
  }
}

// Auto-cleanup every 5 minutes
setInterval(cleanupRequestContexts, 5 * 60 * 1000);

// Export the default middleware instance
export const loggingMiddleware = createLoggingMiddleware();
