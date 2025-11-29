import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { url } from "node:inspector/promises";

const server = new http.Server();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

server.on("request", (request, response) => {
    const method = request.method;
    const urlPath = request.url;

    // untuk mengambil assets
    const publicDir = ["css", "script", "assets", "html"];

    for(const folder of publicDir){
        if(urlPath.startsWith( `/${folder}`)){
            const filePath = path.join(__dirname, urlPath);

            fs.readFile(filePath, (err, data) => {
                if(err){
                    response.writeHead(404, { "Content-Type": "text/plain" });
                    response.end("File not found");
                    return;
                }

                const ext = path.extname(filePath);
                const mimes = {
                    ".html": "text/html",
                    ".css": "text/css",
                    ".js": "text/javascript",
                    ".png": "image/png",
                    ".webp": "image/webp",
                }

                response.writeHead(200, { "Content-Type": mimes[ext] || "application/octet-stream" });
                response.end(data);
            });

            return;
        }
    }

    // untuk slash biasa
    if(method === "GET" && urlPath === "/"){
        response.writeHead(301, { "Location": "/login" });
        response.end();
    
        // untuk login
    }else if(method === "GET" && urlPath === "/login"){
        const filePath = path.join(__dirname, 'html', 'login.html');

        fs.readFile(filePath, (err, data) => {
            if(err){
                response.writeHead(500, { 'Content-Type': 'text/plain' });
                response.end('Internal server error');
            }else{
                response.writeHead(200, { 'Content-Type': 'text/html' });
                response.end(data);
            }
        })
    }else if(method === "GET" && urlPath === "/homepage_user"){
        const filePath = path.join(__dirname, 'html', 'homepage_user.html');

        fs.readFile(filePath, (err, data) => {
            if(err){
                response.writeHead(500, { 'Content-Type': 'text/plain' });
                response.end('Internal server error');
            }else{
                response.writeHead(200, { 'Content-Type': 'text/html' });
                response.end(data);
            }
        })
    }else if(method === "GET" && urlPath === "/homepage_admin"){
        const filePath = path.join(__dirname, 'html', 'homepage_admin.html');

        fs.readFile(filePath, (err, data) => {
            if(err){
                response.writeHead(500, { 'Content-Type': 'text/plain' });
                response.end('Internal server error');
            }else{
                response.writeHead(200, { 'Content-Type': 'text/html' });
                response.end(data);
            }
        })
    }else if(method === "GET" && urlPath === "/form"){
        const filePath = path.join(__dirname, 'html', 'form_reservasi.html');

        fs.readFile(filePath, (err, data) => {
            if(err){
                response.writeHead(500, { 'Content-Type': 'text/plain' });
                response.end('Internal server error');
            }else{
                response.writeHead(200, { 'Content-Type': 'text/html' });
                response.end(data);
            }
        })
    }
});

server.listen(8080);
console.log('The server is running! Check it on http://localhost:8080/login');