
function backupAllRomvosData(){
  try{
    const data={};
    for(let i=0;i<localStorage.length;i++){
      const k=localStorage.key(i);
      data[k]=localStorage.getItem(k);
    }
    const payload={
      app:"ROMVOS SERVICE",
      createdAt:new Date().toISOString(),
      storage:data
    };
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});
    const d=new Date();
    const stamp=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")+
      "_"+String(d.getHours()).padStart(2,"0")+"-"+String(d.getMinutes()).padStart(2,"0");
    const a=document.createElement("a");
    a.href=URL.createObjectURL(blob);
    a.download="ROMVOS_BACKUP_"+stamp+".json";
    document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(a.href),1500);
    alert("Το backup αποθηκεύτηκε.\n\nΑρχείο: ROMVOS_BACKUP_"+stamp+".json\n\nΚράτησέ το σε ασφαλές σημείο.");
  }catch(e){
    alert("Δεν ήταν δυνατή η δημιουργία backup: "+e.message);
  }
}
function restoreAllRomvosData(input){
  const file=input.files&&input.files[0];
  if(!file)return;
  const reader=new FileReader();
  reader.onload=function(){
    try{
      const payload=JSON.parse(reader.result);
      if(!payload || payload.app!=="ROMVOS SERVICE" || !payload.storage || typeof payload.storage!=="object"){
        throw new Error("Το αρχείο δεν είναι έγκυρο ROMVOS backup.");
      }
      const count=Object.keys(payload.storage).length;
      if(!confirm("Θα επαναφερθούν "+count+" αποθηκευμένες εγγραφές από το backup.\n\nΤα τωρινά δεδομένα της εφαρμογής θα αντικατασταθούν.\n\nΣυνέχεια;")){
        input.value="";return;
      }
      // Clear only after validation and explicit confirmation.
      localStorage.clear();
      Object.entries(payload.storage).forEach(([k,v])=>localStorage.setItem(k,v));
      alert("Η επαναφορά ολοκληρώθηκε επιτυχώς.\nΗ εφαρμογή θα ανοίξει ξανά με τα αποθηκευμένα δεδομένα.");
      location.reload();
    }catch(e){
      alert("Η επαναφορά δεν έγινε.\n"+e.message);
      input.value="";
    }
  };
  reader.onerror=function(){alert("Δεν ήταν δυνατή η ανάγνωση του αρχείου backup.");input.value=""};
  reader.readAsText(file);
}
