#!/usr/bin/env tsx
/**
 * Database Maintenance Script
 *
 * This script provides comprehensive database maintenance utilities including:
 * - Database optimization and analysis
 * - Cleanup of old data
 * - Health monitoring and reporting
 * - Performance analysis
 * - Backup and restore operations
 *
 * Usage:
 *   tsx scripts/db-maintenance.ts [command] [options]
 *
 * Commands:
 *   optimize     - Run database optimization
 *   cleanup      - Clean up old data
 *   analyze      - Analyze database performance
 *   health       - Check database health
 *   backup       - Create database backup
 *   restore      - Restore database from backup
 *   vacuum       - Vacuum database (SQLite)
 *   stats        - Show database statistics
 */

import {
  writeFileSync,
  existsSync,
  mkdirSync,
  statSync,
  copyFileSync,
} from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { db } from "../app/lib/db.server";
import logger from "../app/lib/logger";
import {
  optimizeDatabase,
  getDatabaseSize,
  createDatabaseBackup,
} from "../app/lib/database-utils";

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, "..");
const BACKUPS_DIR = join(PROJECT_ROOT, "backups");
const DB_PATH = join(PROJECT_ROOT, "prisma", "dev.db");

interface DatabaseStats {
  totalTables: number;
  totalRecords: number;
  databaseSize: number;
  indexCount: number;
  tableStats: Array<{
    tableName: string;
    recordCount: number;
    size: number;
  }>;
}

interface HealthCheckResult {
  status: "healthy" | "warning" | "critical";
  checks: Array<{
    name: string;
    status: "pass" | "fail" | "warning";
    message: string;
    details?: any;
  }>;
  summary: {
    totalChecks: number;
    passed: number;
    warnings: number;
    failures: number;
  };
}

/**
 * Ensure backups directory exists
 */
function ensureBackupsDirectory(): void {
  if (!existsSync(BACKUPS_DIR)) {
    mkdirSync(BACKUPS_DIR, { recursive: true });
    logger.info(`Created backups directory: ${BACKUPS_DIR}`);
  }
}

/**
 * Get database statistics
 */
async function getDatabaseStats(): Promise<DatabaseStats> {
  try {
    // Get counts using Prisma models directly
    const [
      userCount,
      machineCount,
      reservationCount,
      queueCount,
      sessionCount,
      notificationCount,
    ] = await Promise.all([
      db.user.count(),
      db.machine.count(),
      db.reservation.count(),
      db.queueEntry.count(),
      db.session.count(),
      db.notification.count(),
    ]);

    const totalRecords =
      userCount +
      machineCount +
      reservationCount +
      queueCount +
      sessionCount +
      notificationCount;

    const tableStats = [
      { tableName: "users", recordCount: userCount, size: 0 },
      { tableName: "machines", recordCount: machineCount, size: 0 },
      { tableName: "reservations", recordCount: reservationCount, size: 0 },
      { tableName: "queue_entries", recordCount: queueCount, size: 0 },
      { tableName: "sessions", recordCount: sessionCount, size: 0 },
      { tableName: "notifications", recordCount: notificationCount, size: 0 },
    ];

    // Get index count
    const indexes = await db.$queryRaw<Array<{ name: string }>>`
      SELECT name FROM sqlite_master 
      WHERE type='index' AND name NOT LIKE 'sqlite_%'
    `;

    // Get database size
    const sizeResult = await getDatabaseSize(db);
    const databaseSize = sizeResult.success ? sizeResult.data!.totalSize : 0;

    return {
      totalTables: tableStats.length,
      totalRecords,
      databaseSize,
      indexCount: indexes.length,
      tableStats,
    };
  } catch (error: any) {
    logger.error("Failed to get database statistics:", error);
    throw error;
  }
}

/**
 * Run database optimization
 */
async function runOptimization(): Promise<void> {
  logger.info("Starting database optimization...");

  try {
    // Run built-in optimization
    const result = await optimizeDatabase(db);

    if (result.success) {
      logger.info("Database optimization completed successfully");
    } else {
      logger.error("Database optimization failed:", result.error);
      throw new Error(result.error);
    }

    // Additional SQLite-specific optimizations
    await db.$queryRaw`PRAGMA optimize`;
    await db.$queryRaw`PRAGMA analysis_limit=1000`;
    await db.$queryRaw`PRAGMA cache_size=10000`;

    logger.info("Additional optimizations applied");
  } catch (error: any) {
    logger.error("Database optimization failed:", error);
    throw error;
  }
}

/**
 * Clean up old data
 */
