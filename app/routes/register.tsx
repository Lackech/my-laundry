import {
  type LoaderFunctionArgs,
  type ActionFunctionArgs,
  json,
  redirect,
} from "@remix-run/node";
import { useActionData, useNavigation } from "@remix-run/react";
import { redirectIfAuthenticated } from "~/lib/auth.middleware";
import { RegisterForm } from "~/components/auth/RegisterForm";
import { MainLayout } from "~/components/layout/MainLayout";

export async function loader({ request }: LoaderFunctionArgs) {
  // Redirect if already authenticated
  await redirectIfAuthenticated(request);

  return json({ message: "Create your account" });
}

export async function action({ request }: ActionFunctionArgs) {
  try {
    const formData = await request.formData();
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;
    const firstName = formData.get("firstName") as string;
    const lastName = formData.get("lastName") as string;
    const phoneNumber = formData.get("phoneNumber") as string;
    const apartmentNumber = formData.get("apartmentNumber") as string;

    const fieldErrors: Record<string, string> = {};

    if (!firstName) {
      fieldErrors.firstName = "First name is required";
    }

    if (!lastName) {
      fieldErrors.lastName = "Last name is required";
    }

    if (!email) {
      fieldErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      fieldErrors.email = "Please enter a valid email address";
    }

    if (!password) {
      fieldErrors.password = "Password is required";
    } else if (password.length < 8) {
      fieldErrors.password = "Password must be at least 8 characters long";
    }

    if (!confirmPassword) {
      fieldErrors.confirmPassword = "Please confirm your password";
    } else if (password !== confirmPassword) {
      fieldErrors.confirmPassword = "Passwords do not match";
    }

    if (Object.keys(fieldErrors).length > 0) {
      return json({ fieldErrors }, { status: 400 });
    }

    // Call the register API
    const response = await fetch(new URL("/api/auth/register", request.url), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
        firstName,
        lastName,
        phoneNumber: phoneNumber || undefined,
        apartmentNumber: apartmentNumber || undefined,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      return json(
        { error: result.error || "Registration failed" },
        { status: response.status }
      );
    }

    // Redirect to verification page
    return redirect("/verify-email?email=" + encodeURIComponent(email));
  } catch (error) {
    return json(
      { error: "Registration failed. Please try again." },
      { status: 500 }
    );
  }
}

export default function Register() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <MainLayout>
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Create your account
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Join us to start managing your laundry schedule
            </p>
          </div>

          <RegisterForm
            loading={isSubmitting}
            error={actionData?.error}
            fieldErrors={actionData?.fieldErrors}
          />
        </div>
      </div>
    </MainLayout>
  );
}
