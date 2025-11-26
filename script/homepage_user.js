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
document.querySelector(".buttonYa").addEventListener("click", function() {
    // Ganti status reservasi jadi "Batal", 
    // secara otomatis elemen "Detail reservasi" akan terhapus 
    // karena hanya yang aktif yang ditampilkan

    //untuk sementara, pakai display="none" dulu
    document.querySelector(".reservasiDetails").style.display = "none";
    //Tutup pop up
    document.querySelector(".popUpBatal").style.display = "none";
});
