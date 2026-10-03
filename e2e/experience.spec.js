import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { changedPixelShare, contrastOverBackground, scrollToY } from "./helpers.js";

const isMobileProject = (testInfo) => testInfo.project.name === "mobile-chromium";

async function enterContinuation(page) {
  await page.locator("#extension").scrollIntoViewIfNeeded();
  await expect(page.locator("body")).toHaveClass(/extension-active/);
}

test("renders the whole story without errors, failed requests or horizontal overflow", async ({ page }) => {
  const problems = [];
  page.on("pageerror", (error) => problems.push(error.message));
  page.on("response", (response) => {
    if (response.status() >= 400) problems.push(`${response.status()} ${response.url()}`);
  });

  await page.goto("/");
  await expect(page.locator("#original-title")).toBeVisible();

  for (const id of [
    "#extension-title",
    "#xray-title",
    "#depth-title",
    "#rhythm-title",
    "#principles-title",
    "#system-title",
    "#aurora-title",
    "#contact-title",
  ]) {
    const heading = page.locator(id);
    await heading.scrollIntoViewIfNeeded();
    await expect(heading).toBeVisible();
  }

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  expect(problems).toEqual([]);
});

test("the modern chrome waits for the continuation, except the language switch", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("[data-lang-switch]")).toBeVisible();
  await expect(page.locator(".brand")).toHaveCSS("opacity", "0");

  await enterContinuation(page);
  await expect(page.locator(".brand")).toHaveCSS("opacity", "1");
  await expect(page.locator("[data-motion-lab-toggle]")).toBeVisible();
});

test("the Motion Lab toggle lives in the header, never over the story", async ({ page }) => {
  await page.goto("/");
  await page.locator("#principles").scrollIntoViewIfNeeded();
  await expect(page.locator("body")).toHaveClass(/extension-active/);

  const toggle = await page.locator("[data-motion-lab-toggle]").boundingBox();
  const header = await page.locator("[data-header]").boundingBox();
  expect(toggle.y).toBeGreaterThanOrEqual(header.y);
  expect(toggle.y + toggle.height).toBeLessThanOrEqual(header.y + header.height);
});

test("section labels keep their designed style", async ({ page }) => {
  await page.goto("/");
  const labels = await page.locator(".section-index, .kicker, .eyebrow").evaluateAll((elements) =>
    elements.map((element) => {
      const style = getComputedStyle(element);
      return {
        text: element.textContent.trim(),
        transform: style.textTransform,
        letterSpacing: Number.parseFloat(style.letterSpacing),
        fontSize: Number.parseFloat(style.fontSize),
      };
    }),
  );

  expect(labels.length).toBeGreaterThanOrEqual(10);
  for (const label of labels) {
    expect(label.transform, label.text).toBe("uppercase");
    expect(label.letterSpacing, label.text).toBeGreaterThan(1);
    expect(label.fontSize, label.text).toBeLessThan(16);
  }
});

test("desktop scene compass follows the current scene", async ({ page }, testInfo) => {
  test.skip(isMobileProject(testInfo), "The compass is intentionally hidden on small screens");

  await page.goto("/");
  await page.locator("#extension").scrollIntoViewIfNeeded();
  await expect(page.locator('[data-scene-link="extension"]')).toHaveAttribute("aria-current", "step");

  await page.locator("#xray-title").scrollIntoViewIfNeeded();
  await expect(page.locator('[data-scene-link="xray"]')).toHaveAttribute("aria-current", "step");
});

test("desktop navigation reaches the story", async ({ page }, testInfo) => {
  test.skip(isMobileProject(testInfo), "Small screens show a compact navigation");

  await page.goto("/");
  await enterContinuation(page);
  await page.locator('.site-nav a[href="#xray"]').click();
  await expect(page.locator("#xray")).toBeInViewport();
});

test("small screens keep a compact, contact-first navigation", async ({ page }, testInfo) => {
  test.skip(!isMobileProject(testInfo), "Mobile-specific layout");

  await page.goto("/");
  await enterContinuation(page);
  await expect(page.locator('.site-nav a[href="#contact"]')).toBeVisible();
  await expect(page.locator('.site-nav a[href="#xray"]')).toBeHidden();
});

