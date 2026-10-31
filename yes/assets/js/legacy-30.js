
/* v6.5.50 — Μοντέλο μηχανήματος / εξοπλισμού στις Εκκρεμείς Επιστροφές */
(function(){
  const txt=v=>String(v??'').trim();

  // Ensure old/new save/edit functions always carry the model field.
  const oldClear=window.clearReturn;
  if(typeof oldClear==='function'){
    window.clearReturn=function(){
      const r=oldClear.apply(this,arguments);
      const el=document.getElementById('retModel'); if(el)el.value='';
      return r;
    };
  }

  const oldEdit=window.editReturn;
  if(typeof oldEdit==='function'){
    window.editReturn=function(id){
      const r=oldEdit.apply(this,arguments);
      const x=(typeof RETURNS!=='undefined'&&Array.isArray(RETURNS))?RETURNS.find(v=>v.id===id):null;
      const el=document.getElementById('retModel');
      if(el)el.value=txt(x?.model);
      return r;
    };
  }

  const oldSave=window.saveReturn;
  if(typeof oldSave==='function'){
    window.saveReturn=function(){
      const id=document.getElementById('retId')?.value||'';
      const model=txt(document.getElementById('retModel')?.value);
      const r=oldSave.apply(this,arguments);
      try{
        let arr=(typeof RETURNS!=='undefined'&&Array.isArray(RETURNS))?RETURNS:[];
        let target=id?arr.find(x=>x.id===id):arr[0];
        if(target){
          target.model=model;
          localStorage.setItem('romvos_pending_returns',JSON.stringify(arr));
        }
      }catch(e){}
      return r;
    };
  }

  // Final single-return Viber: include model only when filled.
  window.viberReturn=function(id){
    const x=(typeof RETURNS!=='undefined'&&Array.isArray(RETURNS))?RETURNS.find(r=>r&&r.id===id):null;
    if(!x)return;
    const fmt=v=>{
      const s=txt(v); if(!s)return '—';
      const m=s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      return m?`${m[3]}/${m[2]}/${m[1]}`:s;
    };
    const lines=[
      '🔄 Εκκρεμής επιστροφή','',
      `👤 Επαφή: ${txt(x.contact)||'—'}`,
      `📦 Τι στείλαμε: ${txt(x.sentItem)||'—'}`
    ];
    if(txt(x.model)) lines.push(`🏷️ Μοντέλο: ${txt(x.model)}`);
    if(txt(x.partCode)) lines.push(`🔢 Κωδικός ανταλλακτικού: ${txt(x.partCode)}`);
    if(txt(x.serial)) lines.push(`🔎 Serial Number: ${txt(x.serial)}`);
    lines.push(`📅 Πότε το στείλαμε: ${fmt(x.sendDate)}`);
    lines.push(`↩️ Τι περιμένουμε πίσω: ${txt(x.expectedItem)||'—'}`);
    if(txt(x.deliveryNote))lines.push(`📄 Δελτίο Αποστολής: ${txt(x.deliveryNote)}`);
    if(txt(x.invoice))lines.push(`🧾 Τιμολόγιο / Πιστωτικό: ${txt(x.invoice)}`);
    if(txt(x.notes))lines.push(`💬 Σημειώσεις: ${txt(x.notes)}`);
    const full=lines.join('\n');
    const short=[txt(x.contact),txt(x.sentItem)].filter(Boolean).join(' — ')||'Εκκρεμής επιστροφή';
    if(typeof viberSend==='function')viberSend(full,short);
    else if(typeof copyTextSafe==='function')copyTextSafe(full).then(()=>alert('Το μήνυμα αντιγράφηκε στο πρόχειρο.'));
  };

  // Final formal email builders.
  function fmtDate(v){
    const s=txt(v); if(!s)return '';
    const m=s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return m?`${m[3]}/${m[2]}/${m[1]}`:s;
  }
  function itemBlock(x,i,showContact){
    const L=[`${i}. ${txt(x.sentItem)||'Εκκρεμής επιστροφή'}`];
    if(showContact && txt(x.contact)) L.push(`   Επαφή: ${txt(x.contact)}`);
    if(txt(x.model)) L.push(`   Μοντέλο μηχανήματος / εξοπλισμού: ${txt(x.model)}`);
    if(txt(x.partCode)) L.push(`   Κωδικός ανταλλακτικού: ${txt(x.partCode)}`);
    if(txt(x.serial)) L.push(`   Serial Number: ${txt(x.serial)}`);
    if(txt(x.sendDate)) L.push(`   Ημερομηνία αποστολής: ${fmtDate(x.sendDate)}`);
    if(txt(x.expectedItem)) L.push(`   Αναμένουμε να επιστραφεί: ${txt(x.expectedItem)}`);
    if(txt(x.deliveryNote)) L.push(`   Δελτίο Αποστολής: ${txt(x.deliveryNote)}`);
    if(txt(x.invoice)) L.push(`   Τιμολόγιο / Πιστωτικό: ${txt(x.invoice)}`);
    if(txt(x.documentDate)) L.push(`   Ημερομηνία παραστατικού: ${fmtDate(x.documentDate)}`);
    if(txt(x.tracking)) L.push(`   Voucher / Tracking / Φορτωτική: ${txt(x.tracking)}`);
    if(txt(x.notes)) L.push(`   Σημειώσεις: ${txt(x.notes)}`);
    return L.join('\n');
  }
  function buildBody(items){
    const contacts=[...new Set(items.map(x=>txt(x.contact)).filter(Boolean))];
    const showContact=contacts.length>1;
    const opening=items.length===1
      ? 'Αγαπητέ συνεργάτη, παρακαλώ για την ενημέρωσή μας σχετικά με την πορεία της παρακάτω εκκρεμότητας.'
      : 'Αγαπητέ συνεργάτη, παρακαλώ για την ενημέρωσή μας σχετικά με την πορεία των παρακάτω εκκρεμοτήτων.';
    return [opening,'',items.map((x,i)=>itemBlock(x,i+1,showContact)).join('\n\n')].join('\n');
  }
  function selectedItems(){
    const ids=[];
    document.querySelectorAll('#returnsBody .return-select:checked').forEach(cb=>{
      const s=cb.getAttribute('onchange')||'';
      const m=s.match(/toggleReturnSelection\('([^']+)'/);
      if(m)ids.push(m[1]);
    });
    const data=(typeof RETURNS!=='undefined'&&Array.isArray(RETURNS))?RETURNS:[];
    return ids.map(id=>data.find(x=>x.id===id)).filter(Boolean)
      .filter(x=>!['Παραλήφθηκε','Δεν θα επιστραφεί','Έκλεισε'].includes(txt(x.status)));
  }
  window.emailReturn=function(id){
    const data=(typeof RETURNS!=='undefined'&&Array.isArray(RETURNS))?RETURNS:[];
    const x=data.find(r=>r.id===id); if(!x)return;
    const contact=txt(x.contact);
    document.getElementById('returnEmailSubject').value=
      `Εκκρεμής επιστροφή ανταλλακτικού${contact?' - '+contact:''}`;
    document.getElementById('returnEmailBody').value=buildBody([x]);
    const msg=document.getElementById('returnEmailCopyMsg'); if(msg)msg.textContent='';
    document.getElementById('returnEmailModal')?.classList.add('open');
  };
  window.emailSelectedReturns=function(){
    const items=selectedItems();
    if(!items.length){alert('Τσέκαρε πρώτα μία ή περισσότερες εκκρεμείς επιστροφές.');return}
    const contacts=[...new Set(items.map(x=>txt(x.contact)).filter(Boolean))];
    document.getElementById('returnEmailSubject').value=
      contacts.length===1?`Εκκρεμείς επιστροφές ανταλλακτικών - ${contacts[0]}`:'Εκκρεμείς επιστροφές ανταλλακτικών';
    document.getElementById('returnEmailBody').value=buildBody(items);
    const msg=document.getElementById('returnEmailCopyMsg'); if(msg)msg.textContent='';
    document.getElementById('returnEmailModal')?.classList.add('open');
  };

  // Add model to the selected Viber list without changing selection behavior.
  const oldViberSelected=window.viberSelectedReturns;
  window.viberSelectedReturns=function(){
    const items=selectedItems();
    if(!items.length){alert('Τσέκαρε πρώτα μία ή περισσότερες εκκρεμείς επιστροφές.');return}
    const contacts=[...new Set(items.map(x=>txt(x.contact)).filter(Boolean))];
    const lines=['🔄 Εκκρεμείς επιστροφές'];
    if(contacts.length===1)lines.push(`👤 Επαφή: ${contacts[0]}`);
    lines.push('');
    items.forEach((x,i)=>{
      if(contacts.length>1 && txt(x.contact))lines.push(`${i+1}. 👤 ${txt(x.contact)}`);
      else lines.push(`${i+1}. 📦 Τι στείλαμε: ${txt(x.sentItem)||'—'}`);
      if(contacts.length>1)lines.push(`   📦 Τι στείλαμε: ${txt(x.sentItem)||'—'}`);
      if(txt(x.model))lines.push(`   🏷️ Μοντέλο: ${txt(x.model)}`);
      if(txt(x.partCode))lines.push(`   🔢 Κωδικός ανταλλακτικού: ${txt(x.partCode)}`);
      if(txt(x.serial))lines.push(`   🔎 Serial Number: ${txt(x.serial)}`);
      lines.push(`   📅 Πότε το στείλαμε: ${fmtDate(x.sendDate)}`);
      lines.push(`   ↩️ Τι περιμένουμε πίσω: ${txt(x.expectedItem)||'—'}`);
      if(txt(x.deliveryNote))lines.push(`   📄 Δελτίο Αποστολής: ${txt(x.deliveryNote)}`);
      if(txt(x.invoice))lines.push(`   🧾 Τιμολόγιο / Πιστωτικό: ${txt(x.invoice)}`);
      if(txt(x.notes))lines.push(`   💬 Σημειώσεις: ${txt(x.notes)}`);
      if(i<items.length-1)lines.push('');
    });
    const full=lines.join('\n');
    const short=contacts.length===1?`Εκκρεμείς επιστροφές — ${contacts[0]} (${items.length})`:`Εκκρεμείς επιστροφές (${items.length})`;
    if(typeof viberSend==='function')viberSend(full,short);
    else if(typeof copyTextSafe==='function')copyTextSafe(full).then(()=>alert('Το μήνυμα αντιγράφηκε στο πρόχειρο.'));
  };

  // Show model beneath "sent" in the active Returns table, after every render.
  const oldRender=window.renderReturns;
  if(typeof oldRender==='function'){
    window.renderReturns=function(){
      const r=oldRender.apply(this,arguments);
      try{
        const rows=[...document.querySelectorAll('#returnsBody tr')];
        rows.forEach(tr=>{
          const cb=tr.querySelector('.return-select');
          let id='';
          if(cb){
            const s=cb.getAttribute('onchange')||'';
            const m=s.match(/toggleReturnSelection\('([^']+)'/); if(m)id=m[1];
          } else {
            const edit=tr.querySelector('button[onclick^="editReturn"]');
            const m=(edit?.getAttribute('onclick')||'').match(/editReturn\('([^']+)'/); if(m)id=m[1];
          }
          const x=(typeof RETURNS!=='undefined'&&Array.isArray(RETURNS))?RETURNS.find(v=>v.id===id):null;
          if(!x||!txt(x.model))return;
          const sentCell=tr.children[3];
          if(sentCell && !sentCell.querySelector('.ret-model-line')){
            const div=document.createElement('div');
            div.className='small ret-model-line';
            div.textContent='Μοντέλο: '+txt(x.model);
            sentCell.appendChild(div);
          }
        });
      }catch(e){}
      return r;
    };
  }
})();
