import { LOG_LEVELS } from "../lib/logger";

// Log level type
export type LogLevel = keyof typeof LOG_LEVELS;

// Base log entry structure
export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  meta?: Record<string, any>;
  stack?: string;
}

// Request logging metadata
export interface RequestLogMeta {
  method: string;
  url: string;
  userAgent?: string;
  ip?: string;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  duration?: number;
  statusCode?: number;
  contentLength?: number;
  referer?: string;
  routeName?: string;
  isBot?: boolean;
  success?: boolean;
  actionType?: string;
  matches?: number;
}

// Error logging metadata
export interface ErrorLogMeta extends RequestLogMeta {
  errorType: string;
  errorMessage: string;
  errorStack?: string;
  errorCode?: string | number;
  context?: Record<string, any>;
  componentStack?: string;
  boundaryType?: string;
}

// Performance logging metadata
export interface PerformanceLogMeta {
  operation: string;
  duration: number;
  startTime: number;
  endTime: number;
  memoryUsage?: NodeJS.MemoryUsage;
  context?: Record<string, any>;
}

// Database operation logging metadata
export interface DatabaseLogMeta {
  query: string;
  duration: number;
  table?: string;
  operation: "SELECT" | "INSERT" | "UPDATE" | "DELETE" | "CREATE" | "DROP";
  rowCount?: number;
  error?: string;
}

// Business logic logging metadata
export interface BusinessLogMeta {
  action: string;
  userId?: string;
  entityId?: string;
  entityType?: string;
  oldValue?: any;
  newValue?: any;
  context?: Record<string, any>;
}

// System monitoring metadata
export interface SystemLogMeta {
  component: string;
  health: "healthy" | "degraded" | "unhealthy";
  metrics?: {
    cpuUsage?: number;
    memoryUsage?: NodeJS.MemoryUsage;
    diskUsage?: number;
    networkLatency?: number;
  };
  dependencies?: {
    database?: "connected" | "disconnected" | "error";
    cache?: "connected" | "disconnected" | "error";
    external_apis?: Record<string, "connected" | "disconnected" | "error">;
  };
}

// Structured logging interface
export interface StructuredLogger {
  error(message: string, meta?: ErrorLogMeta): void;
  warn(message: string, meta?: Record<string, any>): void;
  info(message: string, meta?: Record<string, any>): void;
  http(message: string, meta?: RequestLogMeta): void;
  verbose(message: string, meta?: Record<string, any>): void;
  debug(message: string, meta?: Record<string, any>): void;
  silly(message: string, meta?: Record<string, any>): void;
}

// Logger configuration interface
export interface LoggerConfig {
  level: LogLevel;
  isDevelopment: boolean;
  isProduction: boolean;
  enableConsole: boolean;
  enableFile: boolean;
  logDirectory: string;
  maxFileSize: string;
  maxFiles: string;
  datePattern: string;
}

// Log query interface for searching logs
export interface LogQuery {
  level?: LogLevel;
  startDate?: Date;
  endDate?: Date;
  message?: string;
  userId?: string;
  operation?: string;
  limit?: number;
  offset?: number;
}

// Logging middleware context
export interface LoggingContext {
  requestId: string;
  userId?: string;
  sessionId?: string;
  userAgent?: string;
  ip?: string;
  startTime: number;
}
