// Main logging module - provides a unified interface for all logging functionality

// Core logger
import logger from "./logger";
export { default as logger } from "./logger";
export { LOG_LEVELS } from "./logger";

// Configuration
export { LoggingConfiguration } from "./logger-config";

// Utilities
export {
  generateRequestId,
  createLoggingContext,
  RequestLogger,
  ErrorLogger,
  PerformanceLogger,
  BusinessLogger,
  SystemLogger,
  sanitizeForLogging,
  logRequest,
  logResponse,
  logError,
  logPerformance,
  logBusinessAction,
  logSystemHealth,
} from "./logging-utils";

// Middleware
export {
  createLoggingMiddleware,
  loggingMiddleware,
  logServerRender,
  logErrorBoundary,
  createRouteLogger,
  getCurrentRequestContext,
  cleanupRequestContexts,
} from "./logging-middleware";

// Error boundary integration
export {
  ErrorBoundaryLogger,
  LoggingErrorBoundary,
  createErrorBoundaryLogger,
  setupGlobalErrorHandlers,
  ErrorContextManager,
  ErrorReporter,
  logRouteError,
  logComponentError,
  reportError,
  reportUserError,
} from "./error-boundary-logger";

// Performance logging
export {
  PerformanceMetrics,
  PerformanceLogger as DetailedPerformanceLogger,
  DatabasePerformanceLogger,
  NetworkPerformanceLogger,
  ComponentPerformanceLogger,
  performanceLogger,
} from "./performance-logger";

// Types
export type {
  LogLevel,
  LogEntry,
  RequestLogMeta,
  ErrorLogMeta,
  PerformanceLogMeta,
  BusinessLogMeta,
  SystemLogMeta,
  StructuredLogger,
  LoggerConfig,
  LogQuery,
  LoggingContext,
} from "../types/logging";

// Convenience functions for common logging patterns
export const createLogger = (name: string) => {
  return {
    info: (message: string, meta?: Record<string, any>) => {
      logger.info(`[${name}] ${message}`, meta);
    },
    warn: (message: string, meta?: Record<string, any>) => {
      logger.warn(`[${name}] ${message}`, meta);
    },
    error: (message: string, meta?: Record<string, any>) => {
      logger.error(`[${name}] ${message}`, meta);
    },
    debug: (message: string, meta?: Record<string, any>) => {
      logger.debug(`[${name}] ${message}`, meta);
    },
    // Add performance logging
    measureAsync: async <T>(operation: string, fn: () => Promise<T>) => {
      const startTime = Date.now();
      try {
        const result = await fn();
        const duration = Date.now() - startTime;
        logger.info(`[${name}] ${operation} completed in ${duration}ms`, {
          operation,
          duration,
        });
        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        logger.error(`[${name}] ${operation} failed after ${duration}ms`, {
          operation,
          duration,
          error,
        });
        throw error;
      }
    },
    measureSync: <T>(operation: string, fn: () => T) => {
      const startTime = Date.now();
      try {
        const result = fn();
        const duration = Date.now() - startTime;
        logger.info(`[${name}] ${operation} completed in ${duration}ms`, {
          operation,
          duration,
        });
        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        logger.error(`[${name}] ${operation} failed after ${duration}ms`, {
          operation,
          duration,
          error,
        });
        throw error;
      }
    },
  };
};

// Environment-specific exports
export const isDevelopment = process.env.NODE_ENV === "development";
export const isProduction = process.env.NODE_ENV === "production";
export const isTest = process.env.NODE_ENV === "test";

// Helper for conditional logging
export const devLog = (message: string, meta?: Record<string, any>) => {
  if (isDevelopment) {
    logger.debug(`[DEV] ${message}`, meta);
  }
};

export const prodLog = (message: string, meta?: Record<string, any>) => {
  if (isProduction) {
    logger.info(`[PROD] ${message}`, meta);
  }
};

// Export default logger instance
export default logger;
