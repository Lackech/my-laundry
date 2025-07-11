import { type ActionFunctionArgs, json } from "@remix-run/node";
import { createUser } from "~/lib/auth.server";
import { sendEmailVerification } from "~/lib/email.server";
import logger from "~/lib/logger";

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const body = await request.json();
    const {
      email,
      password,
      firstName,
      lastName,
      phoneNumber,
      apartmentNumber,
    } = body;

    // Basic validation
    if (!email || !password || !firstName || !lastName) {
      return json({ error: "Missing required fields" }, { status: 400 });
    }

    if (password.length < 8) {
      return json(
        { error: "Password must be at least 8 characters long" },
        { status: 400 }
      );
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return json({ error: "Invalid email format" }, { status: 400 });
    }

    // Create user
    const user = await createUser({
      email,
      password,
      firstName,
      lastName,
      phoneNumber,
      apartmentNumber,
    });

    // Send verification email
    try {
      await sendEmailVerification(
        user.email,
        user.firstName,
        user.emailVerificationToken!
      );
    } catch (emailError) {
      logger.error("Failed to send verification email", {
        userId: user.id,
        email: user.email,
        error:
          emailError instanceof Error ? emailError.message : "Unknown error",
      });
      // Don't fail the registration if email fails - user can request resend
    }

    logger.info("User registration successful", {
      userId: user.id,
      email: user.email,
    });

    return json({
      success: true,
      message:
        "Account created successfully. Please check your email to verify your account.",
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        emailVerified: user.emailVerified,
      },
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    logger.error("Registration failed", {
      error: errorMessage,
    });

    if (error instanceof Error && error.message.includes("already exists")) {
      return json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    return json(
      { error: "Registration failed. Please try again." },
      { status: 500 }
    );
  }
}
