// Renders img/og-image.jpg (1200×630 hero) and the PNG icons from img/icon.svg.
// Usage: node scripts/capture-assets.mjs   (set CHROMIUM_PATH to use a local Chromium)
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { setTimeout as sleep } from "node:timers/promises";
import { chromium } from "@playwright/test";

const port = 4199;
const server = spawn("node", ["scripts/serve.mjs"], {
  env: { ...process.env, PORT: String(port) },
  stdio: "ignore",
});
await sleep(600);

const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
);

try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({ content: "[data-lang-switch] { display: none !important; }" });
  await sleep(400);
  await page.screenshot({ path: "img/og-image.jpg", type: "jpeg", quality: 84 });

  const svg = await readFile("img/icon.svg", "utf8");
  for (const [size, file, square] of [
    [32, "img/icon-32.png", false],
    [180, "img/icon-180.png", true],
  ]) {
    const markup = square ? svg.replace('rx="14" ', "") : svg;
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(
      `<style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${markup}`,
    );
    await page.screenshot({ path: file, omitBackground: true });
  }
} finally {
  await browser.close();
  server.kill();
}
