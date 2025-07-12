import {
  type LoaderFunctionArgs,
  type ActionFunctionArgs,
  json,
  redirect,
} from "@remix-run/node";
import { useActionData, useNavigation } from "@remix-run/react";
import { redirectIfAuthenticated } from "~/lib/auth.middleware";
import { LoginForm } from "~/components/auth/LoginForm";
import { MainLayout } from "~/components/layout/MainLayout";

export async function loader({ request }: LoaderFunctionArgs) {
  // Redirect if already authenticated
  await redirectIfAuthenticated(request);

  return json({ message: "Please sign in to continue" });
}

export async function action({ request }: ActionFunctionArgs) {
  try {
    const formData = await request.formData();
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const fieldErrors: Record<string, string> = {};

    if (!email) {
      fieldErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      fieldErrors.email = "Please enter a valid email address";
    }

    if (!password) {
      fieldErrors.password = "Password is required";
    }

    if (Object.keys(fieldErrors).length > 0) {
      return json({ fieldErrors }, { status: 400 });
    }

    // Call the login API
    const response = await fetch(new URL("/api/auth/login", request.url), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const result = await response.json();

    if (!response.ok) {
      return json(
        { error: result.error || "Login failed" },
        { status: response.status }
      );
    }

    // Set the auth cookie and redirect
    const headers = new Headers();
    if (response.headers.get("Set-Cookie")) {
      headers.set("Set-Cookie", response.headers.get("Set-Cookie")!);
    }

    // Redirect to dashboard if email is verified, otherwise to verification page
    const redirectTo = result.user.emailVerified
      ? "/dashboard"
      : "/verify-email";

    return redirect(redirectTo, { headers });
  } catch (error) {
    return json({ error: "Login failed. Please try again." }, { status: 500 });
  }
}

export default function Login() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <MainLayout>
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Welcome back
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Sign in to manage your laundry schedule
            </p>
          </div>

          <LoginForm 
            loading={isSubmitting} 
            error={actionData?.error} 
            fieldErrors={actionData?.fieldErrors}
          />
        </div>
      </div>
    </MainLayout>
  );
}
