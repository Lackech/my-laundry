import type { LoggerConfig } from "../types/logging";

// Environment detection
export const NODE_ENV = process.env.NODE_ENV || "development";
export const IS_PRODUCTION = NODE_ENV === "production";
export const IS_DEVELOPMENT = NODE_ENV === "development";
export const IS_TEST = NODE_ENV === "test";

// Environment-specific logging configuration
export const LOGGING_CONFIG: LoggerConfig = {
  level: getLogLevel(),
  isDevelopment: IS_DEVELOPMENT,
  isProduction: IS_PRODUCTION,
  enableConsole: shouldEnableConsole(),
  enableFile: shouldEnableFile(),
  logDirectory: getLogDirectory(),
  maxFileSize: getMaxFileSize(),
  maxFiles: getMaxFiles(),
  datePattern: getDatePattern(),
};

function getLogLevel(): LoggerConfig["level"] {
  const envLevel = process.env.LOG_LEVEL?.toLowerCase();

  // Validate log level
  const validLevels = [
    "error",
    "warn",
    "info",
    "http",
    "verbose",
    "debug",
    "silly",
  ];
  if (envLevel && validLevels.includes(envLevel)) {
    return envLevel as LoggerConfig["level"];
  }

  // Default log levels by environment
  switch (NODE_ENV) {
    case "production":
      return "info";
    case "test":
      return "error";
    case "development":
    default:
      return "debug";
  }
}

function shouldEnableConsole(): boolean {
  // Allow explicit override
  if (process.env.LOG_CONSOLE !== undefined) {
    return process.env.LOG_CONSOLE === "true";
  }

  // Default console logging behavior
  return !IS_PRODUCTION || process.env.NODE_ENV === "production";
}

function shouldEnableFile(): boolean {
  // Allow explicit override
  if (process.env.LOG_FILE !== undefined) {
    return process.env.LOG_FILE === "true";
  }

  // Default file logging behavior
  return !IS_TEST; // Enable file logging except in tests
}

function getLogDirectory(): string {
  return process.env.LOG_DIR || "logs";
}

function getMaxFileSize(): string {
  return process.env.LOG_MAX_SIZE || "20m";
}

function getMaxFiles(): string {
  return process.env.LOG_MAX_FILES || (IS_PRODUCTION ? "30d" : "14d");
}

function getDatePattern(): string {
  return process.env.LOG_DATE_PATTERN || "YYYY-MM-DD";
}

// Performance logging configuration
export const PERFORMANCE_CONFIG = {
  enablePerformanceLogging:
    process.env.LOG_PERFORMANCE === "true" || IS_DEVELOPMENT,
  slowRequestThreshold: parseInt(
    process.env.SLOW_REQUEST_THRESHOLD || "1000",
    10
  ),
  slowQueryThreshold: parseInt(process.env.SLOW_QUERY_THRESHOLD || "500", 10),
  memoryLoggingInterval: parseInt(
    process.env.MEMORY_LOG_INTERVAL || "300000",
    10
  ), // 5 minutes
};

// Request logging configuration
export const REQUEST_CONFIG = {
  enableRequestLogging: process.env.LOG_REQUESTS !== "false",
  enableResponseLogging: process.env.LOG_RESPONSES !== "false",
  enableBodyLogging: process.env.LOG_BODIES === "true" && IS_DEVELOPMENT,
  enableHeaderLogging: process.env.LOG_HEADERS === "true" && IS_DEVELOPMENT,
  logBotRequests: process.env.LOG_BOTS === "true",
  excludeRoutes: (process.env.LOG_EXCLUDE_ROUTES || "")
    .split(",")
    .filter(Boolean),
  excludeExtensions: (
    process.env.LOG_EXCLUDE_EXTENSIONS ||
    ".css,.js,.ico,.png,.jpg,.jpeg,.gif,.svg,.woff,.woff2,.ttf,.eot"
  )
    .split(",")
    .filter(Boolean),
};

// Error logging configuration
export const ERROR_CONFIG = {
  enableErrorLogging: true,
  enableStackTraces: process.env.LOG_STACK_TRACES !== "false",
  enableErrorContext: process.env.LOG_ERROR_CONTEXT !== "false",
  enableUserErrorReporting: process.env.LOG_USER_ERRORS !== "false",
  errorNotificationThreshold: parseInt(
    process.env.ERROR_NOTIFICATION_THRESHOLD || "10",
    10
  ),
};

