import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomBytes } from "crypto";
import { db } from "./db.server";
import logger from "./logger";

// Environment variables for JWT
const JWT_SECRET =
  process.env.JWT_SECRET || "your-secret-key-change-in-production";
const JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET ||
  "your-refresh-secret-key-change-in-production";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "15m";
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || "7d";

export interface UserPayload {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  emailVerified: boolean;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return bcryptjs.hash(password, saltRounds);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcryptjs.compare(password, hash);
}

/**
 * Generate a secure random token for email verification
 */
export function generateVerificationToken(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Generate JWT token pair (access + refresh)
 */
export function generateTokenPair(user: UserPayload): TokenPair {
  const accessToken = jwt.sign(
    {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      emailVerified: user.emailVerified,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  const refreshToken = jwt.sign(
    { id: user.id, type: "refresh" },
    JWT_REFRESH_SECRET,
    { expiresIn: JWT_REFRESH_EXPIRES_IN }
  );

  return { accessToken, refreshToken };
}

/**
 * Verify and decode JWT access token
 */
export function verifyAccessToken(token: string): UserPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as UserPayload;
    return decoded;
  } catch (error) {
    logger.warn("Invalid access token", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return null;
  }
}

/**
 * Verify and decode JWT refresh token
 */
export function verifyRefreshToken(
  token: string
): { id: string; type: string } | null {
  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET) as {
      id: string;
      type: string;
    };
    return decoded;
  } catch (error) {
    logger.warn("Invalid refresh token", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return null;
  }
}

/**
 * Create a new user account
 */
export async function createUser(userData: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  apartmentNumber?: string;
}) {
  try {
    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email: userData.email },
    });

    if (existingUser) {
      throw new Error("User with this email already exists");
    }

    // Hash password and generate verification token
    const passwordHash = await hashPassword(userData.password);
    const emailVerificationToken = generateVerificationToken();

    // Create user
    const user = await db.user.create({
      data: {
        email: userData.email,
        passwordHash,
        firstName: userData.firstName,
        lastName: userData.lastName,
        phoneNumber: userData.phoneNumber,
        apartmentNumber: userData.apartmentNumber,
        emailVerificationToken,
        emailVerified: false,
      },
    });

    logger.info("User created successfully", {
      userId: user.id,
      email: user.email,
    });
    return user;
  } catch (error) {
    logger.error("Failed to create user", {
      error: error instanceof Error ? error.message : "Unknown error",
      email: userData.email,
    });
    throw error;
  }
}

/**
 * Authenticate user with email and password
 */
export async function authenticateUser(email: string, password: string) {
  try {
    // Find user by email
    const user = await db.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new Error("Invalid credentials");
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      throw new Error("Invalid credentials");
    }

    // Update last login
    await db.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    logger.info("User authenticated successfully", {
      userId: user.id,
      email: user.email,
    });
    return user;
  } catch (error) {
    logger.error("Failed to authenticate user", {
      error: error instanceof Error ? error.message : "Unknown error",
      email,
    });
    throw error;
  }
}

/**
 * Verify email with verification token
 */
export async function verifyEmail(token: string) {
  try {
    const user = await db.user.findFirst({
      where: { emailVerificationToken: token },
    });

    if (!user) {
      throw new Error("Invalid verification token");
    }

    if (user.emailVerified) {
      throw new Error("Email already verified");
    }

    // Mark email as verified
    await db.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerificationToken: null,
      },
    });

    logger.info("Email verified successfully", {
      userId: user.id,
      email: user.email,
    });
    return user;
  } catch (error) {
    logger.error("Failed to verify email", {
      error: error instanceof Error ? error.message : "Unknown error",
      token,
    });
    throw error;
  }
}

/**
 * Create user session
 */
export async function createSession(
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    emailVerified: boolean;
  },
  userAgent?: string,
  ipAddress?: string
) {
  try {
    // Generate token pair
    const tokenPair = generateTokenPair(user);

    // Calculate expiration dates
    const refreshTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Create session record
    const session = await db.session.create({
      data: {
        userId: user.id,
        token: tokenPair.accessToken,
        refreshToken: tokenPair.refreshToken,
        userAgent,
        ipAddress,
        expiresAt: refreshTokenExpiry, // Session expires when refresh token expires
        lastActivityAt: new Date(),
      },
    });

    logger.info("Session created successfully", {
      userId: user.id,
      sessionId: session.id,
      userAgent,
      ipAddress,
    });

    return { session, tokenPair };
  } catch (error) {
    logger.error("Failed to create session", {
      error: error instanceof Error ? error.message : "Unknown error",
      userId: user.id,
    });
    throw error;
  }
}

/**
 * Get user from session token
 */
export async function getUserFromSession(token: string) {
  try {
    // Verify token
    const decoded = verifyAccessToken(token);
    if (!decoded) {
      return null;
    }

    // Get user from database
    const user = await db.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        emailVerified: true,
        phoneNumber: true,
        apartmentNumber: true,
        notificationPreferences: true,
        timezone: true,
        preferredLanguage: true,
        createdAt: true,
        lastLoginAt: true,
      },
    });

    if (!user) {
      return null;
    }

    // Update session activity
    await db.session.updateMany({
      where: {
        userId: user.id,
        token,
        isActive: true,
      },
      data: { lastActivityAt: new Date() },
    });

    return user;
  } catch (error) {
    logger.error("Failed to get user from session", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return null;
  }
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(refreshToken: string) {
  try {
    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded || decoded.type !== "refresh") {
      throw new Error("Invalid refresh token");
    }

    // Get user
    const user = await db.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        emailVerified: true,
      },
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Generate new token pair
    const tokenPair = generateTokenPair(user);

    // Update session with new tokens
    await db.session.updateMany({
      where: {
        userId: user.id,
        refreshToken,
        isActive: true,
      },
      data: {
        token: tokenPair.accessToken,
        refreshToken: tokenPair.refreshToken,
        lastActivityAt: new Date(),
      },
    });

    logger.info("Access token refreshed successfully", { userId: user.id });
    return tokenPair;
  } catch (error) {
    logger.error("Failed to refresh access token", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}

/**
 * Logout user by invalidating session
 */
export async function logoutUser(token: string) {
  try {
    // Invalidate session
    await db.session.updateMany({
      where: { token },
      data: { isActive: false },
    });

    logger.info("User logged out successfully");
  } catch (error) {
    logger.error("Failed to logout user", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}

/**
 * Clean up expired sessions
 */
export async function cleanupExpiredSessions() {
  try {
    const result = await db.session.deleteMany({
      where: {
        OR: [{ expiresAt: { lt: new Date() } }, { isActive: false }],
      },
    });

    logger.info("Expired sessions cleaned up", { deletedCount: result.count });
    return result.count;
  } catch (error) {
    logger.error("Failed to cleanup expired sessions", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}
