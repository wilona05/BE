import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import { Readable } from "node:stream";
import zlib from "node:zlib";

// // https certificate
// const privateKeyPath = path.resolve(import.meta.dirname, "private-key.pem");
// const certificatePath = path.resolve(import.meta.dirname, "certificate.pem");
// const privateKey = fs.readFileSync(privateKeyPath);
// const certificate = fs.readFileSync(certificatePath);

// services
import { loginUser } from './services/auth.service.js';
import { getUserActiveReservation, getAllMeja, batalkanReservasi } from "./services/reservation.service.js";
import { renderAdminPage } from "./services/admin_service.js";
import { handleEditStatus } from "./services/admin_service.js";
import { createReservation } from "./services/reservation.service.js";

// const server = https.Server({
//    key: privateKey,
//    cert: certificate,
// })
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
        if(cookies.role === "admin"){ // kalau sudah login admin, masuk ke homepage admin
            response.writeHead(302, {Location: "/homepage_admin"});
            return response.end();
        }

        if(cookies.role === "user"){ // kalau sudah login user, masuk ke homepage user
            response.writeHead(302, {Location: "/homepage_user"});
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
        if(!authorizeRole(response, cookies, "user")) return; // jika bukan user, return

        const filePath = path.join(__dirname, 'minify', 'homepage_user_mini.html');
        // chunking dan compressing
        return streamCompressed(response, filePath, "text/html");
    }  

    // untuk menampilkan homepage admin
    if(method === "GET" && urlPath === "/homepage_admin"){
        if(!authorizeRole(response, cookies, "admin")) return; // jika bukan admin, return

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

        const filePath = path.join(__dirname, 'minify', 'form_reservasi_mini.html');
        return streamCompressed(response, filePath, "text/html");
    }

    // untuk menambahkan reservasi baru
    if (method === "POST" && urlPath === "/reservation") {
        return createReservation(request, response);
    }

    // untuk menampilkan card reservasi yang aktif di halaman user
    if (method === "GET" && urlPath === "/reservasi-user") {
        const cookies = parseCookies(request.headers.cookie);
        const data = await getUserActiveReservation(cookies.id_user);

        return streamJsonCompressed(request, response, data);
    }

    // untuk menampilkan button2 meja yang available & unavailable
    if (method === "GET" && urlPath === "/meja-list") {
        const meja = await getAllMeja();
        return streamJsonCompressed(request, response, meja);
    }

    // untuk membatalkan reservasi user
    if (method === "POST" && urlPath === "/batal-reservasi") {
        const cookies = parseCookies(request.headers.cookie);
        return batalkanReservasi(request, response, cookies.id_user);
    }
});

server.listen(3000, "127.0.0.1");
// console.log('The server is running! Check it on https://localhost:8080/');
console.log('The server is running! Check it on http://127.0.0.1:3000');
