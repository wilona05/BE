import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { URL } from "node:url";
import { fileURLToPath } from "node:url";
import sqlite3 from "sqlite3";
import { open } from "sqlite";


// services
import { loginUser } from './services/auth.service.js';
import { getUserActiveReservation, getAllMeja, batalkanReservasi } from "./services/reservation.service.js";
import { renderAdminPage } from "./services/admin_service.js";
import { handleEditStatus } from "./services/admin_service.js";
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

function parseBody(request) {
    return new Promise((resolve, reject) => {
        let body = "";

        request.on("data", chunk => {
            body += chunk.toString();
        });

        request.on("end", () => {
            try {
                const parsed = new URLSearchParams(body);
                const result = {};
                for (const [key, value] of parsed.entries()) {
                    result[key] = value;
                }
                resolve(result);
            } catch (err) {
                reject(err);
            }
        });

        request.on("error", reject);
    });
}

const dbPromise = open({
    filename: path.join(__dirname, "mydb.sqlite"),
    driver: sqlite3.Database
});

server.on("request", async(request, response) => {
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

        const data = await renderAdminPage();
        response.writeHead(200, { 'Content-Type': 'text/html' });
        return response.end(data);
    }  

    //admin update status
    if(method === "POST" && urlPath ==="/update_status"){
        if(!authorizeRole(response, cookies, "admin")) return; // jika bukan admin, return
        return await handleEditStatus(request, response);
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
        if (!authorizeRole(response, cookies, "user")) return;

        if (!cookies.id_user) {
            response.writeHead(302, { Location: "/login" });
            return response.end();
        }

        const filePath = path.join(__dirname, 'html', 'form_reservasi.html');
        const data = fs.readFileSync(filePath);
        response.writeHead(200, { "Content-Type": "text/html" });
        return response.end(data);
    }


    if (method === "POST" && urlPath === "/reservation") {
        return createReservation(request, response);
    }


    // untuk menampilkan card reservasi yang aktif di halaman user
    if (method === "GET" && urlPath === "/reservasi-user") {
        const cookies = parseCookies(request.headers.cookie);


        if (!cookies.id_user) {
            response.writeHead(401, { "Content-Type": "text/plain" });
            return response.end("No user ID in cookie");
        }

        const data = await getUserActiveReservation(cookies.id_user);

        response.writeHead(200, { "Content-Type": "application/json" });
        return response.end(JSON.stringify(data || {}));
    }

    // untuk menampilkan button2 meja yang available & unavailable
    if (method === "GET" && urlPath === "/meja-list") {
        const cookies = parseCookies(request.headers.cookie);

        if (!cookies.id_user) {
            response.writeHead(401, { "Content-Type": "text/plain" });
            return response.end("No user ID in cookie");
        }

        const meja = await getAllMeja();

        response.writeHead(200, { "Content-Type": "application/json" });
        return response.end(JSON.stringify(meja));
    }

    // untuk membatalkan reservasi user
    if (method === "POST" && urlPath === "/batal-reservasi") {
        const cookies = parseCookies(request.headers.cookie);

        if (!cookies.id_user) {
            response.writeHead(401, { "Content-Type": "text/plain" });
            return response.end("No user ID in cookie");
        }

        return batalkanReservasi(request, response, cookies.id_user);
    }
});

server.listen(8080);
console.log('The server is running! Check it on http://localhost:8080/');