import { test, expect } from "@playwright/test";

/**
 * Smoke E2E over the loop Cîhan actually runs on: sign in, read the help
 * board, open a request, and message whoever wrote it.
 *
 *   E2E_EMAIL=you@example.com E2E_PASSWORD=secret npm run test:e2e
 *
 * Or point at a running app:
 *   PLAYWRIGHT_BASE_URL=http://localhost:3000 E2E_EMAIL=… E2E_PASSWORD=… npm run test:e2e
 */
const email = process.env.E2E_EMAIL ?? "";
const password = process.env.E2E_PASSWORD ?? "";
const hasCreds = Boolean(email && password);

test.describe("sign in → help board → message", () => {
  test.skip(!hasCreds, "Set E2E_EMAIL and E2E_PASSWORD to run this flow");

  test("signs in, opens a help request, and messages the asker", async ({
    page,
  }) => {
    await page.goto("/en/login");
    await page.locator("#email").fill(email);
    await page.locator("#password").fill(password);
    await page.getByRole("button", { name: /sign in|log in|login/i }).click();

    await expect(page).toHaveURL(/\/en\/(dashboard|onboarding|feed)/, {
      timeout: 30_000,
    });

    await page.goto("/en/help");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    const firstRequest = page.locator('a[href*="/help/"]').first();
    if (!(await firstRequest.isVisible().catch(() => false))) {
      // An empty board is a legitimate state, not a failure.
      await expect(page.getByText(/no requests|empty|be the first/i)).toBeVisible();
      return;
    }

    await firstRequest.click();
    await expect(page).toHaveURL(/\/en\/help\/[0-9a-f-]{36}/, { timeout: 20_000 });

    const messageBtn = page.getByRole("button", { name: /^message$/i }).first();
    if (!(await messageBtn.isVisible().catch(() => false))) {
      // Your own request has no Message button — also a valid outcome.
      return;
    }

    await messageBtn.click();
    await expect(page).toHaveURL(/\/en\/messages\//, { timeout: 20_000 });

    const body = `e2e ${Date.now()}`;
    await page.getByPlaceholder(/write a message|message/i).fill(body);
    await page.getByRole("button", { name: /send/i }).click();
    await expect(page.getByText(body)).toBeVisible({ timeout: 15_000 });
  });
});

test("the five tabs are reachable without signing in", async ({ page }) => {
  for (const [path, pattern] of [
    ["/en/login", /sign in|log in/i],
    ["/en/explore", /explore/i],
    ["/en/reels", /reels/i],
    ["/en/help", /help/i],
    ["/en/directory", /director/i],
  ] as const) {
    await page.goto(path);
    await expect(page.locator("body")).toContainText(pattern, { timeout: 15_000 });
  }
});