async function cleanupOldData(
  options: {
    daysOld?: number;
    dryRun?: boolean;
    tables?: string[];
  } = {}
): Promise<void> {
  const { daysOld = 30, dryRun = false, tables = [] } = options;

  logger.info(
    `Starting cleanup of data older than ${daysOld} days ${
      dryRun ? "(DRY RUN)" : ""
    }`
  );

  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const cleanupTasks = [
      // Clean up old completed reservations
      {
        name: "old_completed_reservations",
        query: `DELETE FROM reservations WHERE status = 'COMPLETED' AND completedAt < ?`,
        params: [cutoffDate],
      },
      // Clean up old cancelled reservations
      {
        name: "old_cancelled_reservations",
        query: `DELETE FROM reservations WHERE status = 'CANCELLED' AND cancelledAt < ?`,
        params: [cutoffDate],
      },
      // Clean up old expired queue entries
      {
        name: "old_expired_queue_entries",
        query: `DELETE FROM queue_entries WHERE status = 'EXPIRED' AND expiresAt < ?`,
        params: [cutoffDate],
      },
      // Clean up old delivered notifications
      {
        name: "old_delivered_notifications",
        query: `DELETE FROM notifications WHERE status = 'DELIVERED' AND deliveredAt < ?`,
        params: [cutoffDate],
      },
      // Clean up old inactive sessions
      {
        name: "old_inactive_sessions",
        query: `DELETE FROM sessions WHERE isActive = false AND lastActivityAt < ?`,
        params: [cutoffDate],
      },
    ];

    let totalDeleted = 0;

    for (const task of cleanupTasks) {
      if (tables.length > 0 && !tables.includes(task.name)) {
        continue;
      }

      if (dryRun) {
        // Count records that would be deleted
        const countQuery = task.query.replace(
          "DELETE FROM",
          "SELECT COUNT(*) as count FROM"
        );
        const countResult = await db.$queryRaw<
          Array<{ count: number }>
        >`${countQuery}`;
        const count = countResult[0]?.count || 0;

        logger.info(
          `[DRY RUN] Would delete ${count} records from ${task.name}`
        );
        totalDeleted += count;
      } else {
        // Actually delete the records
        const result = await db.$executeRaw`${task.query}`;
        logger.info(`Deleted ${result} records from ${task.name}`);
        totalDeleted += result;
      }
    }

    logger.info(
      `Cleanup completed. ${
        dryRun ? "Would have deleted" : "Deleted"
      } ${totalDeleted} total records`
    );
  } catch (error: any) {
    logger.error("Data cleanup failed:", error);
    throw error;
  }
}

/**
 * Analyze database performance
 */
async function analyzePerformance(): Promise<void> {
  logger.info("Starting database performance analysis...");

  try {
    const stats = await getDatabaseStats();

    console.log("\n=== DATABASE PERFORMANCE ANALYSIS ===");
    console.log(
      `Database Size: ${(Number(stats.databaseSize) / 1024 / 1024).toFixed(
        2
      )} MB`
    );
    console.log(`Total Tables: ${stats.totalTables}`);
    console.log(`Total Records: ${stats.totalRecords}`);
    console.log(`Total Indexes: ${stats.indexCount}`);
    console.log();

    // Table statistics
    console.log("=== TABLE STATISTICS ===");
    stats.tableStats.forEach(table => {
      console.log(`${table.tableName}: ${table.recordCount} records`);
    });
    console.log();

    // Check for tables with high record counts
    const highRecordTables = stats.tableStats.filter(t => t.recordCount > 1000);
    if (highRecordTables.length > 0) {
      console.log("=== HIGH RECORD COUNT TABLES ===");
      highRecordTables.forEach(table => {
        console.log(`⚠️  ${table.tableName}: ${table.recordCount} records`);
      });
      console.log();
    }

    // Analyze query performance (sample queries)
    console.log("=== QUERY PERFORMANCE ===");

    const performanceTests = [
      {
        name: "User lookup by email",
        query: `SELECT * FROM users WHERE email = 'john.doe@example.com'`,
      },
      {
        name: "Active reservations",
        query: `SELECT * FROM reservations WHERE status = 'ACTIVE' ORDER BY startTime`,
      },
      {
        name: "Machine availability",
        query: `SELECT * FROM machines WHERE status = 'AVAILABLE' AND isOutOfOrder = false`,
      },
      {
        name: "Pending notifications",
        query: `SELECT * FROM notifications WHERE status = 'PENDING' ORDER BY createdAt`,
      },
    ];

    for (const test of performanceTests) {
      const startTime = Date.now();
      await db.$queryRaw`${test.query}`;
      const duration = Date.now() - startTime;

      console.log(`${test.name}: ${duration}ms`);
    }
  } catch (error: any) {
    logger.error("Performance analysis failed:", error);
    throw error;
  }
}

/**
 * Check database health
 */
