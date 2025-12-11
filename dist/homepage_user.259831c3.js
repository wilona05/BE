async function loadReservation(){try{let e=await fetch("/reservasi-user"),a=await e.json();if(!a||!a.no_meja){document.querySelector(".reservasiDetails").style.display="none";return}currentReservationId=a.id_reservasi,document.querySelector(".reservasiDetails .desc").innerHTML=`
            <div class="descLine">Nomor Meja: ${a.no_meja}</div>
            <div class="descLine">Jumlah Orang: ${a.jmlh_org}</div>
            <div class="descLine">Nomor Kontak: ${a.kontak}</div>
        `,document.querySelector(".confirm-btn").disabled=!0}catch(e){console.error("Gagal load data reservasi:",e)}}async function loadMeja(){try{let e=await fetch("/meja-list"),a=await e.json(),t=document.querySelector(".seatsList");t.innerHTML="",a.forEach(e=>{let a=0===e.available?"disabled":"",n=0===e.available?"unavailable":"";t.innerHTML+=`
                <label class="seatOption ${n}">
                    <input type="radio" name="meja" value="${e.no_meja}" ${a}>
                    <span class="seat">${e.no_meja}</span>
                </label>
            `})}catch(e){console.error("Gagal load data meja:",e)}}document.querySelector(".batal button").addEventListener("click",function(e){e.preventDefault(),document.querySelector(".popUpBatal").style.display="flex"}),document.querySelector(".buttonTidak").addEventListener("click",function(){document.querySelector(".popUpBatal").style.display="none"}),document.querySelector(".buttonYa").addEventListener("click",async function(){currentReservationId&&(await fetch("/batal-reservasi",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id_reservasi:currentReservationId})}),document.querySelector(".popUpBatal").style.display="none",location.reload())}),document.querySelector("form").addEventListener("submit",function(e){document.querySelector("input[name='meja']:checked")||(e.preventDefault(),alert("Silakan pilih meja terlebih dahulu!"))}),window.addEventListener("DOMContentLoaded",()=>{loadReservation(),loadMeja()});
//# sourceMappingURL=homepage_user.259831c3.js.map
