import {
  type LoaderFunctionArgs,
  type ActionFunctionArgs,
  json,
  redirect,
} from "@remix-run/node";
import { useLoaderData, useActionData, useNavigation } from "@remix-run/react";
import { EmailVerificationForm } from "~/components/auth/EmailVerificationForm";
import { MainLayout } from "~/components/layout/MainLayout";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const email = url.searchParams.get("email");
  const token = url.searchParams.get("token");

  // If token is provided, verify immediately
  if (token) {
    try {
      const response = await fetch(
        new URL("/api/auth/verify-email", request.url),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token }),
        }
      );

      const result = await response.json();

      if (response.ok) {
        return redirect("/login?verified=true");
      } else {
        return json({
          error: result.error || "Verification failed",
          email: email || undefined,
        });
      }
    } catch (error) {
      return json({
        error: "Verification failed. Please try again.",
        email: email || undefined,
      });
    }
  }

  return json({
    email: email || undefined,
    message: "Please check your email for the verification link",
  });
}

export async function action({ request }: ActionFunctionArgs) {
  try {
    const formData = await request.formData();
    const action = formData.get("action") as string;

    if (action === "verify") {
      const token = formData.get("token") as string;

      const response = await fetch(
        new URL("/api/auth/verify-email", request.url),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token }),
        }
      );

      const result = await response.json();

      if (response.ok) {
        return redirect("/login?verified=true");
      } else {
        return json(
          { error: result.error || "Verification failed" },
          { status: response.status }
        );
      }
    } else if (action === "resend") {
      // TODO: Implement resend verification email
      return json({ success: "Verification email sent successfully" });
    }

    return json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return json(
      { error: "Request failed. Please try again." },
      { status: 500 }
    );
  }
}

export default function VerifyEmail() {
  const loaderData = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();

  const isSubmitting = navigation.state === "submitting";

  const handleVerify = async (token: string) => {
    const formData = new FormData();
    formData.append("action", "verify");
    formData.append("token", token);
    if (loaderData.email) formData.append("email", loaderData.email);

    const form = document.createElement("form");
    form.method = "post";
    form.style.display = "none";

    formData.forEach((value, key) => {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = key;
      input.value = value as string;
      form.appendChild(input);
    });

    document.body.appendChild(form);
    form.submit();
  };

  const handleResend = async () => {
    const formData = new FormData();
    formData.append("action", "resend");
    if (loaderData.email) formData.append("email", loaderData.email);

    const form = document.createElement("form");
    form.method = "post";
    form.style.display = "none";

    formData.forEach((value, key) => {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = key;
      input.value = value as string;
      form.appendChild(input);
    });

    document.body.appendChild(form);
    form.submit();
  };

  return (
    <MainLayout>
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Verify Your Email
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              We&apos;ve sent you a verification link
            </p>
          </div>

          <EmailVerificationForm
            onVerify={handleVerify}
            onResend={handleResend}
            loading={isSubmitting}
            error={loaderData.error || actionData?.error}
            success={actionData?.success}
            userEmail={loaderData.email}
          />
        </div>
      </div>
    </MainLayout>
  );
}
