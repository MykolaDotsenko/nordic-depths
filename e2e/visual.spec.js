// Captures review screenshots into visual-artifacts/ (uploaded by CI).
// Behaviour is asserted in the other specs; this file only records what the page looks like.
import { mkdir } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { scrollToY, waitForSettledParallax } from "./helpers.js";

async function decodeImages(page) {
  await page.locator("img").evaluateAll(async (images) => {
    await Promise.all(
      images.map(async (image) => {
        if (!image.complete) {
          await Promise.race([
            new Promise((resolve) => {
              image.addEventListener("load", resolve, { once: true });
              image.addEventListener("error", resolve, { once: true });
            }),
            new Promise((resolve) => setTimeout(resolve, 2500)),
          ]);
        }
        if (image.complete && image.naturalWidth > 0) {
          try {
            await image.decode();
          } catch {
            // A loaded image may reject decode(); the capture can continue.
          }
        }
      }),
    );
  });
}

async function capture(page, selector, path, { align = "start" } = {}) {
  await page.locator(selector).evaluate((element, block) => {
    document.documentElement.style.scrollBehavior = "auto";
    element.scrollIntoView({ block });
  }, align);
  await decodeImages(page);
  await page.waitForTimeout(900);
  await page.screenshot({ path, fullPage: false });
}

test("capture visual preview", async ({ page }, testInfo) => {
  const isDesktop = testInfo.project.name === "chromium";
  const isMobile = testInfo.project.name === "mobile-chromium";
  test.skip(!isDesktop && !isMobile, "Representative desktop/mobile render only");
  test.setTimeout(120_000);

  await mkdir("visual-artifacts", { recursive: true });
  const prefix = isMobile ? "mobile" : "desktop";
  const out = (name) => `visual-artifacts/${prefix}-${name}.png`;

  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  await decodeImages(page);
  await waitForSettledParallax(page);
  await page.screenshot({ path: out("01-original-forest") });

  const viewportHeight = await page.evaluate(() => window.innerHeight);
  await scrollToY(page, Math.round(viewportHeight * 0.45));
  await waitForSettledParallax(page);
  await page.screenshot({ path: out("02-original-sinking") });

  await capture(page, "#original-dungeon", out("03-original-dungeon"));
  await capture(page, "#extension", out("04-intro"));

  await expect(page.locator("body")).toHaveClass(/extension-active/);
  await page.getByRole("button", { name: "Motion Lab" }).click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: out("05-motion-lab") });
  await page.keyboard.press("Escape");

  const xray = await page.evaluate(() => {
    const section = document.querySelector("#xray");
    return { top: section.getBoundingClientRect().top + window.scrollY, height: section.offsetHeight };
  });
  const sticky = await page.evaluate(() => window.matchMedia("(min-width: 901px) and (min-height: 621px)").matches);
  if (sticky) {
    for (const [name, progress] of [
      ["06-xray-composed", 0],
      ["07-xray-exploded", 0.5],
    ]) {
      await scrollToY(page, Math.round(xray.top + progress * (xray.height - viewportHeight)));
      await decodeImages(page);
      await page.waitForTimeout(1200);
      await page.screenshot({ path: out(name) });
    }
  } else {
    await capture(page, "[data-xray-stage]", out("07-xray-exploded"), { align: "center" });
  }

  await capture(page, "#mist", out("08-focus"));
  await capture(page, "#night", out("09-rhythm"));
  await capture(page, "#principles", out("10-craft"));
  await capture(page, "#system", out("11-structure"));
  await capture(page, "#aurora", out("12-outcome"));
  await capture(page, "#contact", out("13-contact"), { align: "center" });

  await page.goto("/?lang=en");
  await page.evaluate(() => document.fonts.ready);
  await decodeImages(page);
  await waitForSettledParallax(page);
  await page.screenshot({ path: out("14-english-forest") });

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  for (const image of await page.locator('img[loading="lazy"]').all()) await image.scrollIntoViewIfNeeded();
  await decodeImages(page);
  await scrollToY(page, 0);
  await page.screenshot({ path: out("15-full-static"), fullPage: true });
});
