#!/usr/bin/env node
/* Tiny static server for the built app, so it can run on its own port
   (e.g. 8008) next to Apache on the cPanel server. No dependencies.

   Usage:   node serve.cjs [port]        (default: PORT env or 8008)
   Serves:  the folder this file is in when it holds index.html (the deploy
            copies this file into the build), otherwise ../dist (in the repo).

   Unknown paths without a file extension (e.g. /dashboard) get index.html so
   the app's own routing handles them. Files are read from disk on every
   request, so a new deploy shows up without restarting the server. */

const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.argv[2] || process.env.PORT || 8008);
const HOST = process.env.HOST || "0.0.0.0";
const ROOT = path.resolve(
  process.env.ROOT ||
    (fs.existsSync(path.join(__dirname, "index.html")) ? __dirname : path.join(__dirname, "..", "dist"))
);
const INDEX = path.join(ROOT, "index.html");

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
};

// Never served: dotfiles (.htaccess …), this script, logs
const HIDDEN = /(^|\/)\.|\.cjs$|\.log$/i;

function sendFile(req, res, file, cacheControl) {
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      return res.end("Not found");
    }
    res.writeHead(200, {
      "Content-Type": TYPES[path.extname(file).toLowerCase()] || "application/octet-stream",
      "Content-Length": st.size,
      "Cache-Control": cacheControl,
      "X-Content-Type-Options": "nosniff",
    });
    if (req.method === "HEAD") return res.end();
    fs.createReadStream(file)
      .on("error", () => res.destroy())
      .pipe(res);
  });
}

const server = http.createServer((req, res) => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405, { Allow: "GET, HEAD" });
    return res.end();
  }

  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  } catch {
    res.writeHead(400);
    return res.end();
  }

  // Resolve inside ROOT only (no ../ escapes)
  const rel = path.normalize(pathname).replace(/^[/\\]+/, "");
  const file = path.join(ROOT, rel);
  if (pathname.includes("\0") || (file !== ROOT && !file.startsWith(ROOT + path.sep))) {
    res.writeHead(403);
    return res.end();
  }
  if (HIDDEN.test(rel.split(path.sep).join("/"))) {
    res.writeHead(404);
    return res.end();
  }

  fs.stat(file, (err, st) => {
    if (!err && st.isFile()) {
      // Hashed build files never change; everything else is re-checked
      const immutable = rel.split(path.sep)[0] === "assets";
      return sendFile(req, res, file, immutable ? "public, max-age=31536000, immutable" : "no-cache");
    }
    // A missing file (has an extension) is a real 404; any other path is an app route
    if (path.extname(rel)) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      return res.end("Not found");
    }
    sendFile(req, res, INDEX, "no-cache");
  });
});

server.on("error", (err) => {
  console.error(`[serve] ${err.code === "EADDRINUSE" ? `port ${PORT} is already in use` : err.message}`);
  process.exit(1);
});

server.listen(PORT, HOST, () => {
  console.log(`[serve] ${ROOT} -> http://${HOST}:${PORT}`);
});
