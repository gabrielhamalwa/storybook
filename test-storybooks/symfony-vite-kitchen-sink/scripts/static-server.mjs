import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';

const root = resolve(process.argv[2] ?? 'storybook-static');
const port = Number(process.argv[3] ?? 6010);
const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.so': 'application/wasm',
  '.svg': 'image/svg+xml',
  '.wasm': 'application/wasm',
  '.zip': 'application/zip',
};
const contentSecurityPolicy = [
  "base-uri 'self'",
  "connect-src 'self'",
  "default-src 'self'",
  "font-src 'self' data:",
  "img-src 'self' data:",
  "object-src 'none'",
  "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "worker-src 'self'",
].join('; ');

createServer((request, response) => {
  const requestPath = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname);
  let filePath = resolve(root, `.${requestPath}`);

  if (filePath !== root && !filePath.startsWith(`${root}${sep}`)) {
    response.writeHead(403).end();
    return;
  }

  try {
    if (statSync(filePath).isDirectory()) {
      filePath = resolve(filePath, 'index.html');
    }
    const contentType = contentTypes[extname(filePath)] ?? 'application/octet-stream';
    response.writeHead(200, {
      'Content-Security-Policy': contentSecurityPolicy,
      'Content-Type': contentType,
    });
    createReadStream(filePath).pipe(response);
  } catch {
    response.writeHead(404).end();
  }
}).listen(port, '127.0.0.1');
