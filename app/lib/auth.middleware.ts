import { redirect } from "@remix-run/node";
import { getUserFromSession } from "./auth.server";
import logger from "./logger";

/**
 * Extract token from Authorization header or cookie
 */
function extractToken(request: Request): string | null {
  // Try Authorization header first
  const authHeader = request.headers.get("Authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }

  // Try cookie
  const cookie = request.headers.get("Cookie");
  if (cookie) {
    const match = cookie.match(/(?:^|;)\s*auth_token=([^;]+)/);
    if (match) {
      return match[1];
    }
  }

  return null;
}

/**
 * Require authentication - redirect to login if not authenticated
 */
export async function requireAuth(request: Request) {
  const token = extractToken(request);

  if (!token) {
    logger.warn("Authentication required but no token provided", {
      url: request.url,
      userAgent: request.headers.get("User-Agent"),
    });
    throw redirect("/login");
  }

  const user = await getUserFromSession(token);
  if (!user) {
    logger.warn("Authentication required but invalid token", {
      url: request.url,
      userAgent: request.headers.get("User-Agent"),
    });
    throw redirect("/login");
  }

  return user;
}

/**
 * Require email verification - redirect to verification page if not verified
 */
export async function requireEmailVerification(request: Request) {
  const user = await requireAuth(request);

  if (!user.emailVerified) {
    logger.warn("Email verification required", {
      userId: user.id,
      email: user.email,
      url: request.url,
    });
    throw redirect("/verify-email");
  }

  return user;
}

/**
 * Get optional user (don't redirect if not authenticated)
 */
export async function getOptionalUser(request: Request) {
  const token = extractToken(request);

  if (!token) {
    return null;
  }

  const user = await getUserFromSession(token);
  return user;
}

/**
 * Redirect if already authenticated
 */
export async function redirectIfAuthenticated(
  request: Request,
  redirectTo: string = "/dashboard"
) {
  const user = await getOptionalUser(request);

  if (user && user.emailVerified) {
    logger.info("User already authenticated, redirecting", {
      userId: user.id,
      redirectTo,
    });
    throw redirect(redirectTo);
  }

  return user;
}

/**
 * Create authentication cookie
 */
export function createAuthCookie(
  token: string,
  maxAge: number = 60 * 60 * 24 * 7
) {
  return `auth_token=${token}; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}; Path=/`;
}

/**
 * Clear authentication cookie
 */
export function clearAuthCookie() {
  return `auth_token=; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Path=/`;
}

/**
 * Get client IP address
 */
export function getClientIP(request: Request): string {
  const forwardedFor = request.headers.get("X-Forwarded-For");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  const realIP = request.headers.get("X-Real-IP");
  if (realIP) {
    return realIP;
  }

  return "unknown";
}

/**
 * Get user agent
 */
export function getUserAgent(request: Request): string {
  return request.headers.get("User-Agent") || "unknown";
}
