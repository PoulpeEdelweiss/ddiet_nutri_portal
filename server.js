// server.js
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 3000;

const server = http.createServer((req, res) => {
    let url = req.url === '/' ? '/index.html' : req.url;
    // Защита от выхода за папку проекта
    if (url.includes('..')) { res.writeHead(403); return res.end(); }
    
    const filePath = path.join(__dirname, url);
    const ext = path.extname(filePath);
    const mime = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json' }[ext] || 'text/plain';
    
    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404); res.end('Файл не найден');
        } else {
            res.writeHead(200, { 'Content-Type': mime });
            res.end(data);
        }
    });
});

server.listen(PORT, () => console.log(`✅ Готово! Откройте: http://localhost:${PORT}`));