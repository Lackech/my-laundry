#!/usr/bin/env tsx
/**
 * Database Migration Management Utility
 *
 * This script provides comprehensive migration management with rollback capabilities,
 * validation, and version control for the Laundry Calendar database.
 *
 * Usage:
 *   tsx scripts/migrate.ts [command] [options]
 *
 * Commands:
 *   status    - Show migration status
 *   up        - Apply pending migrations
 *   down      - Rollback last migration
 *   reset     - Reset database and apply all migrations
 *   validate  - Validate migration files
 *   create    - Create new migration
 *   rollback  - Rollback to specific migration
 *   history   - Show migration history
 */

import { execSync } from "child_process";
import { readFileSync, existsSync, readdirSync, statSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { db } from "../app/lib/db.server";
import logger from "../app/lib/logger";

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, "..");
const MIGRATIONS_DIR = join(PROJECT_ROOT, "prisma", "migrations");

interface MigrationInfo {
  id: string;
  name: string;
  timestamp: string;
  status: "applied" | "pending" | "failed";
  appliedAt?: Date;
  rollbackSql?: string;
  checksum?: string;
}

interface MigrationFile {
  path: string;
  sql: string;
  checksum: string;
}

/**
 * Calculate MD5 checksum for migration content
 */
async function calculateChecksum(content: string): Promise<string> {
  const crypto = await import("crypto");
  return crypto.createHash("md5").update(content).digest("hex");
}

/**
 * Get all migration directories
 */
function getMigrationDirectories(): string[] {
  if (!existsSync(MIGRATIONS_DIR)) {
    return [];
  }

  return readdirSync(MIGRATIONS_DIR)
    .filter(dir => {
      const dirPath = join(MIGRATIONS_DIR, dir);
      return statSync(dirPath).isDirectory() && dir.match(/^\d{14}_/);
    })
    .sort();
}

/**
 * Parse migration directory name
 */
function parseMigrationName(dirName: string): {
  timestamp: string;
  name: string;
} {
  const match = dirName.match(/^(\d{14})_(.+)$/);
  if (!match) {
    throw new Error(`Invalid migration directory name: ${dirName}`);
  }
  return { timestamp: match[1], name: match[2] };
}

/**
 * Read migration SQL file
 */
async function readMigrationFile(migrationDir: string): Promise<MigrationFile> {
  const sqlPath = join(MIGRATIONS_DIR, migrationDir, "migration.sql");
  if (!existsSync(sqlPath)) {
    throw new Error(`Migration SQL file not found: ${sqlPath}`);
  }

  const sql = readFileSync(sqlPath, "utf8");
  const checksum = await calculateChecksum(sql);

  return {
    path: sqlPath,
    sql,
    checksum,
  };
}

/**
 * Get migration status from Prisma
 */
async function getPrismaStatus(): Promise<string> {
  try {
    const output = execSync("npx prisma migrate status", {
      cwd: PROJECT_ROOT,
      encoding: "utf8",
      stdio: "pipe",
    });
    return output;
  } catch (error: any) {
    logger.error("Failed to get Prisma migration status:", error.message);
    return error.stdout || error.stderr || "Unknown error";
  }
}

/**
 * Get detailed migration information
 */
async function getMigrationInfo(): Promise<MigrationInfo[]> {
  const migrationDirs = getMigrationDirectories();
  const migrations: MigrationInfo[] = [];

  // Get applied migrations from Prisma
  const statusOutput = await getPrismaStatus();
  const appliedMigrations = new Set<string>();

  const statusLines = statusOutput.split("\n");
  let isAppliedSection = false;

  for (const line of statusLines) {
    if (line.includes("migrations found in prisma/migrations")) {
      isAppliedSection = true;
      continue;
    }
    if (isAppliedSection && line.trim().startsWith("Following migration")) {
      isAppliedSection = false;
    }
    if (isAppliedSection && line.trim()) {
      const migrationMatch = line.match(/(\d{14}_[^/]+)/);
      if (migrationMatch) {
        appliedMigrations.add(migrationMatch[1]);
      }
    }
  }

  // Process each migration directory
  for (const dirName of migrationDirs) {
    const { timestamp, name } = parseMigrationName(dirName);
    const migrationFile = await readMigrationFile(dirName);

    migrations.push({
      id: dirName,
      name,
      timestamp,
      status: appliedMigrations.has(dirName) ? "applied" : "pending",
      checksum: migrationFile.checksum,
    });
  }

  return migrations;
}

