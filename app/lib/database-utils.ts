/**
 * Database Utility Functions
 *
 * Common database operations and utilities for the Laundry Calendar application.
 */

import type { PrismaClient } from "../../generated/prisma";
import logger from "./logger";

/**
 * Database operation result type
 */
export type DatabaseResult<T = any> = {
  success: boolean;
  data?: T;
  error?: string;
};

/**
 * Transaction wrapper with error handling and logging
 */
export async function withTransaction<T>(
  prisma: PrismaClient,
  operation: (tx: any) => Promise<T>
): Promise<DatabaseResult<T>> {
  const startTime = Date.now();

  try {
    const result = await prisma.$transaction(operation);
    const duration = Date.now() - startTime;

    logger.info("Database transaction completed", {
      duration,
      success: true,
    });

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    logger.error("Database transaction failed", {
      duration,
      error: errorMessage,
      success: false,
    });

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Safe database operation wrapper
 */
export async function safeDbOperation<T>(
  operation: () => Promise<T>,
  context?: string
): Promise<DatabaseResult<T>> {
  const startTime = Date.now();

  try {
    const result = await operation();
    const duration = Date.now() - startTime;

    logger.debug("Database operation completed", {
      context,
      duration,
      success: true,
    });

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    logger.error("Database operation failed", {
      context,
      duration,
      error: errorMessage,
      success: false,
    });

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Pagination helper
 */
export interface PaginationOptions {
  page?: number;
  pageSize?: number;
  defaultPageSize?: number;
  maxPageSize?: number;
}

export interface PaginationResult<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export function createPaginationParams(options: PaginationOptions = {}) {
  const {
    page = 1,
    pageSize = options.defaultPageSize || 10,
    maxPageSize = 100,
  } = options;

  const normalizedPage = Math.max(1, page);
  const normalizedPageSize = Math.min(Math.max(1, pageSize), maxPageSize);
  const skip = (normalizedPage - 1) * normalizedPageSize;

  return {
    page: normalizedPage,
    pageSize: normalizedPageSize,
    skip,
    take: normalizedPageSize,
  };
}

export function createPaginationResult<T>(
  data: T[],
  totalCount: number,
  page: number,
  pageSize: number
): PaginationResult<T> {
  const totalPages = Math.ceil(totalCount / pageSize);

  return {
    data,
    pagination: {
      page,
      pageSize,
      totalCount,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
}

/**
 * Database seeding utilities
 */
export async function isDatabaseEmpty(prisma: PrismaClient): Promise<boolean> {
  try {
    // Check if any core tables have data
    // This will be expanded when we add actual models
    const result = (await prisma.$queryRaw`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma_%'
    `) as Array<{ name: string }>;

    return result.length === 0;
  } catch (error) {
    logger.error("Error checking if database is empty", { error });
    return false;
  }
}

/**
 * Database backup utilities (SQLite specific)
 */
export async function createDatabaseBackup(
  prisma: PrismaClient,
  backupPath: string
): Promise<DatabaseResult<void>> {
  try {
    // For SQLite, we can use the VACUUM INTO command
    await prisma.$executeRaw`VACUUM INTO ${backupPath}`;

    logger.info("Database backup created", { backupPath });

    return {
      success: true,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    logger.error("Database backup failed", {
      backupPath,
      error: errorMessage,
    });

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Database maintenance utilities
 */
export async function optimizeDatabase(
  prisma: PrismaClient
): Promise<DatabaseResult<void>> {
  try {
    // SQLite optimization commands
    await prisma.$executeRaw`PRAGMA optimize`;
    await prisma.$executeRaw`VACUUM`;
    await prisma.$executeRaw`ANALYZE`;

    logger.info("Database optimization completed");

    return {
      success: true,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    logger.error("Database optimization failed", {
      error: errorMessage,
    });

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Get database size information (SQLite specific)
 */
export async function getDatabaseSize(prisma: PrismaClient): Promise<
  DatabaseResult<{
    pageCount: number;
    pageSize: number;
    totalSize: number;
    freeListCount: number;
  }>
> {
  try {
    const [pageCountResult, pageSizeResult, freeListResult] = await Promise.all(
      [
        prisma.$queryRaw`PRAGMA page_count` as unknown as Array<{
          page_count: number;
        }>,
        prisma.$queryRaw`PRAGMA page_size` as unknown as Array<{
          page_size: number;
        }>,
        prisma.$queryRaw`PRAGMA freelist_count` as unknown as Array<{
          freelist_count: number;
        }>,
      ]
    );

    const pageCount = pageCountResult[0]?.page_count || 0;
    const pageSize = pageSizeResult[0]?.page_size || 0;
    const freeListCount = freeListResult[0]?.freelist_count || 0;
    const totalSize = pageCount * pageSize;

    return {
      success: true,
      data: {
        pageCount,
        pageSize,
        totalSize,
        freeListCount,
      },
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    logger.error("Failed to get database size", {
      error: errorMessage,
    });

    return {
      success: false,
      error: errorMessage,
    };
  }
}
