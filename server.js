import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Readable } from "node:stream";
import zlib from "node:zlib";
import { verifyToken } from "./utils/jwt.js";

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

// untuk compress dan chunking
function streamCompressed(res, filePath, contentType){
    res.writeHead(200, {
        "Content-Type": contentType,
        "Content-Encoding": "gzip" // pakai algoritma gzip
    });

    const fileStream = fs.createReadStream(filePath);
    const gzip = zlib.createGzip();

    fileStream.pipe(gzip).pipe(res); // compressed dan chunked
}

// untuk compress dan chunking json
function streamJsonCompressed(req, res, data) {
    // untuk reservasi, kirim data reservasi aktif. kalau ga ada reservasi aktif, kirim JSON kosong {}
    const json = JSON.stringify(data || {});
    const source = Readable.from(json);

    const acceptEncoding = req.headers["accept-encoding"] || ""; // pastikan terima encoding

    if (acceptEncoding.includes("gzip")) { // kalau terima gzip
        res.writeHead(200, {
            "Content-Type": "application/json",
            "Content-Encoding": "gzip"
        });

        const gzip = zlib.createGzip();
        source.pipe(gzip).pipe(res);

    } else { // kalau tidak terima gzip
        res.writeHead(200, {
            "Content-Type": "application/json"
        });

        source.pipe(res);
    }
}

// untuk mengambil cookie setelah di-encrypt
function getAuthUser(cookies) {
    if (!cookies.auth_token) return null;

    try {
        return verifyToken(cookies.auth_token);
    } catch {
        return null;
    }
}

server.on("request", async(request, response) => {
    const method = request.method;
    const urlPath = request.url;
    // ambil cookie
    const cookies = parseCookies(request.headers.cookie);

    // untuk mengambil assets
    const publicDir = ["assets", "minify"];
    for(const folder of publicDir){
        if(urlPath.startsWith( `/${folder}`)){
            const filePath = path.join(__dirname, urlPath);

            const ext = path.extname(filePath);
            const mimes = {
                ".html": "text/html",
                ".css": "text/css",
                ".js": "text/javascript",
                ".png": "image/png",
                ".webp": "image/webp",
            }

            if([".html", ".css", ".js"].includes(ext)){
                return streamCompressed(response, filePath, mimes[ext]);
            }

            response.writeHead(200, { "Content-Type": mimes[ext] || "application/octet-stream" });
            const stream = fs.createReadStream(filePath);
            return stream.pipe(response);
        }
    }

    // untuk slash biasa
    if(method === "GET" && urlPath === "/"){
        response.writeHead(301, { "Location": "/login" });
        return response.end();
    }
    
    // untuk menampilkan halaman login
    if(method === "GET" && urlPath === "/login"){
        const user = getAuthUser(cookies);
        if(user){
            const target = user.role === "admin"
                ? "/homepage_admin"
                : "/homepage_user";

            response.writeHead(302, { Location: target });
            return response.end();
        }

        const filePath = path.join(__dirname, 'minify', 'login_mini.html');
        // chunking dan compressing
        return streamCompressed(response, filePath, "text/html");
    }

    // untuk fitur login
    if(method === "POST" && urlPath === "/login"){
        return loginUser(request, response);
    }

    // untuk menampilkan homepage user
    if(method === "GET" && urlPath === "/homepage_user"){
        const user = getAuthUser(cookies);
        if(!user){
            response.writeHead(302, { Location: "/login" });
            return response.end();
        }

        if(user.role !== "user"){
            response.writeHead(302, { Location: "/homepage_admin" });
            return response.end();
        };
        // if(!authorizeRole(response, cookies, "user")) return; // jika bukan user, return

        const filePath = path.join(__dirname, 'minify', 'homepage_user_mini.html');
        // chunking dan compressing
        return streamCompressed(response, filePath, "text/html");
    }  

    // untuk menampilkan homepage admin
    if(method === "GET" && urlPath === "/homepage_admin"){
        const user = getAuthUser(cookies);
        if(!user){
            response.writeHead(302, { Location: "/login" });
            return response.end();
        }

        if(user.role !== "admin"){
            response.writeHead(302, { Location: "/homepage_user" });
            return response.end();
        };
        // if(!authorizeRole(response, cookies, "admin")) return; // jika bukan admin, return

        const html = await renderAdminPage();
        const stream = Readable.from(html); //readable stream dari string html
        const gzip = zlib.createGzip(); 
        response.writeHead(200, { 
            "Content-Type": "text/html",
            "Content-Encoding": "gzip",
            "Transfer-Encoding": "chunked"
        });
        // return response.end(data);
        stream.pipe(gzip).pipe(response);
    }  

    // admin update status
    if(method === "POST" && urlPath ==="/update_status"){
        const user = getAuthUser(cookies);
        if(user.role !== "admin"){
            response.writeHead(302, { Location: "/homepage_user" });
            return response.end();
        };
        // if(!authorizeRole(response, cookies, "admin")) return; // jika bukan admin, return
        return await handleEditStatus(request, response);
    }

    // untuk logout
    if(method === "GET" && urlPath === "/logout"){
        response.writeHead(302, {
            "Set-Cookie": [
                `auth_token=; HttpOnly; Path=/; Max-Age=0`
            ],
            "Location": "/login" // lempar ke halaman login
        });
        return response.end();
    }
    
    // untuk menampilkan form
    if (method === "GET" && urlPath.startsWith("/reservation")) {
        const user = getAuthUser(cookies);
        if(!user){
            response.writeHead(302, { Location: "/login" });
            return response.end();
        }

        if(user.role !== "user"){
            response.writeHead(302, { Location: "/homepage_admin" });
            return response.end();
        };
        // if (!authorizeRole(response, cookies, "user")) return;

        const filePath = path.join(__dirname, 'minify', 'form_reservasi_mini.html');
        return streamCompressed(response, filePath, "text/html");
    }

    // untuk menambahkan reservasi baru
    if (method === "POST" && urlPath === "/reservation") {
        return createReservation(request, response);
    }

    // untuk menampilkan card reservasi yang aktif di halaman user
    if (method === "GET" && urlPath === "/reservasi-user") {
        // const cookies = parseCookies(request.headers.cookie);
        const user = getAuthUser(cookies);
        if(!user){
            response.writeHead(401);
            return response.end();
        }
        const data = await getUserActiveReservation(user.id_user);
        return streamJsonCompressed(request, response, data);
    }

    // untuk menampilkan button2 meja yang available & unavailable
    if (method === "GET" && urlPath === "/meja-list") {
        const meja = await getAllMeja();
        return streamJsonCompressed(request, response, meja);
    }

    // untuk membatalkan reservasi user
    if (method === "POST" && urlPath === "/batal-reservasi") {
        const user = getAuthUser(cookies);
        if(!user){
            response.writeHead(302, { Location: "/login" });
            return response.end();
        }

        return batalkanReservasi(request, response, user.id_user);
    }
});

server.listen(3000, "127.0.0.1");
// console.log('The server is running! Check it on https://localhost:8080/');
console.log('The server is running! Check it on http://127.0.0.1:3000');