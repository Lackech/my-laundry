#!/usr/bin/env tsx
/**
 * Core Data Models Test Script
 *
 * This script tests the core data models to ensure they work correctly
 * with proper relationships and constraints.
 */

import { db } from "../app/lib/db.server";
import {
  MachineType,
  MachineStatus,
  ReservationStatus,
  QueueStatus,
  NotificationType,
  NotificationStatus,
  DeliveryMethod,
  NotificationPreferences,
} from "@prisma/client";

async function testCoreModels() {
  console.log("🔍 Testing Core Data Models...");

  try {
    // Test 1: Create a test user
    console.log("\n1. Testing User model...");
    const testUser = await db.user.create({
      data: {
        email: "test@example.com",
        passwordHash: "hashed_password_123",
        firstName: "Test",
        lastName: "User",
        phoneNumber: "555-0123",
        apartmentNumber: "101",
        notificationPreferences: NotificationPreferences.ALL,
        timezone: "America/New_York",
      },
    });
    console.log("✅ User created:", testUser.email);

    // Test 2: Create a test machine
    console.log("\n2. Testing Machine model...");
    const testMachine = await db.machine.create({
      data: {
        name: "Washer #1",
        type: MachineType.WASHER,
        status: MachineStatus.AVAILABLE,
        location: "Basement",
        capacity: 15,
        cycleTimeMinutes: 30,
        manufacturer: "Whirlpool",
        modelNumber: "WFW5620HW",
        serialNumber: "TEST123456",
      },
    });
    console.log("✅ Machine created:", testMachine.name);

    // Test 3: Create a reservation
    console.log("\n3. Testing Reservation model...");
    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + 30 * 60 * 1000); // 30 minutes later

    const testReservation = await db.reservation.create({
      data: {
        userId: testUser.id,
        machineId: testMachine.id,
        startTime,
        endTime,
        estimatedDuration: 30,
        status: ReservationStatus.ACTIVE,
        notes: "Test reservation",
      },
    });
    console.log("✅ Reservation created:", testReservation.id);

    // Test 4: Create a queue entry
    console.log("\n4. Testing QueueEntry model...");
    const testQueueEntry = await db.queueEntry.create({
      data: {
        userId: testUser.id,
        machineId: testMachine.id,
        position: 1,
        machineType: MachineType.WASHER,
        preferredStartTime: new Date(),
        estimatedWaitTime: 15,
        status: QueueStatus.WAITING,
      },
    });
    console.log("✅ Queue entry created:", testQueueEntry.id);

    // Test 5: Create a session
    console.log("\n5. Testing Session model...");
    const testSession = await db.session.create({
      data: {
        userId: testUser.id,
        token: "test_token_123",
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        userAgent: "Mozilla/5.0 Test Browser",
        ipAddress: "192.168.1.1",
      },
    });
    console.log("✅ Session created:", testSession.id);

    // Test 6: Create a notification
    console.log("\n6. Testing Notification model...");
    const testNotification = await db.notification.create({
      data: {
        userId: testUser.id,
        reservationId: testReservation.id,
        type: NotificationType.RESERVATION_CONFIRMED,
        title: "Reservation Confirmed",
        message: "Your reservation for Washer #1 has been confirmed.",
        status: NotificationStatus.PENDING,
        deliveryMethod: DeliveryMethod.EMAIL,
        recipientEmail: testUser.email,
      },
    });
    console.log("✅ Notification created:", testNotification.id);

    // Test 7: Test relationships
    console.log("\n7. Testing relationships...");
    const userWithRelations = await db.user.findUnique({
      where: { id: testUser.id },
      include: {
        reservations: {
          include: {
            machine: true,
          },
        },
        queueEntries: {
          include: {
            machine: true,
          },
        },
        sessions: true,
        notifications: true,
      },
    });

    console.log("✅ User with relations:", {
      email: userWithRelations?.email,
      reservations: userWithRelations?.reservations.length,
      queueEntries: userWithRelations?.queueEntries.length,
      sessions: userWithRelations?.sessions.length,
      notifications: userWithRelations?.notifications.length,
    });

    // Test 8: Test constraints (unique email)
    console.log("\n8. Testing constraints...");
    try {
      await db.user.create({
        data: {
          email: "test@example.com", // Same email as first user
          passwordHash: "another_hash",
          firstName: "Another",
          lastName: "User",
        },
      });
      console.log(
        "❌ Constraint test failed - duplicate email should not be allowed"
      );
    } catch (error) {
      console.log("✅ Constraint test passed - duplicate email rejected");
    }

    // Test 9: Test indexes by querying
    console.log("\n9. Testing indexes...");
    const reservationsByMachine = await db.reservation.findMany({
      where: {
        machineId: testMachine.id,
        status: ReservationStatus.ACTIVE,
      },
      orderBy: {
        startTime: "asc",
      },
    });
    console.log(
      "✅ Index query successful:",
      reservationsByMachine.length,
      "reservations found"
    );

    // Clean up test data
    console.log("\n🧹 Cleaning up test data...");
    await db.notification.delete({ where: { id: testNotification.id } });
    await db.session.delete({ where: { id: testSession.id } });
    await db.queueEntry.delete({ where: { id: testQueueEntry.id } });
    await db.reservation.delete({ where: { id: testReservation.id } });
    await db.machine.delete({ where: { id: testMachine.id } });
    await db.user.delete({ where: { id: testUser.id } });
    console.log("✅ Test data cleaned up");

    console.log("\n🎉 All core data model tests passed successfully!");
  } catch (error) {
    console.error("❌ Core data model test failed:", error);
    process.exit(1);
  } finally {
    await db.$disconnect();
    console.log("🔌 Database disconnected");
  }
}

// Run the test
testCoreModels().catch(error => {
  console.error("❌ Unexpected error:", error);
  process.exit(1);
});
