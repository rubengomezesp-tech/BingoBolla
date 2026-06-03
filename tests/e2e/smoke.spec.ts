import { expect, test } from "@playwright/test";

const protectedRoutes = [
  "/lobby",
  "/mundos",
  "/mundomiami",
  "/play/neural-cascade",
  "/account",
  "/invitar",
  "/onboarding",
] as const;
const e2eEmail = process.env.E2E_USER_EMAIL;
const e2ePassword = process.env.E2E_USER_PASSWORD;

test.describe("BingoBolla smoke", () => {
  test("root document exposes Spanish metadata", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator("html")).toHaveAttribute("lang", "es");
    await expect(page).toHaveTitle(/BingoBolla/);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /Bingo social/);
    await expect(page.getByText("21+").first()).toBeVisible();
  });

  test("login renders the current email/password auth form", async ({ page }) => {
    await page.goto("/login");

    await expect(page.getByRole("link", { name: /bingobolla/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Contraseña$/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Magic Link$/ })).toBeVisible();
    await expect(page.getByLabel(/^Email$/)).toBeVisible();
    await expect(page.getByLabel(/Contraseña/)).toBeVisible();
    await expect(page.getByRole("button", { name: /iniciar sesión/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /regístrate/i })).toHaveAttribute("href", "/signup");
    await expect(page.getByRole("button", { name: /^Crear cuenta$/ })).toHaveCount(0);
  });

  test("signup invite links keep the referral code visible", async ({ page }) => {
    await page.goto("/signup?ref=Miami Crew!");

    await expect(page.getByRole("heading", { name: /crea tu cuenta/i })).toBeVisible();
    await expect(page.getByText(/invitacion activa/i)).toBeVisible();
    await expect(page.getByText("miami_crew")).toBeVisible();
    await expect(page.getByText(/21 años o más/i)).toBeVisible();
    await expect(page.getByText(/acepto los/i)).toBeVisible();
    await expect(page.getByRole("checkbox")).toHaveCount(2);
  });

  for (const route of protectedRoutes) {
    test(`${route} redirects signed-out users to login`, async ({ page }) => {
      await page.goto(route);

      await expect(page).toHaveURL(/\/login$/);
      await expect(page.getByRole("button", { name: /iniciar sesión/i })).toBeVisible();
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

  test("legacy community alias redirects to invites", async ({ request }) => {
    const friends = await request.get("/amigos", { maxRedirects: 0 });

    expect([307, 308]).toContain(friends.status());
    expect(friends.headers().location).toBe("/invitar");
  });

  test("public app shell assets stay available", async ({ request }) => {
    const manifest = await request.get("/manifest.webmanifest");
    const serviceWorker = await request.get("/sw.js");
    const neuralCascade = await request.get("/games/neural-cascade.html");
    const ballmatchToken = await request.get("/game-assets/ballmatch-tokens/bolla-swirl.png");

    await expect(manifest).toBeOK();
    await expect(serviceWorker).toBeOK();
    await expect(neuralCascade).toBeOK();
    await expect(ballmatchToken).toBeOK();
    expect(manifest.headers()["content-type"]).toContain("application/manifest+json");
    expect(serviceWorker.headers()["content-type"]).toContain("application/javascript");
    expect(neuralCascade.headers()["content-type"]).toContain("text/html");
    expect(ballmatchToken.headers()["content-type"]).toContain("image/png");
  });

  test("authenticated smoke user can reach lobby, worlds, and account", async ({ page }) => {
    test.skip(!e2eEmail || !e2ePassword, "Set E2E_USER_EMAIL and E2E_USER_PASSWORD to run the authenticated smoke.");

    await page.goto("/login");
    await page.getByLabel(/^Email$/).fill(e2eEmail ?? "");
    await page.getByLabel(/Contraseña/).fill(e2ePassword ?? "");
    await page.getByRole("button", { name: /iniciar sesión/i }).click();

    await page.waitForURL(/\/lobby(?:$|\?)/);

    await page.goto("/lobby");
    await expect(page).not.toHaveURL(/\/login$/);
    await expect(page.locator("body")).not.toContainText(/iniciar sesión/i);

    await page.getByRole("button", { name: /jugar bingo/i }).click();
    await page.waitForURL(/\/room\/[0-9a-f-]+$/i);
    await expect(page).not.toHaveURL(/\/login$/);
    await expect(page.locator('[data-room-stage="live"]')).toBeVisible();
    await expect(page.locator(".rm-stageCards .rm-card, .rm-stageCallout")).toBeVisible();
    await expect(page.locator(".rm-stageCta, .rm-stageCallout .rm-inlinePrimary")).toBeVisible();
    await expect(page.locator(".rm-booth")).toHaveCount(0);
    await expect(page.locator(".rm-buybig")).not.toContainText(/MÁS CARTONES/i);

    await page.goto("/mundos");
    await expect(page).not.toHaveURL(/\/login$/);
    await expect(page.locator("body")).not.toContainText(/iniciar sesión/i);

    await page.goto("/mundomiami");
    await expect(page).not.toHaveURL(/\/login$/);
    await expect(page.getByText("Miami Nights")).toBeVisible();
    await expect(page.locator(".wm-playCta")).toBeVisible();
    await page.locator(".wm-playCta").click();
    await expect(page.locator(".go-shell")).toBeVisible();
    await expect(page.locator(".go-titleBlock")).toContainText(/Ball Match|Neural Cascade/);

    await page.goto("/play/neural-cascade?level=6");
    await expect(page).not.toHaveURL(/\/login$/);
    await expect(page.locator("body")).not.toContainText(/Fase 2 pendiente/i);
    await expect(page.locator('iframe[title^="Neural Cascade"]')).toBeVisible();

    await page.goto("/account");
    await expect(page).not.toHaveURL(/\/login$/);
    await expect(page.getByRole("heading", { name: /mi cuenta/i })).toBeVisible();
  });
});
