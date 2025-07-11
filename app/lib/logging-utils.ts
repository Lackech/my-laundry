import { randomUUID } from "crypto";
import logger from "./logger";
import type {
  RequestLogMeta,
  ErrorLogMeta,
  PerformanceLogMeta,
  BusinessLogMeta,
  SystemLogMeta,
  LoggingContext,
} from "../types/logging";

// Request ID generation utility
export function generateRequestId(): string {
  return randomUUID();
}

// Request logging utilities
export class RequestLogger {
  private context: LoggingContext;

  constructor(context: LoggingContext) {
    this.context = context;
  }

  logRequest(
    method: string,
    url: string,
    additionalMeta: Partial<RequestLogMeta> = {}
  ) {
    const meta: RequestLogMeta = {
      method,
      url,
      requestId: this.context.requestId,
      userAgent: this.context.userAgent,
      ip: this.context.ip,
      userId: this.context.userId,
      sessionId: this.context.sessionId,
      ...additionalMeta,
    };

    logger.http(`${method} ${url}`, meta);
  }

  logResponse(
    statusCode: number,
    duration: number,
    additionalMeta: Partial<RequestLogMeta> = {}
  ) {
    const meta: RequestLogMeta = {
      method: "RESPONSE",
      url: "", // Will be populated by middleware
      requestId: this.context.requestId,
      statusCode,
      duration,
      userId: this.context.userId,
      sessionId: this.context.sessionId,
      ...additionalMeta,
    };

    const level =
      statusCode >= 500 ? "error" : statusCode >= 400 ? "warn" : "info";
    logger.log(level, `Response ${statusCode} (${duration}ms)`, meta);
  }

  logError(error: Error, additionalMeta: Partial<ErrorLogMeta> = {}) {
    const meta: ErrorLogMeta = {
      method: "ERROR",
      url: "",
      requestId: this.context.requestId,
      errorType: error.constructor.name,
      errorMessage: error.message,
      errorStack: error.stack,
      userId: this.context.userId,
      sessionId: this.context.sessionId,
      ...additionalMeta,
    };

    logger.error(`Request error: ${error.message}`, meta);
  }
}

// Error logging utilities
export class ErrorLogger {
  static logError(error: Error, context?: Record<string, any>) {
    const meta: ErrorLogMeta = {
      method: "UNKNOWN",
      url: "UNKNOWN",
      errorType: error.constructor.name,
      errorMessage: error.message,
      errorStack: error.stack,
      context,
    };

    logger.error(`Application error: ${error.message}`, meta);
  }

  static logAsyncError(
    error: Error,
    operation: string,
    context?: Record<string, any>
  ) {
    const meta: ErrorLogMeta = {
      method: "ASYNC",
      url: operation,
      errorType: error.constructor.name,
      errorMessage: error.message,
      errorStack: error.stack,
      context: { operation, ...context },
    };

    logger.error(`Async operation error: ${error.message}`, meta);
  }

  static logValidationError(
    field: string,
    value: any,
    rule: string,
    context?: Record<string, any>
  ) {
    const meta: ErrorLogMeta = {
      method: "VALIDATION",
      url: "VALIDATION",
      errorType: "ValidationError",
      errorMessage: `Validation failed for field '${field}' with rule '${rule}'`,
      context: { field, value, rule, ...context },
    };

    logger.warn(`Validation error: ${field} failed ${rule}`, meta);
  }
}

// Performance logging utilities
export class PerformanceLogger {
  private timers: Map<string, number> = new Map();

  startTimer(operation: string): void {
    this.timers.set(operation, Date.now());
  }

  endTimer(operation: string, context?: Record<string, any>): number {
    const startTime = this.timers.get(operation);
    if (!startTime) {
      logger.warn(`Timer not found for operation: ${operation}`);
      return 0;
    }

    const endTime = Date.now();
    const duration = endTime - startTime;
    this.timers.delete(operation);

    const meta: PerformanceLogMeta = {
      operation,
      duration,
      startTime,
      endTime,
      memoryUsage: process.memoryUsage(),
      context,
    };

    logger.info(`Performance: ${operation} completed in ${duration}ms`, meta);
    return duration;
  }

  static async measureAsync<T>(
    operation: string,
    fn: () => Promise<T>,
    context?: Record<string, any>
  ): Promise<T> {
    const startTime = Date.now();
    // const startMemory = process.memoryUsage();

    try {
      const result = await fn();
      const endTime = Date.now();
      const duration = endTime - startTime;

      const meta: PerformanceLogMeta = {
        operation,
        duration,
        startTime,
        endTime,
        memoryUsage: process.memoryUsage(),
        context,
      };

      logger.info(
        `Async operation: ${operation} completed in ${duration}ms`,
        meta
      );
      return result;
    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;

      const meta: PerformanceLogMeta = {
        operation,
        duration,
        startTime,
        endTime,
        memoryUsage: process.memoryUsage(),
        context: {
          error: error instanceof Error ? error.message : "Unknown error",
          ...context,
        },
      };

      logger.error(
        `Async operation failed: ${operation} after ${duration}ms`,
        meta
      );
      throw error;
    }
  }

