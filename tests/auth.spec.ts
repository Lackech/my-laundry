import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test.beforeEach(async ({ page }) => {
    // Go to the starting url before each test
    await page.goto("/");
  });

  test("should display login page", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("h2")).toContainText("Welcome back");
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test("should display register page", async ({ page }) => {
    await page.goto("/register");
    await expect(page.locator("h2")).toContainText("Create your account");
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('input[name="firstName"]')).toBeVisible();
    await expect(page.locator('input[name="lastName"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test("should show validation errors on login form", async ({ page }) => {
    await page.goto("/login");

    // Try to submit empty form
    await page.click('button[type="submit"]');

    // Check for validation errors
    await expect(page.locator("text=Email is required")).toBeVisible();
    await expect(page.locator("text=Password is required")).toBeVisible();
  });

  test("should show validation errors on register form", async ({ page }) => {
    await page.goto("/register");

    // Try to submit empty form
    await page.click('button[type="submit"]');

    // Check for validation errors
    await expect(page.locator("text=Email is required")).toBeVisible();
    await expect(page.locator("text=Password is required")).toBeVisible();
    await expect(page.locator("text=First name is required")).toBeVisible();
    await expect(page.locator("text=Last name is required")).toBeVisible();
  });

  test("should validate email format", async ({ page }) => {
    await page.goto("/login");

    await page.fill('input[type="email"]', "invalid-email");
    await page.click('button[type="submit"]');

    await expect(
      page.locator("text=Please enter a valid email address")
    ).toBeVisible();
  });

  test("should validate password length on register", async ({ page }) => {
    await page.goto("/register");

    await page.fill('input[name="firstName"]', "Test");
    await page.fill('input[name="lastName"]', "User");
    await page.fill('input[name="email"]', "test@example.com");
    await page.fill('input[name="password"]', "1234567"); // 7 characters
    await page.fill('input[name="confirmPassword"]', "1234567");

    await page.click('button[type="submit"]');

    await expect(
      page.locator("text=Password must be at least 8 characters long")
    ).toBeVisible();
  });

  test("should validate password confirmation", async ({ page }) => {
    await page.goto("/register");

    await page.fill('input[name="firstName"]', "Test");
    await page.fill('input[name="lastName"]', "User");
    await page.fill('input[name="email"]', "test@example.com");
    await page.fill('input[name="password"]', "password123");
    await page.fill('input[name="confirmPassword"]', "password456");

    await page.click('button[type="submit"]');

    await expect(page.locator("text=Passwords do not match")).toBeVisible();
  });

  test("should navigate between login and register pages", async ({ page }) => {
    await page.goto("/login");

    // Click sign up link
    await page.click("text=Sign up");
    await expect(page).toHaveURL("/register");

    // Click sign in link
    await page.click("text=Sign in");
    await expect(page).toHaveURL("/login");
  });
});
