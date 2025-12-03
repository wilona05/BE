import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { URL } from "node:url";
import { fileURLToPath } from "node:url";
import { loginUser } from './services/auth.service.js';
import { createReservation } from "./services/reservation.service.js";

const server = new http.Server();

// untuk mengambil file dan database
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// untuk membaca cookie
function parseCookies(cookieHeader) {
    const cookies = {};

    if (!cookieHeader) return cookies;

    if (Array.isArray(cookieHeader)) { // jika cookie > 1, maka kembalian array
        cookieHeader = cookieHeader.join("; "); // dibuat jadi string dulu
    }

    if (typeof cookieHeader !== "string") return cookies;

    // cookie diformat agar berbentuk string
    cookieHeader.split(";").forEach(cookie => {
        const index = cookie.indexOf("=");
        if (index === -1) return;
        const key = cookie.substring(0, index).trim();
        const value = cookie.substring(index + 1).trim();
        cookies[key] = decodeURIComponent(value);
    });

    return cookies;
}

// untuk mengecek role
function authorizeRole(res, cookies, role){
    if(!cookies.role){ // jika belum login, lempar ke halaman login
        res.writeHead(302, {Location: "/login"});
        res.end();
        return false;
    }

    if(cookies.role !== role){ // jika role salah, lempar ke homepage sesuai role
        const target = cookies.role === "admin" ? "/homepage_admin" : "/homepage_user";
        res.writeHead(302, {Location: target});
        res.end();
        return false;
    }

    return true;
}

server.on("request", (request, response) => {
    const method = request.method;
    const urlPath = request.url;
    // ambil cookie
    const cookies = parseCookies(request.headers.cookie);

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
        return response.end();
    }
    
    // untuk menampilkan halaman login
    if(method === "GET" && urlPath === "/login"){
        if(cookies.role === "admin"){ // kalau sudah login admin, masuk ke homepage admin
            response.writeHead(302, {Location: "/homepage_admin"});
            return response.end();
        }

        if(cookies.role === "user"){ // kalau sudah login user, masuk ke homepage user
            response.writeHead(302, {Location: "/homepage_user"});
            return response.end();
        }

        const filePath = path.join(__dirname, 'html', 'login.html');
        const data = fs.readFileSync(filePath);
        response.writeHead(200, { 'Content-Type': 'text/html' });
        return response.end(data);
    }

    // untuk fitur login
    if(method === "POST" && urlPath === "/login"){
        return loginUser(request, response);
    }

    // untuk menampilkan homepage user
    if(method === "GET" && urlPath === "/homepage_user"){
        if(!authorizeRole(response, cookies, "user")) return; // jika bukan user, return

        const filePath = path.join(__dirname, 'html', 'homepage_user.html');
        const data = fs.readFileSync(filePath);
        response.writeHead(200, { 'Content-Type': 'text/html' });
        return response.end(data);
    }  

    // untuk menampilkan homepage admin
    if(method === "GET" && urlPath === "/homepage_admin"){
        if(!authorizeRole(response, cookies, "admin")) return; // jika bukan admin, return

        const filePath = path.join(__dirname, 'html', 'homepage_admin.html');
        const data = fs.readFileSync(filePath);
        response.writeHead(200, { 'Content-Type': 'text/html' });
        return response.end(data);
    }  

    // untuk logout
    if(method === "GET" && urlPath === "/logout"){
        response.writeHead(302, {
            "Set-Cookie": [
                `id_user=; HttpOnly; Path=/`,
                `role=; HttpOnly; Path=/`
            ],
            "Location": "/login" // lempar ke halaman login
        });
        return response.end();
    }
    
    // untuk menampilkan form
    if (method === "GET" && urlPath.startsWith("/reservation")) {
        if(!authorizeRole(response, cookies, "user")) return;

        const requestUrl = new URL(request.url, `http://${request.headers.host}`);
        const mejaDipilih = requestUrl.searchParams.get("meja");

        console.log("Meja yang dikirim:", mejaDipilih);

        const filePath = path.join(__dirname, 'html', 'form_reservasi.html');
        fs.readFile(filePath, (err, data) => {
            response.writeHead(200, { "Content-Type": "text/html" });
            response.end(data);
        });
    }


    if (method === "POST" && urlPath === "/reservation") {
        return createReservation(request, response);
    }
});

server.listen(8080);
console.log('The server is running! Check it on http://localhost:8080/');