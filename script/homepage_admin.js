document.getElementById("historiReservasi").addEventListener("change", function(event){
    let selectedElement = event.target
    let value = selectedElement.value //nilai dropdown yang dipilih
    let id = selectedElement.id  //id dropdown (row-n)
    let cellId = id.replace("row-", "") //hapus row-
    let cell = document.getElementById(cellId) //cell target

    //jika nilai dropdown bukan Aktif, ganti isi cell menjadi nilai tersebut (teks)
    // if (value != "aktif"){ 
    //     cell.innerHTML = `${value}`
    // }

    //kirim update status ke server
    fetch("/update_status", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Transfer-Encoding": "chunked" },
        body: JSON.stringify({ id: cellId, status: value })
    })
    //terima response dari server
    .then(res => res.json())
    .then(result => {
        if(result.success){
            cell.innerHTML = `${value}`
            location.reload()
        }
    })
})