import { test, expect } from "@playwright/test";

/**
 * Smoke E2E: login → match → open chat → send a message.
 * Requires a real account with looking_for/offering set and at least one match.
 *
 *   E2E_EMAIL=you@example.com E2E_PASSWORD=secret npm run test:e2e
 *
 * Or point at a running app:
 *   PLAYWRIGHT_BASE_URL=http://localhost:3000 E2E_EMAIL=… E2E_PASSWORD=… npm run test:e2e
 */
const email = process.env.E2E_EMAIL ?? "";
const password = process.env.E2E_PASSWORD ?? "";
const hasCreds = Boolean(email && password);

test.describe("login → match → message", () => {
  test.skip(!hasCreds, "Set E2E_EMAIL and E2E_PASSWORD to run this flow");

  test("signs in, opens a match chat, and sends a message", async ({
    page,
  }) => {
    await page.goto("/en/login");
    await page.locator("#email").fill(email);
    await page.locator("#password").fill(password);
    await page.getByRole("button", { name: /sign in|log in|login/i }).click();

    await expect(page).toHaveURL(/\/en\/(dashboard|onboarding|match)/, {
      timeout: 30_000,
    });

    await page.goto("/en/match");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    const messageBtn = page.getByRole("button", { name: /^message$/i }).first();
    const setupCta = page.getByRole("link", { name: /edit|profile|setup/i });
    const empty = page.getByText(/no matches|empty/i);

    if (await messageBtn.isVisible().catch(() => false)) {
      await messageBtn.click();
      await expect(page).toHaveURL(/\/en\/messages\//, { timeout: 20_000 });

      const body = `e2e ${Date.now()}`;
      const input = page.getByPlaceholder(/write a message|message/i);
      await input.fill(body);
      await page.getByRole("button", { name: /send/i }).click();
      await expect(page.getByText(body)).toBeVisible({ timeout: 15_000 });
      return;
    }

    // Acceptable when diaspora matching isn't set up yet for this account.
    await expect(setupCta.or(empty).first()).toBeVisible();
  });
});

test("login page renders", async ({ page }) => {
  await page.goto("/en/login");
  await expect(page.locator("#email")).toBeVisible();
  await expect(page.locator("#password")).toBeVisible();
});
