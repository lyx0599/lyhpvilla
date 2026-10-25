import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { realpath, stat } from "node:fs/promises";
import { extname, isAbsolute, relative, resolve, sep } from "node:path";

const argument = (name, fallback) => {
  const index = process.argv.indexOf(name);
  return index < 0 ? fallback : process.argv[index + 1];
};
const root = await realpath(resolve(argument("--dir", ".next-build")));
const port = Number(argument("--port", "3210"));
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error("Invalid local preview port");
await stat(resolve(root, "model-preview/index.html"));
const types = {
  ".html": "text/html; charset=utf-8", ".txt": "text/plain; charset=utf-8",
  ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png",
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp",
  ".avif": "image/avif", ".ico": "image/x-icon", ".woff2": "font/woff2",
  ".woff": "font/woff", ".glb": "model/gltf-binary", ".gltf": "model/gltf+json",
  ".hdr": "application/octet-stream", ".bin": "application/octet-stream"
};
const insideRoot = (path) => {
  const child = relative(root, path);
  return child !== ".." && !child.startsWith(`..${sep}`) && !isAbsolute(child);
};
createServer(async (request, response) => {
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { Allow: "GET, HEAD" }); response.end(); return;
  }
  try {
    const url = new URL(request.url, "http://127.0.0.1");
    let path = resolve(root, `.${decodeURIComponent(url.pathname)}`);
    if (!insideRoot(path)) throw new Error("outside preview");
    if ((await stat(path)).isDirectory()) path = resolve(path, "index.html");
    path = await realpath(path);
    if (!insideRoot(path)) throw new Error("outside preview");
    const info = await stat(path);
    if (!info.isFile()) throw new Error("not a file");
    response.writeHead(200, {
      "Content-Type": types[extname(path)] ?? "application/octet-stream",
      "Content-Length": info.size,
      // No stale HTML after rebuilding; Next's content-hashed assets can cache.
      "Cache-Control": url.pathname.startsWith("/_next/static/") ? "public, max-age=31536000, immutable" : "no-cache",
      "X-Content-Type-Options": "nosniff"
    });
    if (request.method === "HEAD") response.end();
    else createReadStream(path).on("error", () => response.destroy()).pipe(response);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Local preview file not found");
  }
}).listen(port, "127.0.0.1", () => {
  console.log(`Local production preview: http://127.0.0.1:${port}/model-preview/?floor=1F\nServing only ${root}`);
});
