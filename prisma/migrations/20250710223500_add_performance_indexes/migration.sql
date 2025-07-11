-- Performance Optimization Migration: Add Critical Indexes
-- This migration adds comprehensive indexes for all critical queries

-- Users table indexes
CREATE INDEX "users_createdAt_idx" ON "users"("createdAt");
CREATE INDEX "users_lastLoginAt_idx" ON "users"("lastLoginAt");
CREATE INDEX "users_emailVerified_idx" ON "users"("emailVerified");
CREATE INDEX "users_apartmentNumber_idx" ON "users"("apartmentNumber");
CREATE INDEX "users_notificationPreferences_idx" ON "users"("notificationPreferences");

-- Machines table indexes
CREATE INDEX "machines_type_status_idx" ON "machines"("type", "status");
CREATE INDEX "machines_location_type_idx" ON "machines"("location", "type");
CREATE INDEX "machines_status_idx" ON "machines"("status");
CREATE INDEX "machines_type_idx" ON "machines"("type");
CREATE INDEX "machines_isOutOfOrder_idx" ON "machines"("isOutOfOrder");
CREATE INDEX "machines_nextMaintenanceAt_idx" ON "machines"("nextMaintenanceAt");
CREATE INDEX "machines_lastMaintenanceAt_idx" ON "machines"("lastMaintenanceAt");
CREATE INDEX "machines_location_idx" ON "machines"("location");

-- Reservations table additional indexes
CREATE INDEX "reservations_startTime_idx" ON "reservations"("startTime");
CREATE INDEX "reservations_endTime_idx" ON "reservations"("endTime");
CREATE INDEX "reservations_createdAt_idx" ON "reservations"("createdAt");
CREATE INDEX "reservations_completedAt_idx" ON "reservations"("completedAt");
CREATE INDEX "reservations_cancelledAt_idx" ON "reservations"("cancelledAt");
CREATE INDEX "reservations_status_userId_idx" ON "reservations"("status", "userId");
CREATE INDEX "reservations_userId_status_startTime_idx" ON "reservations"("userId", "status", "startTime");
CREATE INDEX "reservations_machineId_status_idx" ON "reservations"("machineId", "status");
CREATE INDEX "reservations_startTime_endTime_idx" ON "reservations"("startTime", "endTime");

-- Queue entries table additional indexes
CREATE INDEX "queue_entries_machineType_status_idx" ON "queue_entries"("machineType", "status");
CREATE INDEX "queue_entries_preferredStartTime_idx" ON "queue_entries"("preferredStartTime");
CREATE INDEX "queue_entries_expiresAt_idx" ON "queue_entries"("expiresAt");
CREATE INDEX "queue_entries_notifiedAt_idx" ON "queue_entries"("notifiedAt");
CREATE INDEX "queue_entries_position_idx" ON "queue_entries"("position");
CREATE INDEX "queue_entries_status_position_idx" ON "queue_entries"("status", "position");
CREATE INDEX "queue_entries_machineType_position_idx" ON "queue_entries"("machineType", "position");
CREATE INDEX "queue_entries_userId_machineType_idx" ON "queue_entries"("userId", "machineType");

-- Sessions table additional indexes
CREATE INDEX "sessions_lastActivityAt_idx" ON "sessions"("lastActivityAt");
CREATE INDEX "sessions_isActive_expiresAt_idx" ON "sessions"("isActive", "expiresAt");
CREATE INDEX "sessions_userId_lastActivityAt_idx" ON "sessions"("userId", "lastActivityAt");
CREATE INDEX "sessions_createdAt_idx" ON "sessions"("createdAt");

-- Notifications table additional indexes
CREATE INDEX "notifications_createdAt_idx" ON "notifications"("createdAt");
CREATE INDEX "notifications_sentAt_idx" ON "notifications"("sentAt");
CREATE INDEX "notifications_deliveredAt_idx" ON "notifications"("deliveredAt");
CREATE INDEX "notifications_readAt_idx" ON "notifications"("readAt");
CREATE INDEX "notifications_attempts_idx" ON "notifications"("attempts");
CREATE INDEX "notifications_deliveryMethod_idx" ON "notifications"("deliveryMethod");
CREATE INDEX "notifications_status_createdAt_idx" ON "notifications"("status", "createdAt");
CREATE INDEX "notifications_userId_type_idx" ON "notifications"("userId", "type");
CREATE INDEX "notifications_reservationId_idx" ON "notifications"("reservationId");
CREATE INDEX "notifications_queueEntryId_idx" ON "notifications"("queueEntryId");
CREATE INDEX "notifications_type_deliveryMethod_idx" ON "notifications"("type", "deliveryMethod");

-- Composite indexes for complex queries
CREATE INDEX "reservations_machine_time_overlap_idx" ON "reservations"("machineId", "startTime", "endTime", "status");
CREATE INDEX "queue_entries_machine_wait_idx" ON "queue_entries"("machineId", "machineType", "status", "position");
CREATE INDEX "sessions_user_activity_idx" ON "sessions"("userId", "isActive", "lastActivityAt");
CREATE INDEX "notifications_delivery_retry_idx" ON "notifications"("status", "nextRetryAt", "attempts");
CREATE INDEX "machines_availability_idx" ON "machines"("type", "status", "isOutOfOrder", "location");

-- Full-text search preparation indexes (for future text search capabilities)
CREATE INDEX "users_names_idx" ON "users"("firstName", "lastName");
CREATE INDEX "machines_details_idx" ON "machines"("name", "location", "manufacturer");
CREATE INDEX "reservations_notes_idx" ON "reservations"("notes") WHERE "notes" IS NOT NULL;
CREATE INDEX "notifications_content_idx" ON "notifications"("title", "message");