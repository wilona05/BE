document.getElementById("historiReservasi").addEventListener("change", function(event){
    let selectedElement = event.target
    let value = selectedElement.value //nilai dropdown yang dipilih
    let id = selectedElement.id  //id dropdown (row-n)
    let cellId = id.replace("row-", "") //hapus row-
    let cell = document.getElementById(cellId) //cell target

    //jika nilai dropdown bukan Aktif, ganti isi cell menjadi nilai tersebut (teks)
    if (value != "Aktif"){ 
        cell.innerHTML = `${value}`
    }
})