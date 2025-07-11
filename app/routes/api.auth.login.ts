import { type ActionFunctionArgs, json } from "@remix-run/node";
import { authenticateUser, createSession } from "~/lib/auth.server";
import {
  createAuthCookie,
  getClientIP,
  getUserAgent,
} from "~/lib/auth.middleware";
import logger from "~/lib/logger";

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const body = await request.json();
    const { email, password } = body;

    // Basic validation
    if (!email || !password) {
      return json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Authenticate user
    const user = await authenticateUser(email, password);

    // Get client info
    const userAgent = getUserAgent(request);
    const ipAddress = getClientIP(request);

    // Create session
    const { tokenPair } = await createSession(user, userAgent, ipAddress);

    logger.info("User login successful", {
      userId: user.id,
      email: user.email,
      ipAddress,
      userAgent,
    });

    return json(
      {
        success: true,
        message: "Login successful",
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          emailVerified: user.emailVerified,
          phoneNumber: user.phoneNumber,
          apartmentNumber: user.apartmentNumber,
        },
        tokens: tokenPair,
      },
      {
        headers: {
          "Set-Cookie": createAuthCookie(tokenPair.accessToken),
        },
      }
    );
  } catch (error) {
    logger.error("Login failed", {
      error: error instanceof Error ? error.message : "Unknown error",
      ipAddress: getClientIP(request),
      userAgent: getUserAgent(request),
    });

    return json({ error: "Invalid credentials" }, { status: 401 });
  }
}
