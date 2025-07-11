import { type ActionFunctionArgs, json } from "@remix-run/node";
import { refreshAccessToken } from "~/lib/auth.server";
import { createAuthCookie } from "~/lib/auth.middleware";
import logger from "~/lib/logger";

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const body = await request.json();
    const { refreshToken } = body;

    if (!refreshToken) {
      return json({ error: "Refresh token is required" }, { status: 400 });
    }

    // Refresh access token
    const tokenPair = await refreshAccessToken(refreshToken);

    logger.info("Token refresh successful");

    return json(
      {
        success: true,
        message: "Token refreshed successfully",
        tokens: tokenPair,
      },
      {
        headers: {
          "Set-Cookie": createAuthCookie(tokenPair.accessToken),
        },
      }
    );
  } catch (error) {
    logger.error("Token refresh failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return json({ error: "Invalid refresh token" }, { status: 401 });
  }
}