test("contact offers LinkedIn and GitHub, and the header link lands on it", async ({ page }) => {
  await page.goto("/");
  const contact = page.locator("#contact");
  await expect(contact.getByRole("link", { name: "LinkedIn" })).toHaveAttribute(
    "href",
    "https://www.linkedin.com/in/mykola-dotsenko/",
  );
  await expect(contact.getByRole("link", { name: "GitHub" })).toHaveAttribute("href", "https://github.com/MykolaDotsenko");

  await enterContinuation(page);
  await page.locator('.site-nav a[href="#contact"]').click();
  await expect(contact).toBeInViewport();
});

test("Motion Lab changes and persists the real motion profile", async ({ page }) => {
  await page.goto("/");
  await enterContinuation(page);
  await page.getByRole("button", { name: "Motion Lab" }).click();
  await page.locator('label:has(input[value="reduced"])').click();
  await expect(page.locator('input[value="reduced"]')).toBeChecked();
  await expect(page.locator("html")).toHaveAttribute("data-motion", "reduced");

  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-motion", "reduced");
});

test("Reduced in Motion Lab also stops the motion CSS owns", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() =>
    localStorage.setItem("nordic-depths:motion", JSON.stringify({ profile: "reduced", depthScale: 1 })),
  );
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-motion", "reduced");

  const running = await page.evaluate(() =>
    document
      .getAnimations()
      .filter((animation) => animation instanceof CSSAnimation && animation.playState === "running")
      .map((animation) => animation.animationName)
      .filter((name) => name !== "document-scroll-progress"),
  );
  expect(running).toEqual([]);
  await expect(page.locator("html")).toHaveCSS("scroll-behavior", "auto");

  await page.locator("#extension").scrollIntoViewIfNeeded();
  await expect(page.locator("[data-fireflies]")).toHaveAttribute("data-state", "off");
  await expect(page.locator("[data-fireflies]")).toBeHidden();
});

test("Motion Lab velocity settles back to zero when scrolling stops", async ({ page }) => {
  await page.goto("/");
  await page.locator("#principles").scrollIntoViewIfNeeded();
  await page.getByRole("button", { name: "Motion Lab" }).click();

  const whileScrolling = await page.evaluate(async () => {
    document.documentElement.style.scrollBehavior = "auto";
    await new Promise((resolve) => setTimeout(resolve, 300));
    for (let step = 0; step < 24; step += 1) {
      window.scrollBy(0, 60);
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }
    return document.querySelector("[data-velocity-readout]").textContent;
  });

  expect(whileScrolling).toMatch(/^\+[1-9]\d* px\/s$/);
  await expect(page.locator("[data-velocity-readout]")).toHaveText("0 px/s");
});

test("Motion Lab names the scene the reader is in", async ({ page }) => {
  await page.goto("/");
  await page.locator("#extension").scrollIntoViewIfNeeded();
  await page.getByRole("button", { name: "Motion Lab" }).click();
  await expect(page.locator("[data-scene-readout]")).toHaveText("Ajatus");
});

test("reduced system motion becomes the active profile when no override is stored", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-motion", "reduced");
});

async function scrollXrayTo(page, progress) {
  return page.evaluate((target) => {
    const section = document.querySelector("#xray");
    const stage = section.querySelector("[data-xray-stage]");
    const sticky = window.matchMedia("(min-width: 901px) and (min-height: 621px)").matches;
    const sectionTop = section.getBoundingClientRect().top + window.scrollY;
    const stageTop = stage.getBoundingClientRect().top + window.scrollY;
    const y = sticky
      ? sectionTop + target * (section.offsetHeight - window.innerHeight)
      : stageTop - window.innerHeight * 0.88 + target * (stage.offsetHeight + window.innerHeight * 0.76);
    document.documentElement.style.scrollBehavior = "auto";
    window.scrollTo(0, Math.round(y));
  }, progress);
}

test("X-Ray composes the forest, explodes it in depth, then recomposes", async ({ page }) => {
  await page.goto("/");
  const scene = page.locator("[data-xray-scene]");
  const explode = () => scene.evaluate((element) => Number(getComputedStyle(element).getPropertyValue("--xray-explode")));

  const planeBackgrounds = await page
    .locator(".xray__plane")
    .evaluateAll((planes) => planes.map((plane) => getComputedStyle(plane).backgroundColor));
  expect(new Set(planeBackgrounds)).toEqual(new Set(["rgba(0, 0, 0, 0)"]));

  await scrollXrayTo(page, 0);
  await expect.poll(explode).toBeLessThan(0.05);

  await scrollXrayTo(page, 0.52);
  await expect.poll(explode).toBeGreaterThan(0.95);

  await scrollXrayTo(page, 1);
  await expect.poll(explode).toBeLessThan(0.05);
});

