import { type LoaderFunctionArgs, redirect } from "@remix-run/node";
import { clearAuthCookie } from "~/lib/auth.middleware";

export async function loader({ request }: LoaderFunctionArgs) {
  // Extract token from Authorization header or cookie
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.substring(7)
    : null;

  let finalToken = token;
  if (!finalToken) {
    const cookie = request.headers.get("Cookie");
    const cookieMatch = cookie?.match(/(?:^|;)\s*auth_token=([^;]+)/);
    if (cookieMatch) {
      finalToken = cookieMatch[1];
    }
  }

  if (finalToken) {
    // Call the logout API
    try {
      await fetch(new URL("/api/auth/logout", request.url), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${finalToken}`,
          "Content-Type": "application/json",
        },
      });
    } catch (error) {
      // Even if logout API fails, clear the cookie
      console.error("Logout API failed:", error);
    }
  }

  // Clear the auth cookie and redirect to home
  return redirect("/", {
    headers: {
      "Set-Cookie": clearAuthCookie(),
    },
  });
}
