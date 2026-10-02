// Regenerates the WebP derivatives in img/ from the 2023 source artwork in img/source/.
// Requires ImageMagick (`magick` or `convert`) on PATH. Run with: npm run images
import { execFileSync } from "node:child_process";
import { stat } from "node:fs/promises";

const tool = (() => {
  for (const candidate of ["magick", "convert"]) {
    try {
      execFileSync(candidate, ["-version"], { stdio: "ignore" });
      return candidate;
    } catch {
      // try the next binary name
    }
  }
  throw new Error("ImageMagick is required: install it so `magick` or `convert` is on PATH.");
})();

const webp = ["-strip", "-quality", "80", "-define", "webp:alpha-quality=90", "-define", "webp:method=6"];

// The layers are 3840×2160. Portrait screens (aspect ≤ 3:4) only ever show the
// centre 1620px of the width under `object-fit: cover`, so they get a centre crop.
export const LAYERS = ["base", "middle", "front"];
export const LANDSCAPE_WIDTHS = [1280, 1920, 2560, 3840];
export const PORTRAIT_WIDTHS = [810, 1215, 1620];

const jobs = [];

for (const layer of LAYERS) {
  const source = `img/source/layer-${layer}.png`;
  for (const width of LANDSCAPE_WIDTHS) {
    jobs.push([source, ["-resize", `${width}x`], `img/layer-${layer}-${width}.webp`]);
  }
  for (const width of PORTRAIT_WIDTHS) {
    jobs.push([
      source,
      ["-gravity", "center", "-crop", "1620x2160+0+0", "+repage", "-resize", `${width}x`],
      `img/layer-${layer}-portrait-${width}.webp`,
    ]);
  }
}

for (const width of [1920, 2560]) {
  jobs.push(["img/source/ground.png", ["-resize", `${width}x`], `img/ground-${width}.webp`]);
}
jobs.push(["img/source/ground.png", [], "img/ground-3840.webp"]);
jobs.push(["img/source/dungeon.jpg", [], "img/dungeon-1920.webp"]);

let total = 0;
for (const [source, ops, output] of jobs) {
  execFileSync(tool, [source, ...ops, ...webp, output]);
  const { size } = await stat(output);
  total += size;
  process.stdout.write(`${output.padEnd(36)} ${(size / 1000).toFixed(0).padStart(5)} kB\n`);
}
process.stdout.write(`${jobs.length} files, ${(total / 1_000_000).toFixed(2)} MB\n`);
