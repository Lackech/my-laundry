/**
 * Database Client Configuration
 *
 * This module provides a singleton Prisma client instance for server-side database operations.
 * The client is configured for optimal performance in development and production environments.
 */

import { PrismaClient } from "@prisma/client";
import logger from "./logger";

declare global {
  let __db__: PrismaClient | undefined;
}

/**
 * Create a new Prisma client instance with logging configuration
 */
function createPrismaClient(): PrismaClient {
  const client = new PrismaClient({
    log: [
      { level: "warn", emit: "event" },
      { level: "error", emit: "event" },
      { level: "info", emit: "event" },
      { level: "query", emit: "event" },
    ],
    errorFormat: "pretty",
  });

  // Configure logging for database events
  client.$on("warn", event => {
    logger.warn("Database warning", {
      timestamp: event.timestamp,
      message: event.message,
      target: event.target,
    });
  });

  client.$on("error", event => {
    logger.error("Database error", {
      timestamp: event.timestamp,
      message: event.message,
      target: event.target,
    });
  });

  client.$on("info", event => {
    logger.info("Database info", {
      timestamp: event.timestamp,
      message: event.message,
      target: event.target,
    });
  });

  client.$on("query", event => {
    logger.debug("Database query", {
      timestamp: event.timestamp,
      query: event.query,
      params: event.params,
      duration: event.duration,
      target: event.target,
    });
  });

  return client;
}

/**
 * Global singleton Prisma client instance
 *
 * In development, we store the client on the global object to prevent
 * multiple instances from being created during hot reloads.
 */
let db: PrismaClient;

if (process.env.NODE_ENV === "production") {
  db = createPrismaClient();
} else {
  if (!global.__db__) {
    global.__db__ = createPrismaClient();
  }
  db = global.__db__;
}

/**
 * Gracefully disconnect from the database
 */
export async function disconnectDatabase(): Promise<void> {
  try {
    await db.$disconnect();
    logger.info("Database disconnected gracefully");
  } catch (error) {
    logger.error("Error disconnecting from database", { error });
  }
}

/**
 * Check database connection health
 */
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await db.$queryRaw`SELECT 1`;
    logger.info("Database connection is healthy");
    return true;
  } catch (error) {
    logger.error("Database connection check failed", { error });
    return false;
  }
}

/**
 * Get database statistics
 */
export async function getDatabaseStats(): Promise<{
  connectionStatus: boolean;
  version: string | null;
}> {
  try {
    const connectionStatus = await checkDatabaseConnection();

    let version: string | null = null;
    if (connectionStatus) {
      try {
        const result =
          (await db.$queryRaw`SELECT sqlite_version() as version`) as Array<{
            version: string;
          }>;
        version = result[0]?.version || null;
      } catch (error) {
        logger.warn("Could not retrieve database version", { error });
      }
    }

    return {
      connectionStatus,
      version,
    };
  } catch (error) {
    logger.error("Error getting database stats", { error });
    return {
      connectionStatus: false,
      version: null,
    };
  }
}

export { db };
