import { Form, Link } from "@remix-run/react";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Card, CardHeader, CardTitle, CardContent } from "~/components/ui/card";
import { Label } from "~/components/ui/label";

interface RegisterFormProps {
  loading?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

export function RegisterForm({ loading = false, error, fieldErrors }: RegisterFormProps) {
  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-center text-2xl">Create Account</CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Form method="post" className="space-y-4" noValidate>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                name="firstName"
                type="text"
                placeholder="John"
                disabled={loading}
              />
              {fieldErrors?.firstName && (
                <p className="text-sm text-red-600">{fieldErrors.firstName}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                name="lastName"
                type="text"
                placeholder="Doe"
                disabled={loading}
              />
              {fieldErrors?.lastName && (
                <p className="text-sm text-red-600">{fieldErrors.lastName}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="john@example.com"
              disabled={loading}
            />
            {fieldErrors?.email && (
              <p className="text-sm text-red-600">{fieldErrors.email}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="Create a password"
              disabled={loading}
            />
            {fieldErrors?.password && (
              <p className="text-sm text-red-600">{fieldErrors.password}</p>
            )}
            <p className="text-sm text-gray-500">
              Password must be at least 8 characters long
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              placeholder="Confirm your password"
              disabled={loading}
            />
            {fieldErrors?.confirmPassword && (
              <p className="text-sm text-red-600">{fieldErrors.confirmPassword}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Phone Number</Label>
              <Input
                id="phoneNumber"
                name="phoneNumber"
                type="tel"
                placeholder="(555) 123-4567"
                disabled={loading}
              />
              <p className="text-sm text-gray-500">Optional</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="apartmentNumber">Apartment</Label>
              <Input
                id="apartmentNumber"
                name="apartmentNumber"
                type="text"
                placeholder="101"
                disabled={loading}
              />
              <p className="text-sm text-gray-500">Optional</p>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating Account..." : "Create Account"}
          </Button>
        </Form>

        <div className="mt-6 text-center text-sm">
          <p className="text-gray-600">
            Already have an account?{" "}
            <Link
              to="/login"
              className="font-medium text-blue-600 hover:text-blue-700"
            >
              Sign in
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
