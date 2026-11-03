"use strict";

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const { staticPath } = require('./lib/static-path');
const root = path.resolve(__dirname, "..");
const port = Number(process.env.PORT || 4175);
const types = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
  ".xml": "application/xml; charset=utf-8"
};

http.createServer((request, response) => {
  if (!['GET','HEAD'].includes(request.method)) { response.writeHead(405).end(); return; }
  let file = staticPath(root, request.url);
  if (!file) { response.writeHead(403).end('Forbidden'); return; }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
  const exists = fs.existsSync(file) && fs.statSync(file).isFile();
  if (!exists) file = path.join(root, "404.html");
  response.writeHead(exists ? 200 : 404, { "Content-Type": types[path.extname(file).toLowerCase()] || "application/octet-stream" });
  if(request.method==='HEAD') response.end(); else fs.createReadStream(file).pipe(response);
}).listen(port, "127.0.0.1", () => {
  console.log(`Cristal disponível em http://127.0.0.1:${port}`);
});
