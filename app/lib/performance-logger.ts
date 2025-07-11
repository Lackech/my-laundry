import logger from "./logger";
import type { PerformanceLogMeta } from "../types/logging";

// Performance metrics collection
export class PerformanceMetrics {
  private static instance: PerformanceMetrics;
  private metrics: Map<string, number[]> = new Map();
  private timers: Map<string, number> = new Map();

  static getInstance(): PerformanceMetrics {
    if (!PerformanceMetrics.instance) {
      PerformanceMetrics.instance = new PerformanceMetrics();
    }
    return PerformanceMetrics.instance;
  }

  // Start timing an operation
  startTimer(operationId: string): void {
    this.timers.set(operationId, Date.now());
  }

  // End timing and record metric
  endTimer(operationId: string): number {
    const startTime = this.timers.get(operationId);
    if (!startTime) {
      logger.warn(`Timer not found for operation: ${operationId}`);
      return 0;
    }

    const duration = Date.now() - startTime;
    this.timers.delete(operationId);

    // Record metric
    this.recordMetric(operationId, duration);

    return duration;
  }

  // Record a metric value
  recordMetric(name: string, value: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const values = this.metrics.get(name)!;
    values.push(value);

    // Keep only last 100 values to prevent memory leak
    if (values.length > 100) {
      values.shift();
    }
  }

  // Get statistics for a metric
  getMetricStats(name: string): {
    count: number;
    min: number;
    max: number;
    avg: number;
    median: number;
    p95: number;
    p99: number;
  } | null {
    const values = this.metrics.get(name);
    if (!values || values.length === 0) {
      return null;
    }

    const sorted = [...values].sort((a, b) => a - b);
    const count = sorted.length;
    const min = sorted[0];
    const max = sorted[count - 1];
    const avg = sorted.reduce((a, b) => a + b, 0) / count;
    const median = sorted[Math.floor(count / 2)];
    const p95 = sorted[Math.floor(count * 0.95)];
    const p99 = sorted[Math.floor(count * 0.99)];

    return { count, min, max, avg, median, p95, p99 };
  }

  // Get all metrics
  getAllMetrics(): Record<string, any> {
    const result: Record<string, any> = {};

    for (const [name] of this.metrics.entries()) {
      result[name] = this.getMetricStats(name);
    }

    return result;
  }

  // Clear all metrics
  clearMetrics(): void {
    this.metrics.clear();
    this.timers.clear();
  }

  // Log performance summary
  logPerformanceSummary(): void {
    const allMetrics = this.getAllMetrics();

    if (Object.keys(allMetrics).length === 0) {
      return;
    }

    logger.info("Performance metrics summary", {
      metrics: allMetrics,
      timestamp: new Date().toISOString(),
    });
  }
}

// High-level performance logging decorators and utilities
export class PerformanceLogger {
  private static metrics = PerformanceMetrics.getInstance();

  // Measure async function performance
  static async measureAsync<T>(
    operationName: string,
    fn: () => Promise<T>,
    context?: Record<string, any>
  ): Promise<T> {
    const startTime = Date.now();

    try {
      const result = await fn();
      const endTime = Date.now();
      const duration = endTime - startTime;

      const meta: PerformanceLogMeta = {
        operation: operationName,
        duration,
        startTime,
        endTime,
        memoryUsage: process.memoryUsage(),
        context,
      };

      // Record metric
      this.metrics.recordMetric(operationName, duration);

      // Log if operation took longer than threshold
      const logLevel =
        duration > 1000 ? "warn" : duration > 500 ? "info" : "debug";
      logger.log(
        logLevel,
        `Operation completed: ${operationName} (${duration}ms)`,
        meta
      );

      return result;
    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;

      const meta: PerformanceLogMeta = {
        operation: operationName,
        duration,
        startTime,
        endTime,
        memoryUsage: process.memoryUsage(),
        context: {
          error: error instanceof Error ? error.message : "Unknown error",
          ...context,
        },
      };

      logger.error(`Operation failed: ${operationName} (${duration}ms)`, meta);
      throw error;
    }
  }

