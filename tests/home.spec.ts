import { test, expect } from "@playwright/test";

test.describe("Home Page", () => {
  test("should display home page", async ({ page }) => {
    await page.goto("/");

    // Check that the page loads
    await expect(page).toHaveTitle(/My Laundry/);

    // Check header is visible
    await expect(page.locator("header")).toBeVisible();

    // Check navigation links
    await expect(page.locator("text=Home")).toBeVisible();
    await expect(page.locator("text=Sign In")).toBeVisible();
    await expect(page.locator("text=Sign Up")).toBeVisible();
  });

  test("should navigate to login page", async ({ page }) => {
    await page.goto("/");

    await page.click("text=Sign In");
    await expect(page).toHaveURL("/login");
  });

  test("should navigate to register page", async ({ page }) => {
    await page.goto("/");

    await page.click("text=Sign Up");
    await expect(page).toHaveURL("/register");
  });

  test("should have accessible navigation", async ({ page }) => {
    await page.goto("/");

    // Check that navigation is keyboard accessible
    await page.keyboard.press("Tab");
    await expect(page.locator("a:focus")).toBeVisible();
  });
});
