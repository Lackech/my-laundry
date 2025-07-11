# Logging Infrastructure Documentation

## Overview

This document describes the comprehensive logging infrastructure implemented for the Laundry
Calendar application. The logging system is built using Winston with structured JSON output,
designed to be grep-friendly, and includes advanced features like log rotation, performance
monitoring, and error tracking.

## Architecture

### Core Components

1. **Logger Configuration** (`app/lib/logger.ts`)

   - Winston-based logger with structured JSON output
   - Environment-specific configuration
   - Multiple transport layers (console, file, error-specific)
   - Log rotation with daily rotation and size limits

2. **Configuration Management** (`app/lib/logger-config.ts`)

   - Environment-specific settings
   - Validation and error checking
   - Performance and security configurations

3. **Logging Utilities** (`app/lib/logging-utils.ts`)

   - RequestLogger for HTTP request/response logging
   - ErrorLogger for error tracking
   - PerformanceLogger for performance monitoring
   - BusinessLogger for business logic events
   - SystemLogger for system health monitoring

4. **Middleware Integration** (`app/lib/logging-middleware.ts`)

   - Remix route integration
   - Request/response logging
   - Error boundary integration
   - Performance measurement

5. **Error Boundary Integration** (`app/lib/error-boundary-logger.ts`)

   - Global error handlers
   - React error boundary logging
   - Unhandled promise rejection tracking

6. **Performance Monitoring** (`app/lib/performance-logger.ts`)
   - Operation timing
   - Memory usage tracking
   - Database query logging
   - Network request monitoring

## Features

### Structured JSON Logging

All logs are output in structured JSON format for easy parsing and analysis:

```json
{
  "timestamp": "2025-07-11 00:15:46.592",
  "level": "info",
  "message": "[routes/_index] Home page loaded",
  "meta": {
    "url": "http://localhost:5173/",
    "userAgent": "curl/7.87.0"
  }
}
```

### Log Levels

- **error**: Critical errors that need immediate attention
- **warn**: Warning conditions that should be monitored
- **info**: General information about application flow
- **http**: HTTP request/response logging
- **verbose**: Detailed operational information
- **debug**: Debug information for development
- **silly**: Very detailed debug information

### Log Files

The system creates several log files with daily rotation:

- `logs/app-YYYY-MM-DD.log`: General application logs
- `logs/error-YYYY-MM-DD.log`: Error-only logs
- `logs/access-YYYY-MM-DD.log`: HTTP access logs
- `logs/exceptions.log`: Unhandled exceptions
- `logs/rejections.log`: Unhandled promise rejections

### Log Rotation

- **Daily rotation**: New log files created daily
- **Size limits**: 20MB maximum file size
- **Retention**: 14 days for general logs, 30 days for error logs
- **Compression**: Automatic compression of old log files

## Usage

### Basic Logging

```typescript
import { createLogger } from "~/lib/logging";

const logger = createLogger("my-component");

// Basic logging
logger.info("User logged in", { userId: "123" });
logger.warn("Rate limit approaching", { currentCount: 90 });
logger.error("Database connection failed", { error: "Connection timeout" });

// Performance logging
const result = await logger.measureAsync("database-query", async () => {
  return await db.query("SELECT * FROM users");
});
```

### Route Integration

```typescript
import { createLogger } from "~/lib/logging";

const logger = createLogger("routes/my-route");

export async function loader({ request }: LoaderFunctionArgs) {
  logger.info("Route loaded", { url: request.url });

  const data = await logger.measureAsync("load-data", async () => {
    return await fetchData();
  });

  return json(data);
}
```

### Error Boundary Integration

```typescript
import { logRouteError } from "~/lib/logging";

export function ErrorBoundary() {
  const error = useRouteError();

  useEffect(() => {
    logRouteError(error, "my-route", undefined, {
      additionalContext: "Custom error context",
    });
  }, [error]);

  return <div>Error occurred</div>;
}
```

## Environment Configuration

### Environment Variables

- `NODE_ENV`: Environment mode (development/production/test)
- `LOG_LEVEL`: Logging level (error/warn/info/debug/etc.)
- `LOG_CONSOLE`: Enable/disable console logging
- `LOG_FILE`: Enable/disable file logging
- `LOG_DIR`: Log directory path
- `LOG_MAX_SIZE`: Maximum log file size
- `LOG_MAX_FILES`: Log file retention period

### Development vs Production

#### Development Mode

