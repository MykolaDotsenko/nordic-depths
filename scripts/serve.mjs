import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";

// Usage: node scripts/serve.mjs [root]   (default root: current directory)
const host = process.env.HOST || "127.0.0.1";
const port = Number(process.env.PORT || 4173);
const root = resolve(process.argv[2] || process.cwd());

const mime = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
};

const send = (response, status, body) => {
  response.writeHead(status, { "content-type": "text/plain; charset=utf-8" });
  response.end(body);
};

createServer(async (request, response) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url || "/", "http://localhost").pathname);
  } catch {
    send(response, 400, "Bad request");
    return;
  }

  if (pathname.endsWith("/")) pathname += "index.html";
  const filePath = join(root, normalize(pathname));

  if (!filePath.startsWith(root + sep)) {
    send(response, 404, "Not found");
    return;
  }

  try {
    if (!(await stat(filePath)).isFile()) throw new Error("not a file");
  } catch {
    send(response, 404, "Not found");
    return;
  }

  response.writeHead(200, {
    "content-type": mime[extname(filePath)] || "application/octet-stream",
    // Revalidate on every navigation, but let one page load reuse a response.
    "cache-control": "no-cache",
  });
  createReadStream(filePath).pipe(response);
}).listen(port, host, () => {
  process.stdout.write(`Nordic Depths available at http://${host}:${port} (serving ${root})\n`);
});
