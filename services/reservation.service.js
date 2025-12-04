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

export async function createReservation(req, res) {
    const body = await parseBody(req);
    const { namaInput, telpInput, paxInput, idMeja } = body;

    const db = await dbPromise;

    // Ambil cookie untuk id_user
    const cookieHeader = req.headers.cookie || "";
    const cookies = Object.fromEntries(
        cookieHeader.split("; ").map(c => c.split("="))
    );

    const id_user = cookies.id_user;

    if (!id_user) {
        res.writeHead(401, { "Content-Type": "text/plain" });
        return res.end("Anda harus login terlebih dahulu");
    }

    // Membuat tanggal
    const now = new Date();
    const date = now.toISOString().slice(0, 10);

    // Insert ke tabel reservasi
    try {
        await db.run(
            `INSERT INTO reservasi (id_user, date, id_meja, jmlh_org, kontak, status)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
                id_user,
                date,     // format yyyy-mm-dd
                idMeja,        // id meja
                paxInput,      // jumlah org
                telpInput,     // kontak
                "pending"      // status default
            ]
        );

        res.writeHead(302, {
            "Location": "/reservation"
        });
        return res.end();

    } catch (err) {
        console.error(err);
        res.writeHead(500, { "Content-Type": "text/plain" });
        return res.end("Terjadi kesalahan saat membuat reservasi");
    }
}
