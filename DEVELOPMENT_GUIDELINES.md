# Development Guidelines

This document outlines the development patterns and preferences for the Laundry Calendar application
to maintain consistency and avoid common issues.

## 🎯 Core Principles

1. **Follow Remix conventions** - Use native Remix patterns whenever possible
2. **Keep it simple** - Avoid over-engineering solutions
3. **TypeScript safety** - Maintain type safety throughout the codebase
4. **Mobile-first** - Always design with mobile users in mind

## 📝 Form Handling

### ✅ Preferred: Native Remix Forms

**Always use native Remix Form components with `method="post"` for form submissions.**

```typescript
// ✅ CORRECT - Use native Remix Form
import { Form } from "@remix-run/react";

export function LoginForm({ loading, error }: LoginFormProps) {
  return (
    <Form method="post" className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required disabled={loading} />
      </div>
      <Button type="submit" disabled={loading}>
        {loading ? "Signing in..." : "Sign In"}
      </Button>
    </Form>
  );
}
```

### ❌ Avoid: Complex React State Management

**Don't use complex React state management for form submissions.**

```typescript
// ❌ INCORRECT - Avoid complex state management
const [formData, setFormData] = useState({});
const [errors, setErrors] = useState({});

const handleSubmit = async e => {
  e.preventDefault();
  // Complex validation and submission logic
  await onSubmit(formData);
};
```

### Why Native Remix Forms?

1. **Simpler code** - Less boilerplate and state management
2. **Better UX** - Works without JavaScript (progressive enhancement)
3. **Fewer bugs** - Reduces client-side complexity and potential errors
4. **Remix optimized** - Integrates seamlessly with Remix's data flow
5. **Form validation** - Use HTML5 validation + server-side validation

### Form Validation Pattern

```typescript
// Route action for server-side validation
export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  // Server-side validation
  if (!email || !password) {
    return json({ error: "Email and password are required" }, { status: 400 });
  }

  // Process form...
}

// Component for client-side integration
export default function LoginRoute() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return <LoginForm loading={isSubmitting} error={actionData?.error} />;
}
```

## 📦 Import Patterns

### ✅ Correct Import Patterns

```typescript
// Default exports
import logger from "~/lib/logger";
import { db } from "~/lib/db.server";

// Named exports
import { Button } from "~/components/ui/button";
import { createUser } from "~/lib/auth.server";

// Remix imports
import { Form, Link, useNavigation, useActionData } from "@remix-run/react";
import { json, redirect, type ActionFunctionArgs } from "@remix-run/node";
```

### ❌ Common Import Mistakes

```typescript
// ❌ INCORRECT - Logger is default export, not named export
import { logger } from "~/lib/logger";

// ❌ INCORRECT - Missing proper type imports
import { ActionFunctionArgs } from "@remix-run/node";
```

## 🎨 UI Component Usage

### ✅ Preferred: shadcn/ui Components

Use shadcn/ui components for consistent design:

```typescript
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "~/components/ui/card";
import { Alert, AlertDescription } from "~/components/ui/alert";
```

### Navigation Pattern

```typescript
// ✅ CORRECT - Use Link for navigation, Button with asChild for styled links
<Button variant="outline" size="sm" asChild>
  <Link to="/login">Sign In</Link>
</Button>

// ❌ INCORRECT - Plain button with onClick handler
<Button onClick={() => navigate('/login')}>Sign In</Button>
```

## 🔐 Authentication Patterns

### Route Protection

```typescript
// Protected route pattern
export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireAuth(request); // Redirects if not authenticated
  return json({ user });
}

// Optional authentication
export async function loader({ request }: LoaderFunctionArgs) {
  const user = await getOptionalUser(request); // Returns null if not authenticated
  return json({ user });
}
```

### API Route Pattern

```typescript
export async function action({ request }: ActionFunctionArgs) {
  // 1. Method validation
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    // 2. Parse and validate input
    const formData = await request.formData();
    const email = formData.get("email") as string;

    if (!email) {
      return json({ error: "Email is required" }, { status: 400 });
    }

    // 3. Business logic
    const result = await someBusinessLogic(email);

    // 4. Success response
    return json({ success: true, data: result });
  } catch (error) {
    // 5. Error handling
    logger.error("Operation failed", { error: error.message });
    return json({ error: "Operation failed" }, { status: 500 });
  }
}
```

## 📱 Mobile-First Design

### Responsive Patterns

```typescript
// ✅ CORRECT - Mobile-first responsive classes
<div className="flex flex-col gap-4 md:flex-row md:gap-6">
  <Button className="w-full sm:w-auto">Action</Button>
</div>

// Navigation for mobile
<div className="flex items-center gap-2 md:gap-4">
  <span className="font-bold sm:hidden">ML</span>
  <span className="hidden font-bold sm:inline-block">My Laundry</span>
</div>
```

### Touch Targets

- Minimum button size: 44px for touch devices
- Use `size="sm"` for desktop, larger sizes for mobile
- Ensure adequate spacing between interactive elements

## 🚫 Common Anti-Patterns to Avoid

### 1. Over-Complex Form State

```typescript
// ❌ AVOID - Complex client-side form state
const [formData, setFormData] = useState({});
const [errors, setErrors] = useState({});
const [loading, setLoading] = useState(false);
```

### 2. Manual Form Submission

```typescript
// ❌ AVOID - Manual form DOM manipulation
const form = document.createElement("form");
form.submit();
```

### 3. Incorrect Import Patterns

```typescript
// ❌ AVOID - Wrong import types
import { logger } from "~/lib/logger"; // Should be default import
import { Form, FormItem } from "~/components/ui/form"; // Custom components, use native Remix Form
```

### 4. Client-Side Navigation

```typescript
// ❌ AVOID - Client-side navigation
const navigate = useNavigate();
onClick={() => navigate('/path')}

// ✅ PREFER - Link-based navigation
<Link to="/path">Navigate</Link>
```

## 🔧 Development Workflow

### Before Creating New Components

1. **Check existing patterns** - Look at similar components first
2. **Use native Remix** - Prefer Remix patterns over custom solutions
3. **Mobile-first** - Design for mobile, enhance for desktop
4. **Type safety** - Ensure proper TypeScript types
5. **Test locally** - Verify forms work without JavaScript

### Code Review Checklist

- [ ] Uses native Remix Form components
- [ ] Proper import patterns (default vs named exports)
- [ ] Mobile-responsive design
- [ ] TypeScript types are correct
- [ ] Error handling is implemented
- [ ] Follows existing code patterns

## 📚 Resources

- [Remix Documentation](https://remix.run/docs)
- [shadcn/ui Components](https://ui.shadcn.com/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

---

**Remember: When in doubt, choose the simpler, more native solution. Remix is designed to work with
web standards, not against them.**