test("without motion, X-Ray shows a still exploded view", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.locator("[data-xray-stage]").scrollIntoViewIfNeeded();
  const explode = await page
    .locator("[data-xray-scene]")
    .evaluate((element) => Number(getComputedStyle(element).getPropertyValue("--xray-explode")));
  expect(explode).toBe(1);
});

test("the Rhythm scene opens like doors as it arrives", async ({ page }) => {
  await page.goto("/");
  const night = page.locator("#night");
  const viewportHeight = await page.evaluate(() => window.innerHeight);
  const top = await night.evaluate((element) => element.getBoundingClientRect().top + window.scrollY);

  await scrollToY(page, Math.round(top - viewportHeight * 0.95));
  const left = page.locator('[data-night-shutter="left"]');
  await expect.poll(async () => (await left.boundingBox()).x).toBeGreaterThan(-5);

  await scrollToY(page, Math.round(top));
  await expect
    .poll(async () => {
      const box = await left.boundingBox();
      return box ? box.x + box.width : 0;
    })
    .toBeLessThanOrEqual(1);
});

test("keyboard users reach the header controls before the story", async ({ page, browserName }) => {
  test.skip(browserName === "webkit", "Safari tabs to links only when a user preference is enabled");

  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(page.locator(".skip-link")).toBeFocused();

  await page.keyboard.press("Tab");
  await expect(page.locator(".brand")).toBeFocused();
  await expect(page.locator(".brand")).toHaveCSS("opacity", "1");

  const reached = [];
  for (let step = 0; step < 24; step += 1) {
    await page.keyboard.press("Tab");
    reached.push(
      await page.evaluate(() => {
        const element = document.activeElement;
        if (element.matches("[data-lang-option]")) return `lang:${element.dataset.langOption}`;
        if (element.matches("[data-motion-lab-toggle]")) return "motion-lab";
        if (element.matches(".original-main-article__next")) return "story";
        return element.getAttribute("href") || element.tagName;
      }),
    );
  }

  const story = reached.indexOf("story");
  expect(reached.indexOf("lang:fi")).toBeGreaterThan(-1);
  expect(reached.indexOf("motion-lab")).toBeGreaterThan(-1);
  expect(reached.indexOf("lang:fi")).toBeLessThan(story);
  expect(reached.indexOf("motion-lab")).toBeLessThan(story);
});

test("the skip link moves focus into the main content", async ({ page, browserName }) => {
  test.skip(browserName === "webkit", "Safari tabs to links only when a user preference is enabled");

  await page.goto("/");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();
});

test("a fine pointer moves the intro glow", async ({ page }, testInfo) => {
  test.skip(isMobileProject(testInfo), "Coarse pointers get the compact profile, without the glow");

  await page.goto("/");
  await page.locator("#extension").scrollIntoViewIfNeeded();
  const { width, height } = page.viewportSize();
  await page.mouse.move(width / 2, height / 2);
  await page.mouse.move(width - 4, height / 2, { steps: 4 });

  const glowX = () =>
    page.locator("#extension").evaluate((element) => Number.parseFloat(element.style.getPropertyValue("--pointer-x") || "0"));
  await expect.poll(glowX).toBeGreaterThan(40);
});

test("WebGL fireflies draw only while the intro is on screen", async ({ page, browserName }) => {
  await page.goto("/");
  const canvas = page.locator("[data-fireflies]");
  await expect(canvas).not.toHaveAttribute("data-state", "off");

  // GPU-less CI runners may have no WebGL outside Chromium; the canvas then stays hidden.
  const supported = (await canvas.getAttribute("data-state")) !== "unsupported";
  if (browserName === "chromium") expect(supported, "Chromium always offers WebGL").toBe(true);
  test.skip(!supported, "No WebGL context in this browser here; the page goes on without the canvas");

  await expect(canvas).toHaveAttribute("data-state", "paused");
  await page.locator("#extension").scrollIntoViewIfNeeded();
  await expect(canvas).toHaveAttribute("data-state", "running");
  const frames = async () => Number((await canvas.getAttribute("data-frames")) ?? 0);
  const before = await frames();
  await expect.poll(frames).toBeGreaterThan(before);

  await page.locator("#principles").scrollIntoViewIfNeeded();
  await expect(canvas).toHaveAttribute("data-state", "paused");
  const stopped = await frames();
  await page.waitForTimeout(600);
  expect(await frames()).toBe(stopped);
});

