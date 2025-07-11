#!/usr/bin/env tsx
/**
 * Database Connection Test Script
 *
 * This script tests the database connection and basic Prisma setup.
 * Run with: npx tsx scripts/test-db-connection.ts
 */

import {
  db,
  checkDatabaseConnection,
  getDatabaseStats,
} from "../app/lib/db.server";

async function testDatabaseConnection() {
  console.log("🔍 Testing database connection...");

  try {
    // Test basic connection
    const isConnected = await checkDatabaseConnection();
    console.log(
      `✅ Database connection: ${isConnected ? "SUCCESS" : "FAILED"}`
    );

    // Get database stats
    const stats = await getDatabaseStats();
    console.log("📊 Database Stats:");
    console.log(
      `   Connection Status: ${
        stats.connectionStatus ? "✅ Connected" : "❌ Disconnected"
      }`
    );
    console.log(`   SQLite Version: ${stats.version || "Unknown"}`);

    // Test a simple query
    console.log("\n🔍 Testing simple query...");
    const result = await db.$queryRaw`SELECT 'Hello from SQLite!' as message`;
    console.log("✅ Query result:", result);

    // Test database file creation
    console.log("\n🔍 Testing database file creation...");
    await db.$executeRaw`CREATE TABLE IF NOT EXISTS _test_table (id INTEGER PRIMARY KEY, name TEXT)`;
    await db.$executeRaw`INSERT OR IGNORE INTO _test_table (id, name) VALUES (1, 'test')`;
    const testResult =
      (await db.$queryRaw`SELECT * FROM _test_table WHERE id = 1`) as Array<{
        id: number;
        name: string;
      }>;
    console.log("✅ Test table result:", testResult);

    // Clean up test table
    await db.$executeRaw`DROP TABLE IF EXISTS _test_table`;

    console.log("\n🎉 Database connection test completed successfully!");
  } catch (error) {
    console.error("❌ Database connection test failed:", error);
    process.exit(1);
  } finally {
    // Disconnect from database
    await db.$disconnect();
    console.log("🔌 Database disconnected");
  }
}

// Run the test
testDatabaseConnection().catch(error => {
  console.error("❌ Unexpected error:", error);
  process.exit(1);
});
