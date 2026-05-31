const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
const BACKEND_PORT = 3000;

// Start backend server
const backend = spawn('node', ['server.js'], {
  cwd: path.join(__dirname, 'school-backend'),
  stdio: 'inherit',
  env: { ...process.env }
});

backend.on('error', (err) => {
  console.error('خطأ في تشغيل الخادم الخلفي:', err.message);
});

// Simple static file server for frontend
const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.pdf': 'application/pdf'
};

const server = http.createServer((req, res) => {
  let filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url);
  const ext = path.extname(filePath);

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(__dirname, 'index.html');
  }

  const contentType = mimeTypes[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  });
});

server.listen(PORT, () => {
  console.log(`\n══════════════════════════════════════════`);
  console.log(`  منصة إدارة المدرسة`);
  console.log(`  El Amir School Management Platform`);
  console.log(`══════════════════════════════════════════`);
  console.log(`  Frontend: http://localhost:${PORT}`);
  console.log(`  Backend:  http://localhost:${BACKEND_PORT}`);
  console.log(`══════════════════════════════════════════\n`);
});

process.on('SIGINT', () => {
  backend.kill();
  server.close();
  process.exit();
});

process.on('SIGTERM', () => {
  backend.kill();
  server.close();
  process.exit();
});
