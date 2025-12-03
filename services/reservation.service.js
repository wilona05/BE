import sqlite3 from "sqlite3";
import { open } from "sqlite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPromise = open({
    filename: path.join(__dirname, "..", "data", "mydb.sqlite"),
    driver: sqlite3.Database
});

export async function createReservation(req, res) {
    const body = await parseBody(req);
    const { namaInput, telpInput, paxInput } = body;

    const db = await dbPromise;

    const user = await db.get(
        "SELECT * FROM users WHERE email = ? AND password = ?",
            [email, password]
    );
}


export async function loginUser(req, res){
    const body = await parseBody(req);
    const { email, password } = body;

    const db = await dbPromise;
    // ambil dari database
    const user = await db.get(
        "SELECT * FROM users WHERE email = ? AND password = ?",
            [email, password]
    );

    // jika user tidak ditemukan
    if(!user){
        res.writeHead(401, {
            "Content-Type": 'text/plain'                
        });
        return res.end("Email atau password salah");
    }

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
    res.end();
}