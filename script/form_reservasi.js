document.addEventListener("DOMContentLoaded", () => {
    // mengambil data meja yang sudah dipilih
    const params = new URLSearchParams(window.location.search);
    const meja = params.get("meja");  

    const chosenTableDiv = document.getElementById("chosenTable");
    chosenTableDiv.textContent = meja ? `Meja yang dipilih: ${meja}` : "Meja tidak ditemukan";

    // mengatur kapasitas meja
    const kapasitasMeja = {
        // A row
        A1: 4, A2: 4,

        // B row
        B1: 2, B2: 2, B3: 2, B4: 2,

        // C row
        C1: 6, C2: 6
    };

    const paxInput = document.getElementById("paxInput");

    if (meja && kapasitasMeja[meja]) {
        const maxCap = kapasitasMeja[meja];
        paxInput.max = maxCap;

        // optional: placeholder update
        paxInput.placeholder = `Maks ${maxCap} orang`;

        console.log("Meja:", meja, "kapasitas:", maxCap);
    }


    const telpInput = document.getElementById("telpInput");
    telpInput.addEventListener('input', function(event) {
        event.target.value = event.target.value.replace(/[^0-9]/g, '');
    });


    document.getElementById("chosenTable").innerText = `Meja yang dipilih: ${meja}`;
    document.getElementById("idMeja").value = meja;

});
