import { expect, test } from "@playwright/test";

test("Finnish is the default language", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "fi");
  await expect(page.locator("#original-title")).toHaveText(/Rakennan toimivia digitaalisia tuotteita/i);
  await expect(page.locator('[data-lang-option="fi"]')).toHaveAttribute("aria-pressed", "true");
});

test("the EN switch translates everything and is remembered", async ({ page }) => {
  await page.goto("/");
  const finnish = await page.evaluate(() =>
    [...document.querySelectorAll("[data-i18n]")].map((element) => [element.dataset.i18n, element.innerHTML]),
  );

  await page.locator('[data-lang-option="en"]').click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator('[data-lang-option="en"]')).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#original-title")).toHaveText("I build digital products that work.");
  await expect(page).toHaveTitle(/software developer in Turku/);
  await expect(page.locator(".site-nav")).toHaveAttribute("aria-label", "Main navigation");
  await expect(page.locator("#forest")).toHaveAttribute("data-scene-label", "Origin");

  const untranslated = await page.evaluate(
    (pairs) =>
      pairs
        .filter(([key, html]) => document.querySelector(`[data-i18n="${key}"]`).innerHTML === html)
        .map(([key]) => key),
    finnish,
  );
  expect(untranslated).toEqual([]);

  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("#aurora-title")).toHaveText("Complex should feel simple.");

  await page.locator('[data-lang-option="fi"]').click();
  const restored = await page.evaluate(
    (pairs) => pairs.every(([key, html]) => document.querySelector(`[data-i18n="${key}"]`).innerHTML === html),
    finnish,
  );
  expect(restored).toBe(true);
  await expect(page.locator("html")).toHaveAttribute("lang", "fi");
});

test("?lang=en opens the English page directly", async ({ page }) => {
  await page.goto("/?lang=en");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("#contact-title")).toHaveText("Let’s talk");
  await expect(page.locator("html")).not.toHaveClass(/i18n-pending/);
});

test("Motion Lab readouts follow the language", async ({ page }) => {
  await page.goto("/?lang=en");
  await page.locator("#extension").scrollIntoViewIfNeeded();
  await page.getByRole("button", { name: "Motion Lab" }).click();
  await expect(page.locator("[data-scene-readout]")).toHaveText("Idea");
  await expect(page.locator("[data-system-motion-readout]")).toHaveText("Off");

  await page.keyboard.press("Escape");
  await page.locator('[data-lang-option="fi"]').click();
  await page.getByRole("button", { name: "Motion Lab" }).click();
  await expect(page.locator("[data-scene-readout]")).toHaveText("Ajatus");
  await expect(page.locator("[data-system-motion-readout]")).toHaveText("Pois");
});

async function overflowingText(page) {
  return page.evaluate(() =>
    [...document.querySelectorAll("h1, h2, h3, .line, .button, .site-header, .xray__legend")]
      .filter((element) => element.scrollWidth > element.clientWidth + 1)
      .map((element) => `${element.id || element.className}: ${element.textContent.trim().slice(0, 30)}`),
  );
}

test("no heading overflows its box in either language", async ({ page }) => {
  for (const language of ["fi", "en"]) {
    await page.goto(`/?lang=${language}`);
    await page.evaluate(() => document.fonts.ready);
    expect(await overflowingText(page), language).toEqual([]);
  }
});

test("long Finnish words fit from 320px phones to 1920px screens", async ({ browser, baseURL }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "The screen sweep runs once, in Chromium");

  for (const [width, height] of [
    [320, 640],
    [360, 740],
    [412, 915],
    [768, 1024],
    [1024, 768],
    [1280, 720],
    [1440, 900],
    [1920, 1080],
  ]) {
    for (const language of ["fi", "en"]) {
      const context = await browser.newContext({ viewport: { width, height }, baseURL });
      const page = await context.newPage();
      await page.goto(`/?lang=${language}`);
      await page.evaluate(() => document.fonts.ready);
      expect(await overflowingText(page), `${language} ${width}×${height}`).toEqual([]);
      await context.close();
    }
  }
});
