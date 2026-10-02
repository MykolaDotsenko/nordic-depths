import { access, readFile, readdir, stat } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const read = (file) => readFile(resolve(root, file), "utf8");
const failures = [];
const check = (condition, label) => {
  if (!condition) failures.push(label);
};

const requiredFiles = [
  "index.html",
  "css/main.css",
  "js/app.js",
  "js/original-parallax.js",
  "js/motion-model.js",
  "js/motion.js",
  "js/pointer-depth.js",
  "img/source/layer-base.png",
  "img/source/layer-middle.png",
  "img/source/layer-front.png",
  "img/source/ground.png",
  "img/source/dungeon.jpg",
  "libs/gsap/gsap.min.js",
  "libs/gsap/ScrollTrigger.min.js",
  "ARCHITECTURE.md",
  "MOTION.md",
];

for (const file of requiredFiles) {
  try {
    await access(resolve(root, file));
  } catch {
    failures.push(`missing ${file}`);
  }
}

const [html, css, gsapCore, scrollTrigger] = await Promise.all([
  read("index.html"),
  read("css/main.css"),
  read("libs/gsap/gsap.min.js"),
  read("libs/gsap/ScrollTrigger.min.js"),
]);

// Document basics
check(/<title>[^<]+<\/title>/.test(html), "document title");
check(/name="description"/.test(html), "meta description");
check(/rel="canonical"/.test(html), "canonical URL");
check(/<main id="main-content"/.test(html), "semantic main");
check((html.match(/<h1\b/g) || []).length === 1, "exactly one h1");
check(/property="og:image"[^>]*og-image\.jpg/.test(html), "1200×630 social preview image");
check(!html.includes("\\n"), "no literal escaped newlines in HTML");
check(!html.includes("img/source/"), "page never references the full-size source artwork");

// Preference media
check(/prefers-reduced-motion/.test(css), "reduced-motion CSS");
check(/forced-colors/.test(css), "forced-colors CSS");
check(!/^\s*(?:position|margin-top):\s*center\b/m.test(css), "no invalid legacy center declarations");

// The 2023 parallax ratios are the product's historical contract.
check(/calc\(var\(--original-scroll\) \/ 1\.6\)/.test(css), "original far-layer ratio preserved");
check(/calc\(var\(--original-scroll\) \/ 2\.5\)/.test(css), "original middle-layer ratio preserved");
check(/calc\(var\(--original-scroll\) \/ 5\.7\)/.test(css), "original near-layer ratio preserved");
check(/calc\(var\(--original-scroll\) \/ 2\)/.test(css), "original hero copy ratio preserved");
check(/calc\(var\(--original-scroll\) \/ -7\.5\)/.test(css), "original dungeon copy ratio preserved");

// One GSAP release, not a mix of versions.
const version = (source) => source.match(/\b(?:GSAP|ScrollTrigger) (\d+\.\d+\.\d+)/)?.[1];
check(
  version(gsapCore) && version(gsapCore) === version(scrollTrigger),
  `GSAP core (${version(gsapCore)}) and ScrollTrigger (${version(scrollTrigger)}) versions match`,
);

// Every class used in the markup must be styled somewhere; a deleted rule
// otherwise silently turns designed labels into plain body text.
const cssWithoutUrls = css.replace(/\/\*[\s\S]*?\*\//g, "").replace(/url\([^)]*\)/g, "");
const cssClasses = new Set([...cssWithoutUrls.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)].map((m) => m[1]));
const htmlClasses = new Set(
  [...html.matchAll(/\sclass="([^"]+)"/g)].flatMap((m) => m[1].split(/\s+/).filter(Boolean)),
);
const unstyled = [...htmlClasses].filter((name) => !cssClasses.has(name));
check(unstyled.length === 0, `classes without any CSS rule: ${unstyled.join(", ")}`);

// Image payload: derivatives stay small; sources live in img/source and are not deployed.
let deployedImageBytes = 0;
for (const file of await readdir(resolve(root, "img"))) {
  const path = resolve(root, "img", file);
  const info = await stat(path);
  if (!info.isFile()) continue;
  deployedImageBytes += info.size;
  check(info.size <= 500_000, `img/${file} is ${Math.round(info.size / 1000)} kB (limit 500 kB)`);
}
check(
  deployedImageBytes <= 3_000_000,
  `deployed images total ${(deployedImageBytes / 1e6).toFixed(2)} MB (limit 3 MB)`,
);

if (failures.length) {
  throw new Error(`Static checks failed:\n  - ${failures.join("\n  - ")}`);
}

process.stdout.write(
  `Static checks passed. Deployed image variants: ${(deployedImageBytes / 1_000_000).toFixed(2)} MB.\n`,
);
