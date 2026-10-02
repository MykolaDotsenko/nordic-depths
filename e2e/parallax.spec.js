import { devices, expect, test } from "@playwright/test";
import { scrollToY, translateY, visibleTextShare, waitForSettledParallax } from "./helpers.js";

// The 2023 exercise's divisors: far, middle and near planes, the title and the dungeon copy.
const LAYER_DIVISORS = { far: 1.6, middle: 2.5, near: 5.7 };

test("the original layers move by the exact 2023 divisors", async ({ page }) => {
  await page.goto("/");

  for (const y of [120, 300, 460]) {
    await scrollToY(page, y);
    await waitForSettledParallax(page);

    const transforms = await page.evaluate(() => ({
      layers: Object.fromEntries(
        [...document.querySelectorAll("[data-original-layer]")].map((layer) => [
          layer.dataset.originalLayer,
          getComputedStyle(layer).transform,
        ]),
      ),
      title: getComputedStyle(document.querySelector("[data-original-copy]")).transform,
      dungeon: getComputedStyle(document.querySelector(".original-main-article__header")).transform,
    }));

    for (const [layer, divisor] of Object.entries(LAYER_DIVISORS)) {
      expect(translateY(transforms.layers[layer]), `${layer} at ${y}px`).toBeCloseTo(y / divisor, 0);
    }
    expect(translateY(transforms.title), `title at ${y}px`).toBeCloseTo(y / 2, 0);
    expect(translateY(transforms.dungeon), `dungeon copy at ${y}px`).toBeCloseTo(y / -7.5, 0);
  }
});

test("far, middle and near planes travel at increasing speed on screen", async ({ page }) => {
  await page.goto("/");
  await waitForSettledParallax(page);

  const tops = () =>
    page.locator("[data-original-layer]").evaluateAll((layers) => layers.map((layer) => layer.getBoundingClientRect().top));

  const before = await tops();
  const distance = await page.evaluate(() => Math.round(Math.min(460, window.innerHeight * 0.58)));
  await scrollToY(page, distance);
  await waitForSettledParallax(page);
  const travel = (await tops()).map((top, index) => Math.abs(top - before[index]));

  expect(travel).toHaveLength(3);
  expect(travel[0]).toBeLessThan(travel[1]);
  expect(travel[1]).toBeLessThan(travel[2]);
  expect(travel[2] - travel[0]).toBeGreaterThan(120);
});

test("the title is fully legible on arrival, then sinks behind the forest", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  await waitForSettledParallax(page);
  expect(await visibleTextShare(page, "#original-title")).toBeGreaterThan(0.97);

  const viewportHeight = await page.evaluate(() => window.innerHeight);
  await scrollToY(page, Math.round(viewportHeight * 0.7));
  await waitForSettledParallax(page);
  expect(await visibleTextShare(page, "#original-title")).toBeLessThan(0.93);
});

test("the title stays legible on common screens in both languages", async ({ browser, baseURL }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "The screen sweep runs once, in Chromium");

  const screens = {
    "1366×768": { viewport: { width: 1366, height: 768 } },
    "1920×1080": { viewport: { width: 1920, height: 1080 } },
    "2560×1080": { viewport: { width: 2560, height: 1080 } },
    "1024×768": { viewport: { width: 1024, height: 768 } },
    "768×1024": { viewport: { width: 768, height: 1024 }, hasTouch: true },
    "iPhone 13": devices["iPhone 13"],
    "360×740": { viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
    "844×390": { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 },
  };

  for (const language of ["fi", "en"]) {
    for (const [name, options] of Object.entries(screens)) {
      const context = await browser.newContext({ ...options, baseURL });
      const page = await context.newPage();
      await page.goto(`/?lang=${language}`);
      await page.evaluate(() => document.fonts.ready);
      await waitForSettledParallax(page);
      expect(await visibleTextShare(page, "#original-title"), `${language} ${name}`).toBeGreaterThan(0.97);
      await context.close();
    }
  }
});

test("reduced motion freezes the preserved original parallax", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await scrollToY(page, 360);

  await expect(page.locator("[data-original-experience]")).toHaveCSS("--original-scroll", "0px");
  await expect(page.locator('[data-original-layer="near"]')).toHaveCSS("transform", "none");
});
