/**
 * Database Seeding Script
 *
 * This script seeds the database with initial data for development.
 * Run with: npm run db:seed
 */

import { db } from "../app/lib/db.server";
import logger from "../app/lib/logger";
import {
  MachineType,
  MachineStatus,
  ReservationStatus,
  QueueStatus,
  LoginMethod,
  NotificationType,
  NotificationStatus,
  DeliveryMethod,
  NotificationPreferences,
} from "../generated/prisma";

async function seed() {
  try {
    logger.info("Starting database seeding...");

    // Clear existing data (for development)
    await db.notification.deleteMany();
    await db.session.deleteMany();
    await db.queueEntry.deleteMany();
    await db.reservation.deleteMany();
    await db.machine.deleteMany();
    await db.user.deleteMany();

    logger.info("Cleared existing data");

    // Create test users
    const users = await Promise.all([
      db.user.create({
        data: {
          email: "admin@laundry.com",
          passwordHash: "hashed_password_admin",
          firstName: "Admin",
          lastName: "User",
          phoneNumber: "+1234567890",
          apartmentNumber: "100",
          emailVerified: true,
          notificationPreferences: NotificationPreferences.ALL,
          timezone: "America/New_York",
          preferredLanguage: "en",
        },
      }),
      db.user.create({
        data: {
          email: "john.doe@example.com",
          passwordHash: "hashed_password_john",
          firstName: "John",
          lastName: "Doe",
          phoneNumber: "+1234567891",
          apartmentNumber: "101",
          emailVerified: true,
          notificationPreferences: NotificationPreferences.ALL,
          timezone: "America/New_York",
          preferredLanguage: "en",
        },
      }),
      db.user.create({
        data: {
          email: "jane.smith@example.com",
          passwordHash: "hashed_password_jane",
          firstName: "Jane",
          lastName: "Smith",
          phoneNumber: "+1234567892",
          apartmentNumber: "102",
          emailVerified: true,
          notificationPreferences: NotificationPreferences.ESSENTIAL_ONLY,
          timezone: "America/Los_Angeles",
          preferredLanguage: "en",
        },
      }),
      db.user.create({
        data: {
          email: "bob.wilson@example.com",
          passwordHash: "hashed_password_bob",
          firstName: "Bob",
          lastName: "Wilson",
          phoneNumber: "+1234567893",
          apartmentNumber: "103",
          emailVerified: false,
          notificationPreferences: NotificationPreferences.ALL,
          timezone: "America/Chicago",
          preferredLanguage: "en",
        },
      }),
      db.user.create({
        data: {
          email: "alice.johnson@example.com",
          passwordHash: "hashed_password_alice",
          firstName: "Alice",
          lastName: "Johnson",
          phoneNumber: "+1234567894",
          apartmentNumber: "104",
          emailVerified: true,
          notificationPreferences: NotificationPreferences.NONE,
          timezone: "America/Denver",
          preferredLanguage: "en",
        },
      }),
    ]);

    logger.info(`Created ${users.length} test users`);

    // Create machines
    const machines = await Promise.all([
      db.machine.create({
        data: {
          name: "Washer A1",
          type: MachineType.WASHER,
          status: MachineStatus.AVAILABLE,
          location: "Basement - Left Side",
          capacity: 20,
          cycleTimeMinutes: 35,
          manufacturer: "Whirlpool",
          modelNumber: "WFW5620HW",
          serialNumber: "WSR001",
          energyRating: "Energy Star",
          nextMaintenanceAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        },
      }),
      db.machine.create({
        data: {
          name: "Washer A2",
          type: MachineType.WASHER,
          status: MachineStatus.AVAILABLE,
          location: "Basement - Left Side",
          capacity: 20,
          cycleTimeMinutes: 35,
          manufacturer: "Whirlpool",
          modelNumber: "WFW5620HW",
          serialNumber: "WSR002",
          energyRating: "Energy Star",
          nextMaintenanceAt: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000), // 25 days from now
        },
      }),
      db.machine.create({
        data: {
          name: "Washer B1",
          type: MachineType.WASHER,
          status: MachineStatus.IN_USE,
          location: "Basement - Right Side",
          capacity: 18,
          cycleTimeMinutes: 40,
          manufacturer: "LG",
          modelNumber: "WM3900HWA",
          serialNumber: "WSR003",
          energyRating: "Energy Star",
          nextMaintenanceAt: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000), // 20 days from now
        },
      }),
      db.machine.create({
        data: {
          name: "Dryer A1",
          type: MachineType.DRYER,
          status: MachineStatus.AVAILABLE,
          location: "Basement - Left Side",
          capacity: 20,
          cycleTimeMinutes: 45,
          manufacturer: "Whirlpool",
          modelNumber: "WED5620HW",
          serialNumber: "DRY001",
          energyRating: "Energy Star",
          nextMaintenanceAt: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000), // 35 days from now
        },
      }),
      db.machine.create({
        data: {
          name: "Dryer A2",
          type: MachineType.DRYER,
          status: MachineStatus.AVAILABLE,
          location: "Basement - Left Side",
          capacity: 20,
          cycleTimeMinutes: 45,
          manufacturer: "Whirlpool",
          modelNumber: "WED5620HW",
          serialNumber: "DRY002",
          energyRating: "Energy Star",
          nextMaintenanceAt: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000), // 28 days from now
        },
      }),
      db.machine.create({
        data: {
          name: "Dryer B1",
          type: MachineType.DRYER,
          status: MachineStatus.MAINTENANCE,
          location: "Basement - Right Side",
          capacity: 18,
          cycleTimeMinutes: 50,
          manufacturer: "LG",
          modelNumber: "DLEX3900W",
          serialNumber: "DRY003",
          energyRating: "Energy Star",
          isOutOfOrder: false,
          maintenanceNotes: "Scheduled maintenance - lint filter replacement",
          nextMaintenanceAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days from now
        },
      }),
      db.machine.create({
        data: {
          name: "Dryer B2",
          type: MachineType.DRYER,
          status: MachineStatus.OUT_OF_ORDER,
          location: "Basement - Right Side",
          capacity: 18,
          cycleTimeMinutes: 50,
          manufacturer: "LG",
          modelNumber: "DLEX3900W",
          serialNumber: "DRY004",
          energyRating: "Energy Star",
          isOutOfOrder: true,
          outOfOrderReason: "Heating element needs replacement",
          maintenanceNotes: "Waiting for parts - heating element",
          nextMaintenanceAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        },
      }),
    ]);

    logger.info(`Created ${machines.length} machines`);

    // Create reservations
    const now = new Date();
    const reservations = await Promise.all([
      // Active reservation - currently in progress
      db.reservation.create({
        data: {
          userId: users[1].id, // John Doe
          machineId: machines[2].id, // Washer B1 (IN_USE)
          startTime: new Date(now.getTime() - 15 * 60 * 1000), // Started 15 minutes ago
          endTime: new Date(now.getTime() + 25 * 60 * 1000), // Ends in 25 minutes
          estimatedDuration: 40,
          status: ReservationStatus.ACTIVE,
          notes: "Heavy load",
        },
      }),
      // Future reservations
      db.reservation.create({
        data: {
          userId: users[2].id, // Jane Smith
          machineId: machines[0].id, // Washer A1
          startTime: new Date(now.getTime() + 2 * 60 * 60 * 1000), // 2 hours from now
          endTime: new Date(
            now.getTime() + 2 * 60 * 60 * 1000 + 35 * 60 * 1000
          ), // 2 hours 35 minutes from now
          estimatedDuration: 35,
          status: ReservationStatus.ACTIVE,
          notes: "Delicate cycle",
        },
      }),
      db.reservation.create({
        data: {
          userId: users[3].id, // Bob Wilson
          machineId: machines[3].id, // Dryer A1
          startTime: new Date(now.getTime() + 4 * 60 * 60 * 1000), // 4 hours from now
          endTime: new Date(
            now.getTime() + 4 * 60 * 60 * 1000 + 45 * 60 * 1000
          ), // 4 hours 45 minutes from now
          estimatedDuration: 45,
          status: ReservationStatus.ACTIVE,
        },
      }),
      // Completed reservations
      db.reservation.create({
        data: {
          userId: users[1].id, // John Doe
          machineId: machines[4].id, // Dryer A2
          startTime: new Date(now.getTime() - 2 * 60 * 60 * 1000), // 2 hours ago
          endTime: new Date(
            now.getTime() - 1 * 60 * 60 * 1000 - 15 * 60 * 1000
          ), // 1 hour 15 minutes ago
          estimatedDuration: 45,
          actualDuration: 45,
          status: ReservationStatus.COMPLETED,
          completedAt: new Date(
            now.getTime() - 1 * 60 * 60 * 1000 - 15 * 60 * 1000
          ),
        },
      }),
      db.reservation.create({
        data: {
          userId: users[4].id, // Alice Johnson
          machineId: machines[1].id, // Washer A2
          startTime: new Date(now.getTime() - 24 * 60 * 60 * 1000), // Yesterday
          endTime: new Date(
            now.getTime() - 24 * 60 * 60 * 1000 + 35 * 60 * 1000
          ), // Yesterday + 35 minutes
          estimatedDuration: 35,
          actualDuration: 35,
          status: ReservationStatus.COMPLETED,
          completedAt: new Date(
            now.getTime() - 24 * 60 * 60 * 1000 + 35 * 60 * 1000
          ),
        },
      }),
      // Cancelled reservation
      db.reservation.create({
        data: {
          userId: users[2].id, // Jane Smith
          machineId: machines[4].id, // Dryer A2
          startTime: new Date(now.getTime() - 3 * 60 * 60 * 1000), // 3 hours ago
          endTime: new Date(
            now.getTime() - 3 * 60 * 60 * 1000 + 45 * 60 * 1000
          ), // 3 hours ago + 45 minutes
          estimatedDuration: 45,
          status: ReservationStatus.CANCELLED,
          cancelledAt: new Date(
            now.getTime() - 3 * 60 * 60 * 1000 + 10 * 60 * 1000
          ), // 10 minutes after start time
          notes: "Emergency - had to cancel",
        },
      }),
    ]);

    logger.info(`Created ${reservations.length} reservations`);

    // Create queue entries
    const queueEntries = await Promise.all([
      db.queueEntry.create({
        data: {
          userId: users[3].id, // Bob Wilson
          machineId: machines[2].id, // Washer B1 (currently in use)
          position: 1,
          machineType: MachineType.WASHER,
          preferredStartTime: new Date(now.getTime() + 30 * 60 * 1000), // 30 minutes from now
          estimatedWaitTime: 25,
          notifyWhenAvailable: true,
          status: QueueStatus.WAITING,
          expiresAt: new Date(now.getTime() + 2 * 60 * 60 * 1000), // 2 hours from now
        },
      }),
      db.queueEntry.create({
        data: {
          userId: users[4].id, // Alice Johnson
          machineId: machines[2].id, // Washer B1 (currently in use)
          position: 2,
          machineType: MachineType.WASHER,
          preferredStartTime: new Date(now.getTime() + 1 * 60 * 60 * 1000), // 1 hour from now
          estimatedWaitTime: 65,
          notifyWhenAvailable: true,
          status: QueueStatus.WAITING,
          expiresAt: new Date(now.getTime() + 3 * 60 * 60 * 1000), // 3 hours from now
        },
      }),
      db.queueEntry.create({
        data: {
          userId: users[2].id, // Jane Smith
          machineType: MachineType.DRYER,
          position: 1,
          preferredStartTime: new Date(now.getTime() + 1.5 * 60 * 60 * 1000), // 1.5 hours from now
          estimatedWaitTime: 30,
          notifyWhenAvailable: true,
          status: QueueStatus.WAITING,
          expiresAt: new Date(now.getTime() + 4 * 60 * 60 * 1000), // 4 hours from now
        },
      }),
    ]);

    logger.info(`Created ${queueEntries.length} queue entries`);

    // Create user sessions
    const sessions = await Promise.all([
      db.session.create({
        data: {
          userId: users[0].id, // Admin
          token: "admin_session_token_12345",
          refreshToken: "admin_refresh_token_12345",
          userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
          ipAddress: "192.168.1.100",
          expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
          lastActivityAt: new Date(now.getTime() - 30 * 60 * 1000), // 30 minutes ago
          isActive: true,
          loginMethod: LoginMethod.PASSWORD,
          twoFactorVerified: false,
        },
      }),
      db.session.create({
        data: {
          userId: users[1].id, // John Doe
          token: "john_session_token_67890",
          refreshToken: "john_refresh_token_67890",
          userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)",
          ipAddress: "192.168.1.101",
          expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
          lastActivityAt: new Date(now.getTime() - 5 * 60 * 1000), // 5 minutes ago
          isActive: true,
          loginMethod: LoginMethod.PASSWORD,
          twoFactorVerified: false,
        },
      }),
      db.session.create({
        data: {
          userId: users[2].id, // Jane Smith
          token: "jane_session_token_abcde",
          refreshToken: "jane_refresh_token_abcde",
          userAgent:
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          ipAddress: "192.168.1.102",
          expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
          lastActivityAt: new Date(now.getTime() - 2 * 60 * 60 * 1000), // 2 hours ago
          isActive: true,
          loginMethod: LoginMethod.GOOGLE,
          twoFactorVerified: true,
        },
      }),
    ]);

    logger.info(`Created ${sessions.length} user sessions`);

    // Create notifications
    const notifications = await Promise.all([
      // Pending notification
      db.notification.create({
        data: {
          userId: users[1].id, // John Doe
          reservationId: reservations[0].id, // Active reservation
          type: NotificationType.RESERVATION_REMINDER,
          title: "Laundry Reminder",
          message: "Your laundry cycle will complete in 5 minutes",
          status: NotificationStatus.PENDING,
          deliveryMethod: DeliveryMethod.EMAIL,
          recipientEmail: users[1].email,
          attempts: 0,
          nextRetryAt: new Date(now.getTime() + 5 * 60 * 1000), // 5 minutes from now
        },
      }),
      // Sent notification
      db.notification.create({
        data: {
          userId: users[2].id, // Jane Smith
          reservationId: reservations[1].id, // Future reservation
          type: NotificationType.RESERVATION_CONFIRMED,
          title: "Reservation Confirmed",
          message:
            "Your laundry reservation for Washer A1 has been confirmed for 2:00 PM",
          status: NotificationStatus.SENT,
          deliveryMethod: DeliveryMethod.EMAIL,
          recipientEmail: users[2].email,
          attempts: 1,
          sentAt: new Date(now.getTime() - 30 * 60 * 1000), // 30 minutes ago
        },
      }),
      // Delivered notification
      db.notification.create({
        data: {
          userId: users[3].id, // Bob Wilson
          queueEntryId: queueEntries[0].id, // Queue entry
          type: NotificationType.QUEUE_POSITION_UPDATED,
          title: "Queue Position Updated",
          message: "You are now #1 in the queue for Washer B1",
          status: NotificationStatus.DELIVERED,
          deliveryMethod: DeliveryMethod.EMAIL,
          recipientEmail: users[3].email,
          attempts: 1,
          sentAt: new Date(now.getTime() - 1 * 60 * 60 * 1000), // 1 hour ago
          deliveredAt: new Date(now.getTime() - 55 * 60 * 1000), // 55 minutes ago
        },
      }),
      // Read notification
      db.notification.create({
        data: {
          userId: users[4].id, // Alice Johnson
          reservationId: reservations[4].id, // Completed reservation
          type: NotificationType.CYCLE_COMPLETE,
          title: "Cycle Complete",
          message:
            "Your laundry cycle has completed. Please collect your items",
          status: NotificationStatus.READ,
          deliveryMethod: DeliveryMethod.EMAIL,
          recipientEmail: users[4].email,
          attempts: 1,
          sentAt: new Date(now.getTime() - 24 * 60 * 60 * 1000), // Yesterday
          deliveredAt: new Date(
            now.getTime() - 24 * 60 * 60 * 1000 + 2 * 60 * 1000
          ), // Yesterday + 2 minutes
          readAt: new Date(
            now.getTime() - 24 * 60 * 60 * 1000 + 10 * 60 * 1000
          ), // Yesterday + 10 minutes
        },
      }),
      // Failed notification
      db.notification.create({
        data: {
          userId: users[3].id, // Bob Wilson (unverified email)
          type: NotificationType.SYSTEM_ANNOUNCEMENT,
          title: "System Maintenance",
          message: "Scheduled maintenance will occur this weekend",
          status: NotificationStatus.FAILED,
          deliveryMethod: DeliveryMethod.EMAIL,
          recipientEmail: users[3].email,
          attempts: 3,
          maxAttempts: 3,
          lastAttemptAt: new Date(now.getTime() - 6 * 60 * 60 * 1000), // 6 hours ago
        },
      }),
    ]);

    logger.info(`Created ${notifications.length} notifications`);

    // Update user last login times
    await Promise.all([
      db.user.update({
        where: { id: users[0].id },
        data: { lastLoginAt: new Date(now.getTime() - 30 * 60 * 1000) },
      }),
      db.user.update({
        where: { id: users[1].id },
        data: { lastLoginAt: new Date(now.getTime() - 5 * 60 * 1000) },
      }),
      db.user.update({
        where: { id: users[2].id },
        data: { lastLoginAt: new Date(now.getTime() - 2 * 60 * 60 * 1000) },
      }),
    ]);

    logger.info("Updated user login times");

    // Log summary
    const summary = {
      users: users.length,
      machines: machines.length,
      reservations: reservations.length,
      queueEntries: queueEntries.length,
      sessions: sessions.length,
      notifications: notifications.length,
    };

    logger.info("Database seeding completed successfully!", summary);
    console.log("\n=== SEED SUMMARY ===");
    console.log(`Users: ${summary.users}`);
    console.log(`Machines: ${summary.machines}`);
    console.log(`Reservations: ${summary.reservations}`);
    console.log(`Queue Entries: ${summary.queueEntries}`);
    console.log(`Sessions: ${summary.sessions}`);
    console.log(`Notifications: ${summary.notifications}`);
    console.log("===================\n");
  } catch (error) {
    logger.error("Database seeding failed:", error);
    throw error;
  } finally {
    await db.$disconnect();
  }
}

seed().catch(error => {
  logger.error("Seed script failed:", error);
  process.exit(1);
});
