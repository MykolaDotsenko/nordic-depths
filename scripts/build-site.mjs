// Copies only the files the page needs into _site/ (what GitHub Pages serves)
// and fails when the page references a local file that is not in the build.
import { cp, mkdir, readFile, readdir, rm, stat } from "node:fs/promises";
import { dirname, extname, join, posix, relative, resolve } from "node:path";

const root = process.cwd();
const out = resolve(root, "_site");
const SITE_URL = "https://mykoladotsenko.github.io/nordic-depths/";
const quiet = process.argv.includes("--quiet");

const entries = [
  "index.html",
  "css",
  "js",
  "fonts",
  "img",
  "libs/gsap/gsap.min.js",
  "libs/gsap/ScrollTrigger.min.js",
];
const excluded = new Set(["img/source"]);

await rm(out, { recursive: true, force: true });
for (const entry of entries) {
  await mkdir(dirname(join(out, entry)), { recursive: true });
  await cp(join(root, entry), join(out, entry), {
    recursive: true,
    filter: (source) => !excluded.has(relative(root, source).split("\\").join("/")),
  });
}

async function listFiles(dir) {
  const files = [];
  for (const item of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, item.name);
    if (item.isDirectory()) files.push(...(await listFiles(path)));
    else files.push(relative(out, path).split("\\").join("/"));
  }
  return files;
}

const built = new Set(await listFiles(out));
const referenced = new Set();
const missing = [];

function track(fromFile, rawUrl) {
  let url = rawUrl.trim().replace(/^["']|["']$/g, "");
  if (url.startsWith(SITE_URL)) url = url.slice(SITE_URL.length) || "index.html";
  else if (/^(?:[a-z]+:|\/\/|#)/i.test(url) || url === "") return;
  const clean = url.split(/[?#]/)[0];
  if (!clean) return;
  const target = posix.normalize(posix.join(posix.dirname(fromFile), clean));
  referenced.add(target);
  if (!built.has(target)) missing.push(`${fromFile} → ${rawUrl}`);
}

for (const file of built) {
  const ext = extname(file);
  if (![".html", ".css", ".js"].includes(ext)) continue;
  const text = await readFile(join(out, file), "utf8");

  if (ext === ".html") {
    for (const [, value] of text.matchAll(/\s(?:src|href)="([^"]+)"/g)) track(file, value);
    for (const [, value] of text.matchAll(/\scontent="([^"]+)"/g)) {
      if (value.startsWith(SITE_URL)) track(file, value);
    }
    for (const [, value] of text.matchAll(/\s(?:srcset|imagesrcset)="([^"]+)"/g)) {
      for (const candidate of value.split(",")) track(file, candidate.trim().split(/\s+/)[0]);
    }
  }

  if (ext === ".css") {
    for (const [, value] of text.matchAll(/url\(([^)]+)\)/g)) track(file, value);
  }

  if (ext === ".js" && file.startsWith("js/")) {
    for (const [, value] of text.matchAll(/(?:from|import)\s*\(?\s*["'](\.[^"']+)["']/g)) track(file, value);
  }
}

if (missing.length) {
  throw new Error(`Build references missing files:\n  ${missing.join("\n  ")}`);
}

const unreferencedImages = [...built].filter(
  (file) => file.startsWith("img/") && !referenced.has(file),
);
if (unreferencedImages.length) {
  throw new Error(`Images shipped but never referenced:\n  ${unreferencedImages.join("\n  ")}`);
}

let bytes = 0;
for (const file of built) bytes += (await stat(join(out, file))).size;

if (!quiet) {
  process.stdout.write(
    `Built _site: ${built.size} files, ${(bytes / 1_000_000).toFixed(2)} MB, all references resolved.\n`,
  );
}
