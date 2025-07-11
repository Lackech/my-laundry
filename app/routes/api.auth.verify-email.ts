import { type ActionFunctionArgs, json } from "@remix-run/node";
import { verifyEmail } from "~/lib/auth.server";
import logger from "~/lib/logger";

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return json({ error: "Verification token is required" }, { status: 400 });
    }

    // Verify email
    const user = await verifyEmail(token);

    logger.info("Email verification successful", {
      userId: user.id,
      email: user.email,
    });

    return json({
      success: true,
      message: "Email verified successfully",
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        emailVerified: user.emailVerified,
      },
    });
  } catch (error) {
    logger.error("Email verification failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    if (
      error instanceof Error &&
      error.message.includes("Invalid verification token")
    ) {
      return json(
        { error: "Invalid or expired verification token" },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message.includes("already verified")) {
      return json({ error: "Email is already verified" }, { status: 400 });
    }

    return json({ error: "Email verification failed" }, { status: 500 });
  }
}