- Console logging enabled with colorized output
- Debug level logging
- Verbose error information
- Performance monitoring enabled

#### Production Mode

- Structured JSON logging to files
- Info level logging by default
- Error aggregation and reporting
- Security-focused logging

## Make Commands

The logging system includes several Make targets for log management:

### Log Monitoring

```bash
make tail-log      # Follow general application logs
make tail-error    # Follow error logs only
make tail-access   # Follow HTTP access logs
```

### Log Analysis

```bash
make log-grep PATTERN="error"    # Search logs for specific patterns
make log-stats                   # Show log statistics and summary
make log-analyze                 # Analyze log patterns and trends
```

### Log Management

```bash
make log-cleanup                 # Clean up old log files
```

## Performance Monitoring

### Automatic Performance Logging

The system automatically logs:

- Route loader/action execution times
- Database query durations
- External API call latencies
- Memory usage patterns

### Custom Performance Monitoring

```typescript
import { performanceLogger } from "~/lib/logging";

// Measure async operations
const result = await performanceLogger.measureAsync("complex-operation", async () => {
  // Your complex operation here
  return await complexOperation();
});

// Measure sync operations
const result = performanceLogger.measureSync("calculation", () => {
  return performCalculation();
});
```

## Error Tracking

### Automatic Error Logging

- Unhandled exceptions
- Unhandled promise rejections
- React error boundaries
- HTTP error responses

### Custom Error Reporting

```typescript
import { reportError } from "~/lib/logging";

try {
  await riskyOperation();
} catch (error) {
  reportError(error, "high", {
    operation: "risky-operation",
    context: "user-facing-feature",
  });
  throw error;
}
```

## Security Features

### Data Sanitization

All logs are automatically sanitized to prevent sensitive information leakage:

- Passwords are redacted
- Authentication tokens are masked
- API keys are filtered out
- Credit card numbers are sanitized

### Access Control

- Log files are created with restricted permissions
- Log rotation includes cleanup of old files
- Production logs exclude sensitive debug information

## Monitoring and Alerting

### Log Analysis

The system provides built-in log analysis capabilities:

- Error pattern detection
- Performance trend analysis
- HTTP status code distribution
- User behavior tracking

### Integration Points

The logging system is designed to integrate with:

- Log aggregation systems (ELK Stack, Splunk)
- Application monitoring (New Relic, DataDog)
- Error tracking services (Sentry, Rollbar)
- Custom monitoring dashboards

## Best Practices

### Logging Guidelines

1. **Use appropriate log levels**: Error for failures, warn for issues, info for flow
2. **Include context**: Always provide relevant metadata
3. **Avoid sensitive data**: Never log passwords, tokens, or PII
4. **Use structured data**: Provide metadata as objects, not strings
5. **Be consistent**: Use standard message formats and naming conventions

### Performance Considerations

1. **Async logging**: All file operations are non-blocking
2. **Log rotation**: Automatic cleanup prevents disk space issues
3. **Conditional logging**: Debug logs only in development
4. **Batching**: Log aggregation reduces I/O overhead

### Error Handling

1. **Graceful degradation**: Logging failures don't crash the application
2. **Fallback mechanisms**: Console logging if file logging fails
3. **Self-monitoring**: Logger health checks and alerts

## Troubleshooting

### Common Issues

1. **Log files not created**: Check directory permissions and disk space
2. **High disk usage**: Adjust log rotation settings
3. **Performance impact**: Review log levels and reduce verbosity
4. **Missing logs**: Verify configuration and transport settings

### Debug Mode

Enable debug logging for troubleshooting:

```bash
export LOG_LEVEL=debug
npm run dev
```

## Future Enhancements

### Planned Features

1. **Log streaming**: Real-time log streaming to external services
2. **Metric collection**: Custom metrics and KPI tracking
3. **Alert integration**: Automated alerting based on log patterns
4. **Dashboard integration**: Built-in log analysis dashboard
5. **Machine learning**: Anomaly detection and predictive analytics

### Extensibility

The logging system is designed to be easily extensible:

- Custom transport plugins
- Additional log formatters
- Enhanced error tracking
- Business intelligence integration

## Conclusion

The logging infrastructure provides a robust, scalable, and maintainable solution for application
monitoring and debugging. It follows industry best practices while being tailored to the specific
needs of the Laundry Calendar application.

For additional support or questions, refer to the implementation files in the `app/lib/` directory
or consult the TypeScript definitions in `app/types/logging.ts`.