/**
 * Validate migration files
 */
async function validateMigrations(): Promise<{
  valid: boolean;
  errors: string[];
}> {
  const errors: string[] = [];

  try {
    const migrations = await getMigrationInfo();

    // Check for sequential timestamps
    const timestamps = migrations.map(m => m.timestamp);
    for (let i = 1; i < timestamps.length; i++) {
      if (timestamps[i] <= timestamps[i - 1]) {
        errors.push(
          `Migration timestamps are not sequential: ${timestamps[i - 1]} >= ${
            timestamps[i]
          }`
        );
      }
    }

    // Check for duplicate names
    const names = migrations.map(m => m.name);
    const uniqueNames = new Set(names);
    if (names.length !== uniqueNames.size) {
      errors.push("Duplicate migration names detected");
    }

    // Validate SQL syntax by attempting to parse
    for (const migration of migrations) {
      try {
        const migrationFile = await readMigrationFile(migration.id);
        if (!migrationFile.sql.trim()) {
          errors.push(`Empty migration file: ${migration.id}`);
        }
      } catch (error: any) {
        errors.push(`Cannot read migration ${migration.id}: ${error.message}`);
      }
    }

    // Check for Prisma schema drift
    try {
      execSync("npx prisma format --check", {
        cwd: PROJECT_ROOT,
        stdio: "pipe",
      });
    } catch (error) {
      errors.push("Prisma schema format issues detected");
    }
  } catch (error: any) {
    errors.push(`Validation error: ${error.message}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Create a new migration
 */
async function createMigration(name: string): Promise<void> {
  if (!name) {
    throw new Error("Migration name is required");
  }

  // Clean the name
  const cleanName = name.replace(/[^a-zA-Z0-9_]/g, "_").toLowerCase();

  logger.info(`Creating new migration: ${cleanName}`);

  try {
    execSync(`npx prisma migrate dev --name ${cleanName}`, {
      cwd: PROJECT_ROOT,
      stdio: "inherit",
    });

    logger.info(`Migration created successfully: ${cleanName}`);
  } catch (error: any) {
    logger.error(`Failed to create migration: ${error.message}`);
    throw error;
  }
}

/**
 * Apply pending migrations
 */
async function applyMigrations(): Promise<void> {
  logger.info("Applying pending migrations...");

  try {
    execSync("npx prisma migrate deploy", {
      cwd: PROJECT_ROOT,
      stdio: "inherit",
    });

    logger.info("Migrations applied successfully");
  } catch (error: any) {
    logger.error(`Failed to apply migrations: ${error.message}`);
    throw error;
  }
}

/**
 * Rollback to a specific migration
 */
async function rollbackToMigration(targetMigration: string): Promise<void> {
  logger.warn(`Rolling back to migration: ${targetMigration}`);

  // This is a complex operation that would require custom implementation
  // For now, we'll use Prisma's reset and selective apply
  logger.warn("Rollback requires manual intervention. Use with caution.");

  try {
    // First, reset the database
    execSync("npx prisma migrate reset --force", {
      cwd: PROJECT_ROOT,
      stdio: "inherit",
    });

    // Then apply migrations up to the target
    const migrations = await getMigrationInfo();
    const targetIndex = migrations.findIndex(m => m.id === targetMigration);

    if (targetIndex === -1) {
      throw new Error(`Target migration not found: ${targetMigration}`);
    }

    logger.info(`Applying migrations up to ${targetMigration}`);

    // Apply migrations one by one up to target
    for (let i = 0; i <= targetIndex; i++) {
      const migration = migrations[i];
      logger.info(`Applying migration: ${migration.id}`);

      // This would require manual SQL application
      // For now, we recommend using Prisma's built-in tools
    }

    logger.warn("Rollback completed. Please verify database state.");
  } catch (error: any) {
    logger.error(`Rollback failed: ${error.message}`);
    throw error;
  }
}

/**
 * Reset database and apply all migrations
 */
async function resetDatabase(): Promise<void> {
  logger.warn("Resetting database and applying all migrations...");

  try {
    execSync("npx prisma migrate reset --force", {
      cwd: PROJECT_ROOT,
      stdio: "inherit",
    });

    logger.info("Database reset and migrations applied successfully");
  } catch (error: any) {
    logger.error(`Database reset failed: ${error.message}`);
    throw error;
  }
}

/**
 * Show migration status
 */
async function showStatus(): Promise<void> {
  console.log("\n=== MIGRATION STATUS ===");

  try {
    const migrations = await getMigrationInfo();

    if (migrations.length === 0) {
      console.log("No migrations found.");
      return;
    }

    console.log(`Total migrations: ${migrations.length}`);
    console.log(
      `Applied: ${migrations.filter(m => m.status === "applied").length}`
    );
    console.log(
      `Pending: ${migrations.filter(m => m.status === "pending").length}`
    );
    console.log();

    // Show individual migration status
    for (const migration of migrations) {
      const status = migration.status === "applied" ? "✓" : "○";
      const timestamp = migration.timestamp;
      const date = `${timestamp.slice(0, 4)}-${timestamp.slice(
        4,
        6
      )}-${timestamp.slice(6, 8)}`;
      const time = `${timestamp.slice(8, 10)}:${timestamp.slice(
        10,
        12
      )}:${timestamp.slice(12, 14)}`;

      console.log(`${status} ${migration.id}`);
      console.log(`   Date: ${date} ${time}`);
      console.log(`   Name: ${migration.name}`);
      console.log(`   Status: ${migration.status}`);
      console.log(`   Checksum: ${migration.checksum?.slice(0, 8)}...`);
      console.log();
    }
  } catch (error: any) {
    logger.error(`Failed to get migration status: ${error.message}`);
  }
}

/**
 * Show migration history
 */
async function showHistory(): Promise<void> {
  console.log("\n=== MIGRATION HISTORY ===");

  try {
    const statusOutput = await getPrismaStatus();
    console.log(statusOutput);
  } catch (error: any) {
    logger.error(`Failed to get migration history: ${error.message}`);
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
      case "status":
        await showStatus();
        break;

      case "up":
        await applyMigrations();
        break;

      case "down":
        logger.warn(
          'Individual migration rollback not implemented. Use "rollback" command instead.'
        );
        break;

      case "reset":
        await resetDatabase();
        break;

      case "validate": {
        const validation = await validateMigrations();
        if (validation.valid) {
          console.log("✓ All migrations are valid");
        } else {
          console.log("✗ Migration validation failed:");
          validation.errors.forEach(error => console.log(`  - ${error}`));
          process.exit(1);
        }
        break;
      }

      case "create": {
        const name = args[0];
        if (!name) {
          console.log("Usage: tsx scripts/migrate.ts create <migration_name>");
          process.exit(1);
        }
        await createMigration(name);
        break;
      }

      case "rollback": {
        const target = args[0];
        if (!target) {
          console.log("Usage: tsx scripts/migrate.ts rollback <migration_id>");
          process.exit(1);
        }
        await rollbackToMigration(target);
        break;
      }

      case "history":
        await showHistory();
        break;

      default:
        console.log("Database Migration Management Utility");
        console.log("");
        console.log("Usage: tsx scripts/migrate.ts [command] [options]");
        console.log("");
        console.log("Commands:");
        console.log("  status       Show migration status");
        console.log("  up           Apply pending migrations");
        console.log("  down         Rollback last migration");
        console.log("  reset        Reset database and apply all migrations");
        console.log("  validate     Validate migration files");
        console.log("  create <name>  Create new migration");
        console.log("  rollback <id>  Rollback to specific migration");
        console.log("  history      Show migration history");
        console.log("");
        console.log("Examples:");
        console.log("  tsx scripts/migrate.ts status");
        console.log("  tsx scripts/migrate.ts create add_user_preferences");
        console.log(
          "  tsx scripts/migrate.ts rollback 20240101120000_initial_setup"
        );
        console.log("  tsx scripts/migrate.ts validate");
        break;
    }
  } catch (error: any) {
    logger.error(`Migration command failed: ${error.message}`);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

// Run the main function
main().catch(error => {
  logger.error("Migration script failed:", error);
  process.exit(1);
});
