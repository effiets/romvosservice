
/* v6.5.21 — Οι 4 εγγραφές "LIDL HELLAS ΑΝΑΠΤΥΞΗ ..." είναι Περιφέρειες/WH, όχι επαφές ή καταστήματα. */
(function(){
  const REMOVE_IDS=new Set(['CLI-ms500obb03q','CLI-ms500obbspd','CLI-ms500obba5k','CLI-ms500obfdpm']);
  const REMOVE_NAMES=new Set([
    'LIDL HELLAS ΑΝΑΠΤΥΞΗ ΤΡΙΚΑΛΩΝ 350',
    'LIDL HELLAS ΑΝΑΠΤΥΞΗ ΘΕΣΣΑΛΟΝΙΚΗΣ 310',
    'LIDL HELLAS ΑΝΑΠΤΥΞΗ ΑΘΗΝΑΣ 340',
    'LIDL HELLAS ΑΝΑΠΤΥΞΗ ΠΑΤΡΑΣ 380'
  ]);
  try{
    if(Array.isArray(C)){
      const before=C.length;
      C=C.filter(c=>!REMOVE_IDS.has(String(c?.id||'')) && !REMOVE_NAMES.has(String(c?.name||'').trim().toUpperCase()));
      if(C.length!==before){
        try{localStorage.setItem('cf_clients',JSON.stringify(C))}catch(e){}
      }
    }
    if(typeof renderClients==='function')renderClients();
  }catch(e){console.error('v6.5.21 contact cleanup',e)}
})();
