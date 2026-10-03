// Shared browser-test helpers.

// Waits until the preserved parallax has caught up with the current scroll
// position and finished its authored 0.75s easing.
export async function waitForSettledParallax(page) {
  await page.waitForFunction(
    () => {
      const experience = document.querySelector("[data-original-experience]");
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const expected = reduced
        ? 0
        : Math.min(Math.max(window.scrollY - experience.offsetTop, 0), experience.offsetHeight);
      const current = Number.parseFloat(experience.style.getPropertyValue("--original-scroll") || "0");
      if (Math.abs(current - expected) > 0.5) return false;

      return [
        ...document.querySelectorAll(
          "[data-original-layer], [data-original-copy], .original-main-article__header, .original-main-article__paragraph",
        ),
      ].every((element) => element.getAnimations().every((animation) => animation.playState !== "running"));
    },
    null,
    { polling: 100, timeout: 10_000 },
  );
}

export async function scrollToY(page, y) {
  await page.evaluate((target) => {
    document.documentElement.style.scrollBehavior = "auto";
    window.scrollTo(0, target);
  }, y);
  await page.waitForFunction((target) => Math.abs(window.scrollY - target) < 2, y);
}

export function translateY(matrix) {
  if (!matrix || matrix === "none") return 0;
  const values = matrix.match(/matrix(3d)?\(([^)]+)\)/)[2].split(",").map(Number);
  return values.length === 16 ? values[13] : values[5];
}

async function countKeyPixels(page, clip) {
  const png = await page.screenshot({ clip });
  return page.evaluate(async (base64) => {
    const blob = await (await fetch(`data:image/png;base64,${base64}`)).blob();
    const bitmap = await createImageBitmap(blob);
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext("2d");
    context.drawImage(bitmap, 0, 0);
    const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
    let count = 0;
    for (let index = 0; index < data.length; index += 4) {
      if (data[index] > 150 && data[index + 2] > 150 && data[index + 1] < 100) count += 1;
    }
    return count;
  }, png.toString("base64"));
}

// Share of an element's text that is actually visible on screen: the text is
// painted in a key colour and counted with and without the forest layers that
// can cover it. 1 = fully legible, 0 = completely hidden.
export async function visibleTextShare(page, selector) {
  const keyColour = await page.addStyleTag({
    content: `${selector}, ${selector} * { color: #ff00ff !important; text-shadow: none !important; }`,
  });

  const clip = await page.evaluate((target) => {
    const box = document.querySelector(target).getBoundingClientRect();
    const x = Math.max(0, Math.floor(box.left) - 4);
    const y = Math.max(0, Math.floor(box.top) - 4);
    const right = Math.min(window.innerWidth, Math.ceil(box.right) + 4);
    const bottom = Math.min(window.innerHeight, Math.ceil(box.bottom) + 4);
    return { x, y, width: Math.max(1, right - x), height: Math.max(1, bottom - y) };
  }, selector);

  const visible = await countKeyPixels(page, clip);
  const hideForeground = await page.addStyleTag({
    content:
      '[data-original-layer="middle"], [data-original-layer="near"] { visibility: hidden !important; } .original-main-header::after { display: none !important; }',
  });
  const total = await countKeyPixels(page, clip);

  await hideForeground.evaluate((element) => element.remove());
  await keyColour.evaluate((element) => element.remove());
  return total === 0 ? 0 : visible / total;
}

const luminance = ([red, green, blue]) => {
  const channel = (value) => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(red) + 0.7152 * channel(green) + 0.0722 * channel(blue);
};

// Contrast between an element's text colour and the bright end (95th percentile)
// of whatever is painted behind it — for copy that sits over glows and imagery,
// where axe cannot compute contrast. CSS animations are paused and sampled at
// several phases, and the worst phase is returned.
export async function contrastOverBackground(page, selector, phasesMs = [0, 4000, 8000, 12000]) {
  const element = page.locator(selector).first();
  await element.evaluate((node) => {
    document.documentElement.style.scrollBehavior = "auto";
    node.scrollIntoView({ block: "center" });
  });
  await page.waitForTimeout(1200);

  const textColour = await element.evaluate((node) =>
    getComputedStyle(node).color.match(/[\d.]+/g).slice(0, 3).map(Number),
  );
  const hideText = await page.addStyleTag({
    content: `${selector}, ${selector} * { color: transparent !important; text-shadow: none !important; text-decoration-color: transparent !important; }`,
  });
  const box = await element.boundingBox();
  const viewport = page.viewportSize();
  const clip = {
    x: Math.max(0, box.x),
    y: Math.max(0, box.y),
    width: Math.min(box.width, viewport.width - Math.max(0, box.x)),
    height: Math.min(box.height, viewport.height - Math.max(0, box.y)),
  };

  let worst = Infinity;
  for (const phase of phasesMs) {
    await page.evaluate((time) => {
      for (const animation of document.getAnimations()) {
        if (animation instanceof CSSAnimation && animation.animationName !== "document-scroll-progress") {
          animation.pause();
          animation.currentTime = time;
        }
      }
    }, phase);
    const png = await page.screenshot({ clip });
    const samples = await page.evaluate(async (base64) => {
      const bitmap = await createImageBitmap(await (await fetch(`data:image/png;base64,${base64}`)).blob());
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const context = canvas.getContext("2d");
      context.drawImage(bitmap, 0, 0);
      const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = [];
      for (let index = 0; index < data.length; index += 16) pixels.push([data[index], data[index + 1], data[index + 2]]);
      return pixels;
    }, png.toString("base64"));

    const backgrounds = samples.map(luminance).sort((a, b) => a - b);
    const bright = backgrounds[Math.floor(backgrounds.length * 0.95)];
    const text = luminance(textColour);
    worst = Math.min(worst, (Math.max(text, bright) + 0.05) / (Math.min(text, bright) + 0.05));
  }

  await page.evaluate(() => {
    for (const animation of document.getAnimations()) if (animation instanceof CSSAnimation) animation.play();
  });
  await hideText.evaluate((node) => node.remove());
  return worst;
}

// Share of pixels that differ (any channel by more than `threshold`) between two
// screenshots of the same clip: 0 = identical, 1 = every pixel changed.
export async function changedPixelShare(page, before, after, threshold = 24) {
  return page.evaluate(
    async ({ a, b, limit }) => {
      const read = async (base64) => {
        const bitmap = await createImageBitmap(await (await fetch(`data:image/png;base64,${base64}`)).blob());
        const canvas = document.createElement("canvas");
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const context = canvas.getContext("2d");
        context.drawImage(bitmap, 0, 0);
        return context.getImageData(0, 0, canvas.width, canvas.height).data;
      };
      const [first, second] = await Promise.all([read(a), read(b)]);
      let changed = 0;
      for (let index = 0; index < first.length; index += 4) {
        const delta = Math.max(
          Math.abs(first[index] - second[index]),
          Math.abs(first[index + 1] - second[index + 1]),
          Math.abs(first[index + 2] - second[index + 2]),
        );
        if (delta > limit) changed += 1;
      }
      return changed / (first.length / 4);
    },
    { a: before.toString("base64"), b: after.toString("base64"), limit: threshold },
  );
}
