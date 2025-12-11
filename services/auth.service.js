import sqlite3 from "sqlite3";
import { open } from "sqlite";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as bcrypt from 'bcrypt';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPromise = open({
    filename: path.join(process.cwd(), "mydb.sqlite"),
    driver: sqlite3.Database
});

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
        res.writeHead(401, {
            "Content-Type": 'text/plain'                
        });
        return res.end("Email atau password salah");
    }

    const submittedPassword = password; //input dri user
    const storedHash = user.password; //dri DB

    try {
        const isMatch = await bcrypt.compare(submittedPassword, storedHash);
        

        if (!isMatch) {
            console.log(`Login GAGAL untuk ${email}: Password tidak cocok.`);
            res.writeHead(401, { "Content-Type": 'text/plain' });
            return res.end("Email atau password salah");
        }

        console.log(`Login BERHASIL untuk ${email}!`);
        
        // jika user ditemukan dan dibedakan berdasarkan rolenya
        if(user.role === 'admin'){
            res.writeHead(302, {
                "Set-Cookie": [
                    `id_user=${user.id_user}; HttpOnly; Path=/`,
                    `role=${user.role}; HttpOnly; Path=/`
                ],
                "Location": "/homepage_admin"
            })
        }else{
            res.writeHead(302, {
                "Set-Cookie": [
                    `id_user=${user.id_user}; HttpOnly; Path=/`,
                    `role=${user.role}; HttpOnly; Path=/`
                ],
                "Location": "/homepage_user"
            })
        }
        return res.end(); 

    } catch (compareError) {
        console.error("Kesalahan saat membandingkan hash (Internal Error):", compareError);
        res.writeHead(500, { "Content-Type": 'text/plain' });
        return res.end("Terjadi kesalahan server saat memproses login.");
    }   
}