  // Measure sync function performance
  static measureSync<T>(
    operationName: string,
    fn: () => T,
    context?: Record<string, any>
  ): T {
    const startTime = Date.now();
    process.memoryUsage();

    try {
      const result = fn();
      const endTime = Date.now();
      const duration = endTime - startTime;
      const memoryEnd = process.memoryUsage();

      const meta: PerformanceLogMeta = {
        operation: operationName,
        duration,
        startTime,
        endTime,
        memoryUsage: memoryEnd,
        context,
      };

      // Record metric
      this.metrics.recordMetric(operationName, duration);

      // Log if operation took longer than threshold
      const logLevel =
        duration > 100 ? "warn" : duration > 50 ? "info" : "debug";
      logger.log(
        logLevel,
        `Sync operation completed: ${operationName} (${duration}ms)`,
        meta
      );

      return result;
    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;

      const meta: PerformanceLogMeta = {
        operation: operationName,
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
        `Sync operation failed: ${operationName} (${duration}ms)`,
        meta
      );
      throw error;
    }
  }

  // Create a timer for manual measurement
  static createTimer(operationName: string): {
    end: (context?: Record<string, any>) => number;
  } {
    const startTime = Date.now();

    return {
      end: (context?: Record<string, any>) => {
        const endTime = Date.now();
        const duration = endTime - startTime;

        const meta: PerformanceLogMeta = {
          operation: operationName,
          duration,
          startTime,
          endTime,
          memoryUsage: process.memoryUsage(),
          context,
        };

        // Record metric
        this.metrics.recordMetric(operationName, duration);

        logger.debug(`Timer ended: ${operationName} (${duration}ms)`, meta);
        return duration;
      },
    };
  }

  // Log current performance metrics
  static logMetricsSummary(): void {
    this.metrics.logPerformanceSummary();
  }

  // Get performance statistics
  static getStats(operationName: string) {
    return this.metrics.getMetricStats(operationName);
  }

  // Get all performance metrics
  static getAllStats() {
    return this.metrics.getAllMetrics();
  }

  // Clear all metrics
  static clearMetrics(): void {
    this.metrics.clearMetrics();
  }
}

// Database performance logging
export class DatabasePerformanceLogger {
  static async logQuery<T>(
    query: string,
    operation: string,
    fn: () => Promise<T>,
    context?: Record<string, any>
  ): Promise<T> {
    const startTime = Date.now();

    try {
      const result = await fn();
      const duration = Date.now() - startTime;

      logger.info(`Database query completed: ${operation}`, {
        query: query.substring(0, 200) + (query.length > 200 ? "..." : ""),
        operation,
        duration,
        success: true,
        ...context,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      logger.error(`Database query failed: ${operation}`, {
        query: query.substring(0, 200) + (query.length > 200 ? "..." : ""),
        operation,
        duration,
        error: error instanceof Error ? error.message : "Unknown error",
        ...context,
      });

      throw error;
    }
  }
}

// Network request performance logging
export class NetworkPerformanceLogger {
  static async logRequest<T>(
    url: string,
    method: string,
    fn: () => Promise<T>,
    context?: Record<string, any>
  ): Promise<T> {
    const startTime = Date.now();

    try {
      const result = await fn();
      const duration = Date.now() - startTime;

      logger.info(`Network request completed: ${method} ${url}`, {
        url,
        method,
        duration,
        success: true,
        ...context,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      logger.error(`Network request failed: ${method} ${url}`, {
        url,
        method,
        duration,
        error: error instanceof Error ? error.message : "Unknown error",
        ...context,
      });

      throw error;
    }
  }
}

// Component render performance logging (for client-side)
export class ComponentPerformanceLogger {
  static logRender(
    componentName: string,
    renderTime: number,
    props?: Record<string, any>
  ): void {
    const logLevel = renderTime > 16 ? "warn" : "debug"; // 16ms is ~60fps

    logger.log(logLevel, `Component render: ${componentName}`, {
      componentName,
      renderTime,
      props: props ? Object.keys(props) : undefined,
    });
  }
}

// Export singleton instance
export const performanceLogger = PerformanceLogger;