// Security logging configuration
export const SECURITY_CONFIG = {
  enableSecurityLogging: process.env.LOG_SECURITY !== "false",
  enableIpLogging: process.env.LOG_IPS !== "false",
  enableUserAgentLogging: process.env.LOG_USER_AGENTS !== "false",
  enableAuthLogging: process.env.LOG_AUTH !== "false",
  enableFailedLoginLogging: process.env.LOG_FAILED_LOGINS !== "false",
  sensitiveDataFields: (
    process.env.SENSITIVE_FIELDS ||
    "password,token,secret,key,auth,credit_card,ssn"
  )
    .split(",")
    .filter(Boolean),
};

// Database logging configuration
export const DATABASE_CONFIG = {
  enableDatabaseLogging: process.env.LOG_DATABASE === "true" || IS_DEVELOPMENT,
  enableQueryLogging: process.env.LOG_QUERIES === "true" || IS_DEVELOPMENT,
  enableSlowQueryLogging: process.env.LOG_SLOW_QUERIES !== "false",
  slowQueryThreshold: parseInt(process.env.SLOW_QUERY_THRESHOLD || "500", 10),
  enableQueryResultLogging:
    process.env.LOG_QUERY_RESULTS === "true" && IS_DEVELOPMENT,
};

// Configuration validation
export function validateConfiguration(): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate log level
  const validLevels = [
    "error",
    "warn",
    "info",
    "http",
    "verbose",
    "debug",
    "silly",
  ];
  if (!validLevels.includes(LOGGING_CONFIG.level)) {
    errors.push(`Invalid log level: ${LOGGING_CONFIG.level}`);
  }

  // Validate thresholds
  if (PERFORMANCE_CONFIG.slowRequestThreshold < 0) {
    errors.push("slowRequestThreshold must be non-negative");
  }

  if (PERFORMANCE_CONFIG.slowQueryThreshold < 0) {
    errors.push("slowQueryThreshold must be non-negative");
  }

  if (PERFORMANCE_CONFIG.memoryLoggingInterval < 0) {
    errors.push("memoryLoggingInterval must be non-negative");
  }

  // Validate file size format
  if (!/^\d+[kmg]?$/i.test(LOGGING_CONFIG.maxFileSize)) {
    errors.push(`Invalid maxFileSize format: ${LOGGING_CONFIG.maxFileSize}`);
  }

  // Validate date pattern
  if (!/^\d+[dwmy]?$/i.test(LOGGING_CONFIG.maxFiles)) {
    errors.push(`Invalid maxFiles format: ${LOGGING_CONFIG.maxFiles}`);
  }

  // Warnings for production
  if (IS_PRODUCTION) {
    if (LOGGING_CONFIG.level === "debug" || LOGGING_CONFIG.level === "silly") {
      warnings.push(
        "Debug/silly logging enabled in production may impact performance"
      );
    }

    if (REQUEST_CONFIG.enableBodyLogging) {
      warnings.push(
        "Request body logging enabled in production may expose sensitive data"
      );
    }

    if (REQUEST_CONFIG.enableHeaderLogging) {
      warnings.push(
        "Request header logging enabled in production may expose sensitive data"
      );
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// Environment-specific logger creation helpers
export function createEnvironmentLogger() {
  const config = LOGGING_CONFIG;

  // Log configuration on startup
  console.log(
    `[Logger] Starting in ${NODE_ENV} mode with level: ${config.level}`
  );

  if (config.isDevelopment) {
    console.log(
      "[Logger] Development mode: Console logging enabled, verbose output"
    );
  }

  if (config.isProduction) {
    console.log(
      "[Logger] Production mode: Structured JSON logging, file rotation enabled"
    );
  }

  // Validate configuration
  const validation = validateConfiguration();
  if (!validation.isValid) {
    console.error("[Logger] Configuration errors:", validation.errors);
    throw new Error("Invalid logging configuration");
  }

  if (validation.warnings.length > 0) {
    console.warn("[Logger] Configuration warnings:", validation.warnings);
  }

  return config;
}

// Export all configurations
export const LoggingConfiguration = {
  LOGGING_CONFIG,
  PERFORMANCE_CONFIG,
  REQUEST_CONFIG,
  ERROR_CONFIG,
  SECURITY_CONFIG,
  DATABASE_CONFIG,
  validateConfiguration,
  createEnvironmentLogger,
};
