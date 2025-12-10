import { getAllReservations, getReservasiAktif, getReservasiSelesai, getReservasiDibatalkan, getJmlhPemesan, getTotalReservasi, editStatus } from "../services/reservation.service.js";
import fs from "fs/promises";

export async function renderAdminPage(){
    //ambil data dari database
    const { totalReservasi } = await getTotalReservasi()
    const { reservasiAktif } = await getReservasiAktif()
    const { reservasiSelesai } = await getReservasiSelesai()
    const { reservasiDibatalkan } = await getReservasiDibatalkan()
    const { jmlhPemesan } = await getJmlhPemesan()
    const reservations = await getAllReservations()

    //html tabel reservasi 
    const reservationTable = reservations.map(r => {
        const statusReservasi = r.status === "aktif"
            ? `<td id="${r.id_reservasi}">
                    <select name="statusReservasi" id="row-${r.id_reservasi}">
                    <option value="aktif" selected>aktif</option>
                    <option value="selesai">selesai</option>
                    <option value="batal">batal</option>
                    </select>
                </td>`
            : `<td>${r.status}</td>`
        return `
        <tr>
            <td>${r.id_reservasi}</td>
            <td>${r.date}</td>
            <td>${r.nama}</td>
            <td>${r.kontak}</td>
            <td>${r.no_meja}</td>
            <td>${r.jmlh_org}</td>
            ${statusReservasi}
        </tr>
    `}).join("")

    const template = await fs.readFile("./html/homepage_admin.html", "utf8")
    return template
        .replace("{{totalReservasi}}", totalReservasi)
        .replace("{{reservasiAktif}}", reservasiAktif)
        .replace("{{reservasiSelesai}}", reservasiSelesai)
        .replace("{{reservasiDibatalkan}}", reservasiDibatalkan)
        .replace("{{jmlhPemesan}}", jmlhPemesan)
        .replace("{{reservationTable}}", reservationTable)
}

export async function handleEditStatus(request, response){
    let body = ""

    request.on("data", chunk => {
        body += chunk.toString();
    });

    request.on("end", async() => {
        try{
            const { id, status } = JSON.parse(body);
            if(status === "aktif"){
                response.writeHead(400, { "Content-Type": "application/json" });
                return response.end(JSON.stringify({
                    success: false,
                    message: "Status tidak valid"
                }));
            }

            await editStatus(id, status)
            response.writeHead(200, { "Content-Type": "application/json" });
            return response.end(JSON.stringify({ 
                success: true 
            }));
        }catch(err){
            response.writeHead(500, { "Content-Type": "application/json" });
            return response.end(JSON.stringify({
                success: false,
                message: "Internal server error"
            }));
        }
    })
}