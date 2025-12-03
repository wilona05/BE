document.querySelector(".login_form").addEventListener("submit", async (e) =>{
    e.preventDefault();

    const form = new FormData(e.target);

    const response = await fetch("/login", {
        method: "POST",
        body: new URLSearchParams(form)
    });

    const json = await response.json();

    if(json.sucess){
        window.location.href = "/homepage";
    }else{
        alert("Wrong email or password!");
    }
})