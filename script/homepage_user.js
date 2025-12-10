// Buka pop up konfirmasi membatalkan reservasi
document.querySelector(".batal button").addEventListener("click", function(e) {
    e.preventDefault();
    document.querySelector(".popUpBatal").style.display = "flex";
});

// Close pop up (Tidak membatalkan reservasi)
document.querySelector(".buttonTidak").addEventListener("click", function() {
    document.querySelector(".popUpBatal").style.display = "none";
});

// Batalkan reservasi
document.querySelector(".buttonYa").addEventListener("click", async function() {
    // Jika sekarang tidak ada reservasi, tidak melakukan apa-apa
    if (!currentReservationId) return;

    // Membatalkan reservasi dengan id reservasi ini
    await fetch("/batal-reservasi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_reservasi: currentReservationId })
    });

    //Tutup pop up
    document.querySelector(".popUpBatal").style.display = "none";

    //Reload halaman untuk menampilkan data yang baru
    location.reload();
});

//pastikan meja sudah dipilih sebelum konfirmasi reservasi
document.querySelector("form").addEventListener("submit", function(e) {
    const selected = document.querySelector("input[name='meja']:checked");

    if (!selected) {
        e.preventDefault(); // cegah submit
        alert("Silakan pilih meja terlebih dahulu!");
    }
});

//Load reservasi dari server
async function loadReservation() {
    try {
        const res = await fetch("/reservasi-user");
        
        const data = await res.json();

        // Kalau tidak ada reservasi aktif, hide card ini
        if (!data || !data.no_meja) {
            document.querySelector(".reservasiDetails").style.display = "none";
            return;
        }

        // simpan id reservasi untuk fungsi pembatalan
        currentReservationId = data.id_reservasi;

        // Kalau ada reservasi, tampilkan datanya
        document.querySelector(".reservasiDetails .desc").innerHTML = `
            <div class="descLine">Nomor Meja: ${data.no_meja}</div>
            <div class="descLine">Jumlah Orang: ${data.jmlh_org}</div>
            <div class="descLine">Nomor Kontak: ${data.kontak}</div>
        `;
        //Pastikan tidak bisa reservasi jika sudah memiliki reservasi yang aktif
        const confirmReserveBtn = document.querySelector(".confirm-btn");
        confirmReserveBtn.disabled = true;
    } catch (err) {
        console.error("Gagal load data reservasi:", err);
    }
}

async function loadMeja() {
    try {
        const res = await fetch("/meja-list");
        const list = await res.json();

        const container = document.querySelector(".seatsList");
        container.innerHTML = "";

        list.forEach(m => {
            const disabled = m.available === 0 ? "disabled" : "";
            const unavailable = m.available === 0 ? "unavailable" : "";

            container.innerHTML += `
                <label class="seatOption ${unavailable}">
                    <input type="radio" name="meja" value="${m.no_meja}" ${disabled}>
                    <span class="seat">${m.no_meja}</span>
                </label>
            `;
        });
    } catch (err) {
        console.error("Gagal load data meja:", err);
    }
}


window.addEventListener("DOMContentLoaded", () => {
    loadReservation();  //load kartu reservasi
    loadMeja();         //load meja2 available & unavailable
});