test("the fireflies really paint over the intro", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes("chromium"), "Pixel sampling runs in Chromium, desktop and mobile");

  await page.goto("/");
  await page.locator("#extension").evaluate((element) => {
    document.documentElement.style.scrollBehavior = "auto";
    element.scrollIntoView();
  });
  const canvas = page.locator("[data-fireflies]");
  await expect(canvas).toHaveAttribute("data-state", "running");
  await expect(canvas).toHaveCSS("opacity", "1");
  // Compare the same frame of the scene with and without the canvas; the copy is
  // hidden so only the particle field can differ.
  await page.addStyleTag({ content: ".extension-intro__inner { visibility: hidden !important; }" });
  const viewport = page.viewportSize();
  const clip = { x: 0, y: 0, width: viewport.width, height: viewport.height };
  const lit = await page.screenshot({ clip });
  const hide = await page.addStyleTag({ content: ".fireflies { visibility: hidden !important; }" });
  const dark = await page.screenshot({ clip });
  await hide.evaluate((element) => element.remove());

  expect(await changedPixelShare(page, lit, dark)).toBeGreaterThan(0.002);
});

test("without JavaScript the whole story is still there", async ({ browser, baseURL }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Progressive enhancement is checked once, in Chromium");

  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  const page = await context.newPage();
  await page.goto("/");

  await expect(page.locator("html")).not.toHaveClass(/\bjs\b/);
  await expect(page.locator(".site-nav")).toBeVisible();
  await expect(page.locator("[data-motion-lab-toggle]")).toBeHidden();
  for (const id of ["#original-title", "#extension-title", "#xray-title", "#system-title", "#contact-title"]) {
    await page.locator(id).scrollIntoViewIfNeeded();
    await expect(page.locator(id)).toBeVisible();
  }
  await context.close();
});

test("system scene exposes the architecture as readable content", async ({ page }) => {
  await page.goto("/");
  const system = page.locator("#system");
  await system.scrollIntoViewIfNeeded();

  await expect(page.locator("#system-title")).toBeVisible();
  await expect(system.locator("[data-system-node]")).toHaveCount(5);
  await expect(system.getByText("getMotionProfile()", { exact: true })).toBeVisible();
});

for (const language of ["fi", "en", "uk"]) {
  test(`no serious or critical accessibility violations (${language})`, async ({ page }) => {
    await page.goto(`/?lang=${language}`);
    await expect(page.locator("html")).toHaveAttribute("lang", language);
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();

    const blocking = results.violations.filter((violation) => ["serious", "critical"].includes(violation.impact));
    expect(blocking).toEqual([]);
  });
}

test("copy over the aurora and the mist keeps 4.5:1 contrast", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes("chromium"), "Pixel sampling runs in Chromium, desktop and mobile");
  test.setTimeout(90_000);

  await page.goto("/");
  for (const selector of ["#aurora .eyebrow", "#aurora-title", ".aurora__text", ".contact__text", '[data-i18n="mistText"]']) {
    expect(await contrastOverBackground(page, selector), selector).toBeGreaterThanOrEqual(4.5);
  }
});

test("the first load stays light and never pulls the source artwork", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes("chromium"), "Byte accounting uses Chromium's network sizes");

  const responses = [];
  page.on("requestfinished", async (request) => {
    const sizes = await request.sizes();
    responses.push({ url: request.url(), bytes: sizes.responseBodySize + sizes.responseHeadersSize });
  });

  await page.goto("/", { waitUntil: "load" });
  await page.waitForLoadState("networkidle");

  const total = responses.reduce((sum, response) => sum + response.bytes, 0);
  expect(total, `${(total / 1e6).toFixed(2)} MB`).toBeLessThan(1_200_000);
  expect(responses.filter((response) => /img\/source\/|layer-.*\.png|dungeon\.jpg/.test(response.url))).toEqual([]);
});
