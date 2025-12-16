import sqlite3 from "sqlite3";
import { open } from "sqlite";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as bcrypt from 'bcrypt';
import zlib from "node:zlib";
import { signToken } from "../utils/jwt.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPromise = open({
    filename: path.resolve(__dirname, "../mydb.sqlite"),
    // filename: path.join(__dirname, "mydb.sqlite"),
    driver: sqlite3.Database
});
console.log("AUTH DB PATH =", path.resolve(__dirname, "../mydb.sqlite"));
function parseBody(req) {
    return new Promise((resolve) => {
        let body = "";
        req.on("data", chunk => body += chunk.toString());
        req.on("end", () => {
            const data = new URLSearchParams(body);
            resolve(Object.fromEntries(data));
        });
    });
}

// untuk compress dan chunking
function streamCompressed(res, status, bodyText){
    res.writeHead(status, {
        "Content-Type": "text/plain",
        "Content-Encoding": "gzip", // pakai algoritma gzip
        "Transfer-Encoding": "chunked"
    });

    const gzip = zlib.createGzip();
    gzip.pipe(res); // compressed dan chunked
    gzip.end(bodyText)
}

export async function loginUser(req, res){
    const body = await parseBody(req);
    const { email, password } = body;

    const db = await dbPromise;
    // ambil dari database
    const user = await db.get(
        "SELECT * FROM users WHERE email = ?",
            [email]
    );

    // jika user tidak ditemukan
    if(!user){
        return streamCompressed(res, 401, "Email atau password salah");
    }

    const submittedPassword = password; //input dri user
    const storedHash = user.password; //dri DB

    try {
        const isMatch = await bcrypt.compare(submittedPassword, storedHash);
        
        if (!isMatch) {
            console.log(`Login GAGAL untuk ${email}: Password tidak cocok.`);
            return streamCompressed(res, 401, "Email atau password salah");
        }

        console.log(`Login BERHASIL untuk ${email}!`);

        // token JWT
        const token = signToken({
            id_user: user.id_user,
            role: user.role
        });

        const redirectTarget =
            user.role === "admin"
                ? "/homepage_admin"
                : "/homepage_user"
        
        res.writeHead(302, {
            "Set-Cookie": `
                auth_token=${token};
                HttpOnly;
                SameSite=Strict;
                Path=/
            `.replace(/\s+/g, ""),
            "Location": redirectTarget
        });

        
        // jika user ditemukan dan dibedakan berdasarkan rolenya
        // if(user.role === 'admin'){
        //     res.writeHead(302, {
        //         "Set-Cookie": [
        //             `id_user=${user.id_user}; HttpOnly; Path=/`,
        //             `role=${user.role}; HttpOnly; Path=/`
        //         ],
        //         "Location": "/homepage_admin"
        //     })
        // }else{
        //     res.writeHead(302, {
        //         "Set-Cookie": [
        //             `id_user=${user.id_user}; HttpOnly; Path=/`,
        //             `role=${user.role}; HttpOnly; Path=/`
        //         ],
        //         "Location": "/homepage_user"
        //     })
        // }
        return res.end(); 

    } catch (compareError) {
        console.error("Kesalahan saat membandingkan hash (Internal Error):", compareError);
        streamCompressed(res, 500, "Terjadi kesalahan server saat memproses login.");
    }   
}