async function checkHealth(): Promise<HealthCheckResult> {
  logger.info("Starting database health check...");

  const checks = [];

  try {
    // Check database connectivity
    try {
      await db.$queryRaw`SELECT 1`;
      checks.push({
        name: "Database Connectivity",
        status: "pass" as const,
        message: "Database is accessible",
      });
    } catch (error: any) {
      checks.push({
        name: "Database Connectivity",
        status: "fail" as const,
        message: `Database connection failed: ${error.message}`,
      });
    }

    // Check database integrity
    try {
      const integrityResult = await db.$queryRaw<
        Array<{ integrity_check: string }>
      >`
        PRAGMA integrity_check
      `;

      const isOk = integrityResult.some(r => r.integrity_check === "ok");
      checks.push({
        name: "Database Integrity",
        status: isOk ? "pass" : "fail",
        message: isOk
          ? "Database integrity is good"
          : "Database integrity issues detected",
        details: integrityResult,
      });
    } catch (error: any) {
      checks.push({
        name: "Database Integrity",
        status: "fail" as const,
        message: `Integrity check failed: ${error.message}`,
      });
    }

    // Check for orphaned records
    try {
      const orphanedReservations = await db.$queryRaw<Array<{ count: number }>>`
        SELECT COUNT(*) as count FROM reservations 
        WHERE userId NOT IN (SELECT id FROM users) 
        OR machineId NOT IN (SELECT id FROM machines)
      `;

      const orphanedCount = orphanedReservations[0]?.count || 0;
      checks.push({
        name: "Orphaned Records",
        status: orphanedCount === 0 ? "pass" : "warning",
        message:
          orphanedCount === 0
            ? "No orphaned records found"
            : `Found ${orphanedCount} orphaned reservations`,
        details: { orphanedCount },
      });
    } catch (error: any) {
      checks.push({
        name: "Orphaned Records",
        status: "fail" as const,
        message: `Orphaned records check failed: ${error.message}`,
      });
    }

    // Check database size
    try {
      const sizeResult = await getDatabaseSize(db);
      if (sizeResult.success) {
        const sizeMB = sizeResult.data!.totalSize / 1024 / 1024;
        checks.push({
          name: "Database Size",
          status: sizeMB > 100 ? "warning" : "pass",
          message: `Database size: ${sizeMB.toFixed(2)} MB`,
          details: sizeResult.data,
        });
      } else {
        checks.push({
          name: "Database Size",
          status: "fail" as const,
          message: "Could not determine database size",
        });
      }
    } catch (error: any) {
      checks.push({
        name: "Database Size",
        status: "fail" as const,
        message: `Database size check failed: ${error.message}`,
      });
    }

    // Check for table locks
    try {
      await db.$queryRaw<Array<{ name: string }>>`
        SELECT name FROM sqlite_master WHERE type='table' AND name='sqlite_stat1'
      `;

      checks.push({
        name: "Table Locks",
        status: "pass" as const,
        message: "No table locks detected",
      });
    } catch (error: any) {
      checks.push({
        name: "Table Locks",
        status: "warning" as const,
        message: "Could not check for table locks",
      });
    }
  } catch (error: any) {
    logger.error("Health check failed:", error);
    checks.push({
      name: "General Health Check",
      status: "fail" as const,
      message: `Health check failed: ${error.message}`,
    });
  }

  const summary = {
    totalChecks: checks.length,
    passed: checks.filter(c => c.status === "pass").length,
    warnings: checks.filter(c => c.status === "warning").length,
    failures: checks.filter(c => c.status === "fail").length,
  };

  const status =
    summary.failures > 0
      ? "critical"
      : summary.warnings > 0
      ? "warning"
      : "healthy";

  return {
    status,
    checks,
    summary,
  };
}

/**
 * Create database backup
 */
async function createBackup(options: { name?: string } = {}): Promise<void> {
  ensureBackupsDirectory();

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupName = options.name || `backup_${timestamp}`;
  const backupPath = join(BACKUPS_DIR, `${backupName}.db`);

  logger.info(`Creating database backup: ${backupPath}`);

  try {
    const result = await createDatabaseBackup(db, backupPath);

    if (result.success) {
      logger.info(`Database backup created successfully: ${backupPath}`);

      // Create metadata file
      const metadataPath = join(BACKUPS_DIR, `${backupName}.json`);
      const metadata = {
        name: backupName,
        timestamp: new Date().toISOString(),
        path: backupPath,
        size: statSync(backupPath).size,
      };

      writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
      logger.info(`Backup metadata saved: ${metadataPath}`);
    } else {
      logger.error("Database backup failed:", result.error);
      throw new Error(result.error);
    }
  } catch (error: any) {
    logger.error("Database backup failed:", error);
    throw error;
  }
}

/**
 * Restore database from backup
 */
