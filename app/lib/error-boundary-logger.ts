import { isRouteErrorResponse } from "@remix-run/react";
// import { ErrorLogger } from "./logging-utils";
import logger from "./logger";
import type { ErrorLogMeta } from "../types/logging";

// Error boundary logging utilities
export class ErrorBoundaryLogger {
  static logRouteError(
    error: unknown,
    routeName: string,
    userId?: string,
    context?: Record<string, any>
  ): void {
    if (isRouteErrorResponse(error)) {
      // This is a Remix route error response
      const meta: ErrorLogMeta = {
        method: "ROUTE_ERROR",
        url: routeName,
        errorType: "RouteErrorResponse",
        errorMessage: error.statusText || `HTTP ${error.status}`,
        errorCode: error.status,
        userId,
        context: {
          routeName,
          status: error.status,
          statusText: error.statusText,
          data: error.data,
          ...context,
        },
      };

      const logLevel = error.status >= 500 ? "error" : "warn";
      logger.log(
        logLevel,
        `Route error: ${error.status} ${error.statusText}`,
        meta
      );
    } else if (error instanceof Error) {
      // This is a regular JavaScript error
      const meta: ErrorLogMeta = {
        method: "ROUTE_ERROR",
        url: routeName,
        errorType: error.constructor.name,
        errorMessage: error.message,
        errorStack: error.stack,
        userId,
        context: {
          routeName,
          ...context,
        },
      };

      logger.error(`Route error: ${error.message}`, meta);
    } else {
      // Unknown error type
      const meta: ErrorLogMeta = {
        method: "ROUTE_ERROR",
        url: routeName,
        errorType: "UnknownError",
        errorMessage: String(error),
        userId,
        context: {
          routeName,
          error: error,
          ...context,
        },
      };

      logger.error(`Unknown route error: ${String(error)}`, meta);
    }
  }

  static logComponentError(
    error: Error,
    componentName: string,
    componentStack?: string,
    userId?: string,
    context?: Record<string, any>
  ): void {
    const meta: ErrorLogMeta = {
      method: "COMPONENT_ERROR",
      url: componentName,
      errorType: error.constructor.name,
      errorMessage: error.message,
      errorStack: error.stack,
      userId,
      context: {
        componentName,
        componentStack,
        ...context,
      },
    };

    logger.error(`Component error: ${error.message}`, meta);
  }

  static logUnhandledRejection(
    reason: any,
    promise: Promise<any>,
    context?: Record<string, any>
  ): void {
    const meta: ErrorLogMeta = {
      method: "UNHANDLED_REJECTION",
      url: "GLOBAL",
      errorType: "UnhandledPromiseRejection",
      errorMessage: reason instanceof Error ? reason.message : String(reason),
      errorStack: reason instanceof Error ? reason.stack : undefined,
      context: {
        reason: reason instanceof Error ? reason.message : reason,
        ...context,
      },
    };

    logger.error(`Unhandled promise rejection: ${meta.errorMessage}`, meta);
  }

  static logUncaughtException(
    error: Error,
    context?: Record<string, any>
  ): void {
    const meta: ErrorLogMeta = {
      method: "UNCAUGHT_EXCEPTION",
      url: "GLOBAL",
      errorType: error.constructor.name,
      errorMessage: error.message,
      errorStack: error.stack,
      context,
    };

    logger.error(`Uncaught exception: ${error.message}`, meta);
  }
}

// React Error Boundary component with logging
export class LoggingErrorBoundary extends Error {
  constructor(
    message: string,
    public componentStack: string,
    public errorBoundary: string
  ) {
    super(message);
    this.name = "LoggingErrorBoundary";
  }
}

// Utility functions for error boundary integration
export function createErrorBoundaryLogger(boundaryName: string) {
  return {
    logError: (
      error: Error,
      errorInfo: { componentStack?: string },
      context?: Record<string, any>
    ) => {
      ErrorBoundaryLogger.logComponentError(
        error,
        boundaryName,
        errorInfo.componentStack,
        undefined, // userId would need to be passed from context
        context
      );
    },
    logRouteError: (
      error: unknown,
      routeName: string,
      context?: Record<string, any>
    ) => {
      ErrorBoundaryLogger.logRouteError(error, routeName, undefined, context);
    },
  };
}

// Global error handlers setup
export function setupGlobalErrorHandlers(): void {
  // Handle unhandled promise rejections
  process.on("unhandledRejection", (reason, promise) => {
    ErrorBoundaryLogger.logUnhandledRejection(reason, promise);
  });

  // Handle uncaught exceptions
  process.on("uncaughtException", error => {
    ErrorBoundaryLogger.logUncaughtException(error);

    // Log the error and gracefully shutdown
    logger.error("Uncaught exception occurred, shutting down gracefully...");
    process.exit(1);
  });

  // Handle SIGTERM and SIGINT for graceful shutdown
  process.on("SIGTERM", () => {
    logger.info("SIGTERM received, shutting down gracefully...");
    process.exit(0);
  });

  process.on("SIGINT", () => {
    logger.info("SIGINT received, shutting down gracefully...");
    process.exit(0);
  });
}

// Error context utilities
export class ErrorContextManager {
  private static contexts: Map<string, Record<string, any>> = new Map();

  static setContext(key: string, context: Record<string, any>): void {
    this.contexts.set(key, context);
  }

  static getContext(key: string): Record<string, any> | undefined {
    return this.contexts.get(key);
  }

  static clearContext(key: string): void {
    this.contexts.delete(key);
  }

  static getAllContexts(): Record<string, any> {
    return Object.fromEntries(this.contexts);
  }
}

// Error reporting utilities
export class ErrorReporter {
  static reportError(
    error: Error,
    severity: "low" | "medium" | "high" | "critical",
    context?: Record<string, any>
  ): void {
    const meta: ErrorLogMeta = {
      method: "ERROR_REPORT",
      url: "REPORT",
      errorType: error.constructor.name,
      errorMessage: error.message,
      errorStack: error.stack,
      context: {
        severity,
        reportedAt: new Date().toISOString(),
        ...context,
      },
    };

    const logLevel =
      severity === "critical"
        ? "error"
        : severity === "high"
        ? "error"
        : "warn";
    logger.log(logLevel, `Error report [${severity}]: ${error.message}`, meta);
  }

  static reportUserError(
    error: Error,
    userId: string,
    userAction: string,
    context?: Record<string, any>
  ): void {
    const meta: ErrorLogMeta = {
      method: "USER_ERROR",
      url: userAction,
      errorType: error.constructor.name,
      errorMessage: error.message,
      errorStack: error.stack,
      userId,
      context: {
        userAction,
        reportedAt: new Date().toISOString(),
        ...context,
      },
    };

    logger.warn(`User error: ${error.message}`, meta);
  }
}

// Export utility functions
export const logRouteError = ErrorBoundaryLogger.logRouteError;
export const logComponentError = ErrorBoundaryLogger.logComponentError;
export const reportError = ErrorReporter.reportError;
export const reportUserError = ErrorReporter.reportUserError;
