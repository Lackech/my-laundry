// Re-export Prisma types for convenience
import type {
  User,
  Machine,
  Reservation,
  QueueEntry,
  Session,
  Notification,
  Prisma,
  MachineType,
  MachineStatus,
  ReservationStatus,
  QueueStatus,
  LoginMethod,
  NotificationType,
  NotificationStatus,
  DeliveryMethod,
  NotificationPreferences,
} from "../../generated/prisma";

export type {
  User,
  Machine,
  Reservation,
  QueueEntry,
  Session,
  Notification,
  Prisma,
  MachineType,
  MachineStatus,
  ReservationStatus,
  QueueStatus,
  LoginMethod,
  NotificationType,
  NotificationStatus,
  DeliveryMethod,
  NotificationPreferences,
};

// Custom types for application logic
export interface ReservationWithUser extends Reservation {
  user: User;
  machine: Machine;
}

export interface QueueEntryWithUser extends QueueEntry {
  user: User;
  machine?: Machine;
}

export interface NotificationWithRelations extends Notification {
  user: User;
  reservation?: Reservation;
  queueEntry?: QueueEntry;
}

// Frontend-specific types
export interface DashboardData {
  user: User;
  activeReservations: ReservationWithUser[];
  upcomingReservations: ReservationWithUser[];
  queuePosition?: QueueEntryWithUser;
  availableMachines: Machine[];
  recentNotifications: NotificationWithRelations[];
}

export interface MachineSchedule {
  machine: Machine;
  reservations: ReservationWithUser[];
  isAvailable: boolean;
  nextAvailableTime?: Date;
}

export interface ReservationConflict {
  conflictingReservation: Reservation;
  message: string;
}

// Form validation types
export interface CreateReservationForm {
  machineId: string;
  startTime: string;
  endTime: string;
  notes?: string;
}

export interface JoinQueueForm {
  machineId?: string;
  machineType?: MachineType;
  preferredStartTime?: string;
  notifyWhenAvailable: boolean;
}

export interface UpdateUserForm {
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  apartmentNumber?: string;
  notificationPreferences: NotificationPreferences;
  timezone: string;
}

// API response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Legacy types (keeping for backward compatibility)
export interface LaundryItem {
  id: string;
  name: string;
  category: "clothing" | "bedding" | "towels" | "other";
  washDate: string;
  dryDate?: string;
  foldDate?: string;
  status: "dirty" | "washing" | "drying" | "folding" | "clean";
  priority: "low" | "medium" | "high";
  notes?: string;
}

export interface LaundrySchedule {
  id: string;
  date: string;
  items: LaundryItem[];
  isCompleted: boolean;
}
