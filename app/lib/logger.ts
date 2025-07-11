import winston, { format } from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import { createEnvironmentLogger } from "./logger-config";

// Initialize configuration
const config = createEnvironmentLogger();

// Define log levels
export const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  verbose: 4,
  debug: 5,
  silly: 6,
} as const;

// Define log colors for console output
const LOG_COLORS = {
  error: "red",
  warn: "yellow",
  info: "green",
  http: "magenta",
  verbose: "cyan",
  debug: "blue",
  silly: "gray",
};

// Add colors to winston
winston.addColors(LOG_COLORS);

// Custom format for structured JSON logging
const structuredFormat = format.combine(
  format.timestamp({ format: "YYYY-MM-DD HH:mm:ss.SSS" }),
  format.errors({ stack: true }),
  format.json(),
  format.printf(info => {
    const { timestamp, level, message, stack, ...meta } = info;

    const logObject: Record<string, any> = {
      timestamp,
      level,
      message,
    };

    if (stack) {
      logObject.stack = stack;
    }

    if (Object.keys(meta).length > 0) {
      logObject.meta = meta;
    }

    return JSON.stringify(logObject);
  })
);

// Custom format for console output in development
const consoleFormat = format.combine(
  format.timestamp({ format: "HH:mm:ss" }),
  format.colorize(),
  format.errors({ stack: true }),
  format.printf(info => {
    const { timestamp, level, message, stack, ...meta } = info;

    let logMessage = `${timestamp} [${level}]: ${message}`;

    // Add metadata if present
    if (Object.keys(meta).length > 0) {
      logMessage += ` | ${JSON.stringify(meta)}`;
    }

    // Add stack trace if present
    if (stack) {
      logMessage += `\n${stack}`;
    }

    return logMessage;
  })
);

// Create transports based on configuration
const transports: winston.transport[] = [];

// Console transport
if (config.enableConsole) {
  transports.push(
    new winston.transports.Console({
      level: config.level,
      format: config.isDevelopment ? consoleFormat : structuredFormat,
      handleExceptions: true,
      handleRejections: true,
    })
  );
}

// File transports
if (config.enableFile) {
  // Main application log
  transports.push(
    new DailyRotateFile({
      filename: `${config.logDirectory}/app-%DATE%.log`,
      datePattern: config.datePattern,
      maxSize: config.maxFileSize,
      maxFiles: config.maxFiles,
      level: "debug",
      format: structuredFormat,
      handleExceptions: true,
      handleRejections: true,
    })
  );

  // Error-only log
  transports.push(
    new DailyRotateFile({
      filename: `${config.logDirectory}/error-%DATE%.log`,
      datePattern: config.datePattern,
      maxSize: config.maxFileSize,
      maxFiles: config.maxFiles,
      level: "error",
      format: structuredFormat,
      handleExceptions: true,
      handleRejections: true,
    })
  );

  // HTTP access log
  transports.push(
    new DailyRotateFile({
      filename: `${config.logDirectory}/access-%DATE%.log`,
      datePattern: config.datePattern,
      maxSize: config.maxFileSize,
      maxFiles: config.maxFiles,
      level: "http",
      format: structuredFormat,
    })
  );
}

// Create the logger instance
const logger = winston.createLogger({
  level: config.level,
  levels: LOG_LEVELS,
  format: structuredFormat,
  transports,
  exitOnError: false,
  rejectionHandlers: config.enableFile
    ? [
        new winston.transports.File({
          filename: `${config.logDirectory}/rejections.log`,
        }),
      ]
    : [],
  exceptionHandlers: config.enableFile
    ? [
        new winston.transports.File({
          filename: `${config.logDirectory}/exceptions.log`,
        }),
      ]
    : [],
});

// Create a stream for integration with other tools (like Express morgan)
(logger as any).stream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};

export default logger;
