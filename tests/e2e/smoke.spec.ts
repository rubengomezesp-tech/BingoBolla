import { expect, test } from "@playwright/test";

const protectedRoutes = ["/lobby", "/mundos", "/account"] as const;
const e2eEmail = process.env.E2E_USER_EMAIL;
const e2ePassword = process.env.E2E_USER_PASSWORD;

test.describe("BingoBolla P1 smoke", () => {
  test("root document exposes Spanish metadata", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator("html")).toHaveAttribute("lang", "es");
    await expect(page).toHaveTitle(/BingoBolla/);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /Bingo social/);
  });

  test("login renders the current email/password auth form", async ({ page }) => {
    await page.goto("/login");

    await expect(page.getByRole("link", { name: /bingobolla/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Entrar$/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Crear cuenta$/ })).toBeVisible();
    await expect(page.getByLabel(/^Email$/)).toBeVisible();
    await expect(page.getByLabel(/^Contraseña$/)).toBeVisible();
    await expect(page.getByRole("button", { name: /entrar a jugar/i })).toBeVisible();
  });

  for (const route of protectedRoutes) {
    test(`${route} redirects signed-out users to login`, async ({ page }) => {
      await page.goto(route);

      await expect(page).toHaveURL(/\/login$/);
      await expect(page.getByRole("button", { name: /entrar a jugar/i })).toBeVisible();
    });
  }

  test("legacy responsible-gaming aliases redirect to canonical account routes", async ({ request }) => {
    const limits = await request.get("/limites", { maxRedirects: 0 });
    const exclusion = await request.get("/auto-exclusion", { maxRedirects: 0 });

    expect([307, 308]).toContain(limits.status());
    expect(limits.headers().location).toBe("/account/limits");
    expect([307, 308]).toContain(exclusion.status());
    expect(exclusion.headers().location).toBe("/account/exclude");
  });

  test("public app shell assets stay available", async ({ request }) => {
    const manifest = await request.get("/manifest.webmanifest");
    const serviceWorker = await request.get("/sw.js");

    await expect(manifest).toBeOK();
    await expect(serviceWorker).toBeOK();
    expect(manifest.headers()["content-type"]).toContain("application/manifest+json");
    expect(serviceWorker.headers()["content-type"]).toContain("application/javascript");
  });

  test("optional authenticated user can reach lobby, worlds, and account", async ({ page }) => {
    test.skip(!e2eEmail || !e2ePassword, "Set E2E_USER_EMAIL and E2E_USER_PASSWORD to run the authenticated smoke.");

    await page.goto("/login");
    await page.getByLabel(/^Email$/).fill(e2eEmail ?? "");
    await page.getByLabel(/^Contraseña$/).fill(e2ePassword ?? "");
    await page.getByRole("button", { name: /entrar a jugar/i }).click();

    await page.waitForURL(/\/(lobby|onboarding)(?:$|\?)/);
    test.skip(page.url().includes("/onboarding"), "Authenticated user is valid but still needs onboarding.");

    await page.goto("/lobby");
    await expect(page).not.toHaveURL(/\/login$/);
    await expect(page.locator("body")).not.toContainText(/entrar a jugar/i);

    await page.goto("/mundos");
    await expect(page).not.toHaveURL(/\/login$/);
    await expect(page.locator("body")).not.toContainText(/entrar a jugar/i);

    await page.goto("/account");
    await expect(page).not.toHaveURL(/\/login$/);
    await expect(page.getByRole("heading", { name: /mi cuenta/i })).toBeVisible();
  });
});
