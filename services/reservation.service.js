import sqlite3 from "sqlite3";
import { open } from "sqlite";
import path from "path";
import { fileURLToPath } from "url";

// Setup DB connection
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPromise = open({
    filename: path.join(__dirname, "..", "data", "mydb.sqlite"),
    driver: sqlite3.Database
});

export async function getAllReservations(){
    const db = await dbPromise;
    return db.all("SELECT * FROM reservasi r INNER JOIN users u ON r.id_user = u.id_user;")
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
    return db.get("SELECT COUNT(DISTINCT id_user) AS jmlhPemesan FROM users;")
};

export async function editStatus(id_reservasi, status){
    const db = await dbPromise;
    const query = "UPDATE reservasi SET status = ? WHERE id_reservasi = ?;"
    return db.run(query, [status, id_reservasi])
};