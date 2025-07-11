import React, { useState } from "react";
import { Button } from "~/components/ui/button";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Card, CardHeader, CardTitle, CardContent } from "~/components/ui/card";

interface EmailVerificationFormProps {
  onVerify: (token: string) => Promise<void>;
  onResend: () => Promise<void>;
  loading?: boolean;
  error?: string;
  success?: string;
  userEmail?: string;
}

export function EmailVerificationForm({
  onVerify,
  onResend,
  loading = false,
  error,
  success,
  userEmail,
}: EmailVerificationFormProps) {
  const [resendLoading, setResendLoading] = useState(false);

  const handleResend = async () => {
    setResendLoading(true);
    try {
      await onResend();
    } finally {
      setResendLoading(false);
    }
  };

  // Auto-verify if token is in URL
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get("token");
    if (token && !loading) {
      onVerify(token);
    }
  }, [onVerify, loading]);

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-center text-2xl">
          Verify Your Email
        </CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert variant="success" className="mb-6">
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4 text-center">
          <div className="space-y-2">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
              <svg
                className="h-8 w-8 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium">Check your email</h3>
          </div>

          <div className="space-y-2 text-sm text-gray-600">
            <p>We&apos;ve sent a verification link to:</p>
            <p className="font-medium text-gray-900">
              {userEmail || "your email address"}
            </p>
            <p>
              Click the link in the email to verify your account. If you
              don&apos;t see the email, check your spam folder.
            </p>
          </div>

          <div className="space-y-3 pt-4">
            <Button
              onClick={handleResend}
              variant="outline"
              className="w-full"
              disabled={resendLoading}
            >
              {resendLoading ? "Sending..." : "Resend Verification Email"}
            </Button>

            <p className="text-xs text-gray-500">
              Having trouble? Contact support for help.
            </p>
          </div>
        </div>

        <div className="mt-8 text-center text-sm">
          <p className="text-gray-600">
            Remember your credentials?{" "}
            <a
              href="/login"
              className="font-medium text-blue-600 hover:text-blue-700"
            >
              Sign in
            </a>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