  static measureSync<T>(
    operation: string,
    fn: () => T,
    context?: Record<string, any>
  ): T {
    const startTime = Date.now();

    try {
      const result = fn();
      const endTime = Date.now();
      const duration = endTime - startTime;

      const meta: PerformanceLogMeta = {
        operation,
        duration,
        startTime,
        endTime,
        memoryUsage: process.memoryUsage(),
        context,
      };

      logger.info(
        `Sync operation: ${operation} completed in ${duration}ms`,
        meta
      );
      return result;
    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;

      const meta: PerformanceLogMeta = {
        operation,
        duration,
        startTime,
        endTime,
        memoryUsage: process.memoryUsage(),
        context: {
          error: error instanceof Error ? error.message : "Unknown error",
          ...context,
        },
      };

      logger.error(
        `Sync operation failed: ${operation} after ${duration}ms`,
        meta
      );
      throw error;
    }
  }
}

// Business logic logging utilities
export class BusinessLogger {
  static logUserAction(
    action: string,
    userId: string,
    entityId?: string,
    entityType?: string,
    context?: Record<string, any>
  ) {
    const meta: BusinessLogMeta = {
      action,
      userId,
      entityId,
      entityType,
      context,
    };

    logger.info(`User action: ${action}`, meta);
  }

  static logDataChange(
    action: string,
    entityType: string,
    entityId: string,
    oldValue: any,
    newValue: any,
    userId?: string,
    context?: Record<string, any>
  ) {
    const meta: BusinessLogMeta = {
      action,
      entityType,
      entityId,
      oldValue,
      newValue,
      userId,
      context,
    };

    logger.info(`Data change: ${action} on ${entityType}`, meta);
  }

  static logSecurityEvent(
    event: string,
    userId?: string,
    context?: Record<string, any>
  ) {
    const meta: BusinessLogMeta = {
      action: `SECURITY_${event}`,
      userId,
      context,
    };

    logger.warn(`Security event: ${event}`, meta);
  }
}

// System monitoring utilities
export class SystemLogger {
  static logHealthCheck(
    component: string,
    health: "healthy" | "degraded" | "unhealthy",
    metrics?: SystemLogMeta["metrics"],
    dependencies?: SystemLogMeta["dependencies"]
  ) {
    const meta: SystemLogMeta = {
      component,
      health,
      metrics,
      dependencies,
    };

    const level =
      health === "healthy" ? "info" : health === "degraded" ? "warn" : "error";
    logger.log(level, `Health check: ${component} is ${health}`, meta);
  }

  static logStartup(component: string, context?: Record<string, any>) {
    logger.info(`System startup: ${component}`, { component, context });
  }

  static logShutdown(component: string, context?: Record<string, any>) {
    logger.info(`System shutdown: ${component}`, { component, context });
  }

  static logMemoryUsage() {
    const usage = process.memoryUsage();
    const meta: SystemLogMeta = {
      component: "memory",
      health: "healthy",
      metrics: { memoryUsage: usage },
    };

    logger.debug("Memory usage report", meta);
  }
}

// Utility functions for structured logging
export function createLoggingContext(
  requestId: string,
  additionalContext: Partial<LoggingContext> = {}
): LoggingContext {
  return {
    requestId,
    startTime: Date.now(),
    ...additionalContext,
  };
}

export function sanitizeForLogging(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === "string") {
    // Remove potential sensitive data patterns
    return obj.replace(/password|token|secret|key/gi, "[REDACTED]");
  }

  if (typeof obj === "object") {
    const sanitized: any = {};

    for (const [key, value] of Object.entries(obj)) {
      // Skip sensitive fields
      if (/password|token|secret|key|auth/i.test(key)) {
        sanitized[key] = "[REDACTED]";
      } else {
        sanitized[key] = sanitizeForLogging(value);
      }
    }

    return sanitized;
  }

  return obj;
}

// Export convenience functions
export const logRequest = (
  context: LoggingContext,
  method: string,
  url: string,
  meta?: Partial<RequestLogMeta>
) => {
  new RequestLogger(context).logRequest(method, url, meta);
};

export const logResponse = (
  context: LoggingContext,
  statusCode: number,
  duration: number,
  meta?: Partial<RequestLogMeta>
) => {
  new RequestLogger(context).logResponse(statusCode, duration, meta);
};

export const logError = (error: Error, context?: Record<string, any>) => {
  ErrorLogger.logError(error, context);
};

export const logPerformance = PerformanceLogger.measureAsync;

export const logBusinessAction = BusinessLogger.logUserAction;

export const logSystemHealth = SystemLogger.logHealthCheck;
