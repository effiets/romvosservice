
/* v6.5.66 — Δομημένο παραστατικό αποστολής στις Εκκρεμείς Επιστροφές */
(function(){
  const txt=v=>String(v??'').trim();
  const byId=id=>document.getElementById(id);
  const readReturns=()=>{try{return JSON.parse(localStorage.getItem('romvos_pending_returns')||'[]')}catch(e){return []}};
  const writeReturns=a=>{try{localStorage.setItem('romvos_pending_returns',JSON.stringify(a))}catch(e){}};
  const legacyType=x=>txt(x?.documentType)||(txt(x?.deliveryNote)?'ΔΑ — Δελτίο Αποστολής':txt(x?.invoice)?'Τιμολόγιο / Πιστωτικό':'');
  const legacyNumber=x=>txt(x?.documentNumber)||txt(x?.deliveryNote)||txt(x?.invoice);
  const docDisplay=x=>[legacyType(x),txt(x?.documentSeries),legacyNumber(x)].filter(Boolean).join(' • ');

  const oldClear=window.clearReturn;
  if(typeof oldClear==='function') window.clearReturn=function(){
    const r=oldClear.apply(this,arguments);
    ['retDocumentType','retDocumentSeries','retDocumentNumber'].forEach(id=>{const e=byId(id);if(e)e.value=''});
    return r;
  };

  const oldEdit=window.editReturn;
  if(typeof oldEdit==='function') window.editReturn=function(id){
    const r=oldEdit.apply(this,arguments);
    const x=(typeof RETURNS!=='undefined'&&Array.isArray(RETURNS))?RETURNS.find(v=>v.id===id):readReturns().find(v=>v.id===id);
    if(x){
      if(byId('retDocumentType')){const sel=byId('retDocumentType'),val=legacyType(x);if(val&&![...sel.options].some(o=>o.value===val)){const o=document.createElement('option');o.value=val;o.textContent=val+' (παλιά καταχώριση)';sel.appendChild(o)}sel.value=val;}
      if(byId('retDocumentSeries'))byId('retDocumentSeries').value=txt(x.documentSeries);
      if(byId('retDocumentNumber'))byId('retDocumentNumber').value=legacyNumber(x);
    }
    return r;
  };

  const oldSave=window.saveReturn;
  if(typeof oldSave==='function') window.saveReturn=function(){
    const id=byId('retId')?.value||'';
    const documentType=txt(byId('retDocumentType')?.value);
    const documentSeries=txt(byId('retDocumentSeries')?.value);
    const documentNumber=txt(byId('retDocumentNumber')?.value);
    const combined=[documentSeries,documentNumber].filter(Boolean).join(' ');
    // Συμβατότητα με τις παλιές λειτουργίες προβολής / email / Viber.
    const dl=byId('retDeliveryNote'),inv=byId('retInvoice');
    if(dl&&inv){
      const invoiceLike=/τιμολ|πιστω/i.test(documentType);
      dl.value=invoiceLike?'':combined;
      inv.value=invoiceLike?combined:'';
    }
    const beforeIds=new Set(readReturns().map(x=>x.id));
    const r=oldSave.apply(this,arguments);
    try{
      let arr=(typeof RETURNS!=='undefined'&&Array.isArray(RETURNS))?RETURNS:readReturns();
      let target=id?arr.find(x=>x.id===id):arr.find(x=>!beforeIds.has(x.id))||arr[0];
      if(target){
        target.documentType=documentType;
        target.documentSeries=documentSeries;
        target.documentNumber=documentNumber;
        // Κρατάμε τα legacy πεδία για πλήρη συμβατότητα χωρίς απώλεια παλιών δεδομένων.
        if(documentType||documentSeries||documentNumber){
          const invoiceLike=/τιμολ|πιστω/i.test(documentType);
          target.deliveryNote=invoiceLike?'':combined;
          target.invoice=invoiceLike?combined:'';
        }
        writeReturns(arr);
        if(typeof RETURNS!=='undefined')RETURNS=arr;
        try{window.renderReturns?.()}catch(e){}
      }
    }catch(e){}
    return r;
  };

  // Η αναλυτική προβολή δείχνει τα νέα πεδία με σαφήνεια και παραμένει συμβατή με παλιές εγγραφές.
  window.returnDocumentSummary=docDisplay;
  const oldView=window.viewReturn;
  if(typeof oldView==='function') window.viewReturn=function(id){
    const r=oldView.apply(this,arguments);
    try{
      const x=(typeof RETURNS!=='undefined'&&Array.isArray(RETURNS))?RETURNS.find(v=>v.id===id):null;
      const body=byId('returnViewBody'); if(!x||!body)return r;
      const table=body.querySelector('table'); if(!table)return r;
      const rows=[...table.querySelectorAll('tr')];
      const oldDocRow=rows.find(tr=>/Δελτίο Αποστολής/.test(tr.textContent||''));
      if(oldDocRow){
        oldDocRow.innerHTML='<th>Είδος παραστατικού</th><td>'+esc(legacyType(x)||'—')+'</td><th>Σειρά / Αριθμός</th><td>'+esc([txt(x.documentSeries),legacyNumber(x)].filter(Boolean).join(' / ')||'—')+'</td>';
      }
    }catch(e){}
    return r;
  };
})();
