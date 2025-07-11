import { type ActionFunctionArgs, json } from "@remix-run/node";
import { logoutUser } from "~/lib/auth.server";
import { clearAuthCookie } from "~/lib/auth.middleware";
import logger from "~/lib/logger";

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    // Extract token from Authorization header or cookie
    const authHeader = request.headers.get("Authorization");
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.substring(7)
      : null;

    if (!token) {
      const cookie = request.headers.get("Cookie");
      const cookieMatch = cookie?.match(/(?:^|;)\s*auth_token=([^;]+)/);
      if (!cookieMatch) {
        return json(
          { error: "No authentication token found" },
          { status: 401 }
        );
      }
    }

    const finalToken =
      token || cookie?.match(/(?:^|;)\s*auth_token=([^;]+)/)?.[1];

    if (finalToken) {
      await logoutUser(finalToken);
    }

    logger.info("User logout successful");

    return json(
      {
        success: true,
        message: "Logout successful",
      },
      {
        headers: {
          "Set-Cookie": clearAuthCookie(),
        },
      }
    );
  } catch (error) {
    logger.error("Logout failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return json({ error: "Logout failed" }, { status: 500 });
  }
}
