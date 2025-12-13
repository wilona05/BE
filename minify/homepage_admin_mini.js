document.getElementById("historiReservasi").addEventListener("change",function(event){let selectedElement=event.target
let value=selectedElement.value
let id=selectedElement.id
let cellId=id.replace("row-","")
let cell=document.getElementById(cellId)
fetch("/update_status",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:cellId,status:value})}).then(res=>res.json()).then(result=>{if(result.success){cell.innerHTML=`${value}`
location.reload()}})})