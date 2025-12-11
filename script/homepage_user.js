document.querySelector(".batal button").addEventListener("click",function(e){e.preventDefault();document.querySelector(".popUpBatal").style.display="flex"});document.querySelector(".buttonTidak").addEventListener("click",function(){document.querySelector(".popUpBatal").style.display="none"});document.querySelector(".buttonYa").addEventListener("click",async function(){if(!currentReservationId)return;await fetch("/batal-reservasi",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id_reservasi:currentReservationId})});document.querySelector(".popUpBatal").style.display="none";location.reload()});document.querySelector("form").addEventListener("submit",function(e){const selected=document.querySelector("input[name='meja']:checked");if(!selected){e.preventDefault();alert("Silakan pilih meja terlebih dahulu!")}});async function loadReservation(){try{const res=await fetch("/reservasi-user");const data=await res.json();if(!data||!data.no_meja){document.querySelector(".reservasiDetails").style.display="none";return}
currentReservationId=data.id_reservasi;document.querySelector(".reservasiDetails .desc").innerHTML=`
            <div class="descLine">Nomor Meja: ${data.no_meja}</div>
            <div class="descLine">Jumlah Orang: ${data.jmlh_org}</div>
            <div class="descLine">Nomor Kontak: ${data.kontak}</div>
        `;const confirmReserveBtn=document.querySelector(".confirm-btn");confirmReserveBtn.disabled=!0}catch(err){console.error("Gagal load data reservasi:",err)}}
async function loadMeja(){try{const res=await fetch("/meja-list");const list=await res.json();const container=document.querySelector(".seatsList");container.innerHTML="";list.forEach(m=>{const disabled=m.available===0?"disabled":"";const unavailable=m.available===0?"unavailable":"";container.innerHTML+=`
                <label class="seatOption ${unavailable}">
                    <input type="radio" name="meja" value="${m.no_meja}" ${disabled}>
                    <span class="seat">${m.no_meja}</span>
                </label>
            `})}catch(err){console.error("Gagal load data meja:",err)}}
window.addEventListener("DOMContentLoaded",()=>{loadReservation();loadMeja()})