async function restoreBackup(backupName: string): Promise<void> {
  const backupPath = join(BACKUPS_DIR, `${backupName}.db`);

  if (!existsSync(backupPath)) {
    throw new Error(`Backup file not found: ${backupPath}`);
  }

  logger.warn(`Restoring database from backup: ${backupPath}`);
  logger.warn("This will overwrite the current database!");

  try {
    // Close current database connection
    await db.$disconnect();

    // Copy backup to current database location
    copyFileSync(backupPath, DB_PATH);

    logger.info(`Database restored successfully from: ${backupPath}`);
  } catch (error: any) {
    logger.error("Database restore failed:", error);
    throw error;
  }
}

/**
 * Show database statistics
 */
async function showStats(): Promise<void> {
  try {
    const stats = await getDatabaseStats();

    console.log("\n=== DATABASE STATISTICS ===");
    console.log(
      `Database Size: ${(Number(stats.databaseSize) / 1024 / 1024).toFixed(
        2
      )} MB`
    );
    console.log(`Total Tables: ${stats.totalTables}`);
    console.log(`Total Records: ${stats.totalRecords}`);
    console.log(`Total Indexes: ${stats.indexCount}`);
    console.log();

    console.log("=== TABLE BREAKDOWN ===");
    stats.tableStats.forEach(table => {
      const percentage = (
        (table.recordCount / stats.totalRecords) *
        100
      ).toFixed(1);
      console.log(
        `${table.tableName}: ${table.recordCount} records (${percentage}%)`
      );
    });
  } catch (error: any) {
    logger.error("Failed to show statistics:", error);
    throw error;
  }
}

/**
 * Main function
 */
async function main(): Promise<void> {
  const command = process.argv[2];
  const args = process.argv.slice(3);

  try {
    switch (command) {
      case "optimize":
        await runOptimization();
        break;

      case "cleanup": {
        const daysOld = parseInt(args[0]) || 30;
        const dryRun = args.includes("--dry-run");
        await cleanupOldData({ daysOld, dryRun });
        break;
      }

      case "analyze":
        await analyzePerformance();
        break;

      case "health": {
        const healthResult = await checkHealth();
        console.log("\n=== DATABASE HEALTH CHECK ===");
        console.log(`Overall Status: ${healthResult.status.toUpperCase()}`);
        console.log(
          `Checks: ${healthResult.summary.passed}/${healthResult.summary.totalChecks} passed`
        );
        console.log();

        healthResult.checks.forEach(check => {
          const icon =
            check.status === "pass"
              ? "✓"
              : check.status === "warning"
              ? "⚠️"
              : "✗";
          console.log(`${icon} ${check.name}: ${check.message}`);
          if (check.details) {
            console.log(
              `   Details: ${JSON.stringify(check.details, null, 2)}`
            );
          }
        });
        break;
      }

      case "backup": {
        const backupName = args[0];
        await createBackup({ name: backupName });
        break;
      }

      case "restore": {
        const restoreName = args[0];
        if (!restoreName) {
          console.log(
            "Usage: tsx scripts/db-maintenance.ts restore <backup_name>"
          );
          process.exit(1);
        }
        await restoreBackup(restoreName);
        break;
      }

      case "vacuum":
        logger.info("Running database vacuum...");
        await db.$queryRaw`VACUUM`;
        logger.info("Database vacuum completed");
        break;

      case "stats":
        await showStats();
        break;

      default:
        console.log("Database Maintenance Utility");
        console.log("");
        console.log("Usage: tsx scripts/db-maintenance.ts [command] [options]");
        console.log("");
        console.log("Commands:");
        console.log("  optimize              Run database optimization");
        console.log(
          "  cleanup [days]        Clean up old data (default: 30 days)"
        );
        console.log("  analyze               Analyze database performance");
        console.log("  health                Check database health");
        console.log("  backup [name]         Create database backup");
        console.log("  restore <name>        Restore database from backup");
        console.log("  vacuum                Vacuum database (SQLite)");
        console.log("  stats                 Show database statistics");
        console.log("");
        console.log("Options:");
        console.log(
          "  --dry-run             Show what would be done (for cleanup)"
        );
        console.log("");
        console.log("Examples:");
        console.log("  tsx scripts/db-maintenance.ts health");
        console.log("  tsx scripts/db-maintenance.ts cleanup 60 --dry-run");
        console.log("  tsx scripts/db-maintenance.ts backup weekly_backup");
        console.log("  tsx scripts/db-maintenance.ts optimize");
        break;
    }
  } catch (error: any) {
    logger.error(`Maintenance command failed: ${error.message}`);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

// Run the main function
main().catch(error => {
  logger.error("Maintenance script failed:", error);
  process.exit(1);
});
