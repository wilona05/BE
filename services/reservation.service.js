import sqlite3 from "sqlite3";
import { open } from "sqlite";
import path from "node:path";
import { fileURLToPath } from "node:url";

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

// untuk mengubah body dari request POST (yang bentuknya stream) menjadi JSON
// mengembalikan Promise berisi JSON hasil parsing
function parseBodyJSON(request) {
    return new Promise((resolve, reject) => {

        let body = "";
        request.on("data", chunk => {
            body += chunk.toString(); // kumpulkan semua chunk sebagai string
        });
        request.on("end", () => {
            try {
                resolve(JSON.parse(body));
            } catch (err) {
                reject(err);
            }
        });
    });
}

export async function createReservation(req, res) {
    try {
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
            return res.end("Anda harus login terlebih dahulu.");
        }

        // Membuat tanggal
        const date = new Date().toISOString().slice(0, 10);

        // Ambil id_meja berdasarkan no_meja (A1/B2/C3)
        const mejaData = await db.get(
            `SELECT id_meja FROM meja WHERE no_meja = ?`,
            [idMeja]
        );

        if (!mejaData) {
            res.writeHead(400, { "Content-Type": "text/plain" });
            return res.end("Meja tidak ditemukan");
        }

        const id_meja = mejaData.id_meja; // angka dari database

        

        // insert reservasi
        await db.run(
            `INSERT INTO reservasi (id_user, date, id_meja, jmlh_org, kontak, status)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [id_user, date, id_meja, paxInput, telpInput, "aktif"]
        );

        await db.run(
            `UPDATE meja SET available = 0 WHERE id_meja = ?`,
            [id_meja]
        );

        res.writeHead(302, { Location: "/homepage_user" });
        return res.end();

    } catch (err) {
        console.error(err);
        res.writeHead(500, { "Content-Type": "text/plain" });
        return res.end("Terjadi kesalahan saat membuat reservasi");
    }
}



export async function getUserActiveReservation(id_user) {
    const db = await dbPromise;

    const sql = `
        SELECT r.id_reservasi, m.no_meja, r.jmlh_org, r.kontak 
        FROM reservasi r
        JOIN meja m ON r.id_meja = m.id_meja
        WHERE r.id_user = ? 
          AND r.status = 'aktif'
        LIMIT 1
    `;

    return db.get(sql, [id_user]); 
}

export async function getAllMeja() {
    const db = await dbPromise;

    const query = `
        SELECT id_meja, no_meja, available
        FROM meja
        ORDER BY no_meja
    `;

    return db.all(query);
}

export async function batalkanReservasi(req, res, id_user) {
    const body = await parseBodyJSON(req);
    const { id_reservasi} = body;

    const db = await dbPromise;

    try {
         // Ambil id_meja dari reservasi yang dibatalkan
        const reservasi = await db.get(
            `SELECT id_meja 
            FROM reservasi 
            WHERE id_reservasi = ? AND id_user = ?`,
            [id_reservasi, id_user]
        );

        // Kalau database tidak mengembalikan apapun
        if (!reservasi) {
            throw new Error("Reservasi tidak ditemukan atau bukan milik user");
        }

        const id_meja = reservasi.id_meja;

        // Update status reservasi menjadi 'batal'
        await db.run(
            `UPDATE reservasi 
            SET status = 'batal' 
            WHERE id_reservasi = ? 
            AND id_user = ?`,
            [id_reservasi, id_user]
        );
        
        // Update meja menjadi available=1
        await db.run(
            `UPDATE meja SET available = 1 WHERE id_meja = ?`,
            [id_meja]
        );

        res.writeHead(200, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ success: true }));

    } catch (error) {
        console.error(error);
        res.writeHead(500, { "Content-Type": "text/plain" });
        return res.end("Terjadi kesalahan saat membatalkan reservasi");
    }
}

export async function getAllReservations(){
    const db = await dbPromise;
    return db.all("SELECT * FROM users u INNER JOIN reservasi r ON u.id_user = r.id_user INNER JOIN meja m on r.id_meja = m.id_meja;")
};

export async function getTotalReservasi(){
    const db = await dbPromise;
    return db.get("SELECT COUNT(*) AS totalReservasi FROM reservasi;")
};

export async function getReservasiAktif(){
    const db = await dbPromise;
    return db.get("SELECT COUNT(*) AS reservasiAktif FROM reservasi WHERE status=='aktif';")
};

export async function getReservasiSelesai(){
    const db = await dbPromise;
    return db.get("SELECT COUNT(*) AS reservasiSelesai FROM reservasi WHERE status=='selesai';")
};

export async function getReservasiDibatalkan(){
    const db = await dbPromise;
    return db.get("SELECT COUNT(*) AS reservasiDibatalkan FROM reservasi WHERE status=='batal';")
};

export async function getJmlhPemesan(){
    const db = await dbPromise;
    return db.get("SELECT COUNT(DISTINCT u.id_user) AS jmlhPemesan FROM users u inner join reservasi r on u.id_user = r.id_user;")
};

export async function editStatus(id_reservasi, status){
    const db = await dbPromise;
    const query = "UPDATE reservasi SET status = ? WHERE id_reservasi = ?;"
    return db.run(query, [status, id_reservasi])
};

