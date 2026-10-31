
/* v6.5.45 — Συνολική λίστα ανοικτών επιστροφών ανά επαφή, Email / Viber */
(function(){
  const txt=v=>String(v??'').trim();
  const norm=v=>txt(v).toLocaleUpperCase('el-GR');
  const isClosed=x=>['Παραλήφθηκε','Δεν θα επιστραφεί','Έκλεισε'].includes(txt(x?.status));
  const fmtDate=v=>{
    if(!v)return '—';
    const m=txt(v).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return m?`${m[3]}/${m[2]}/${m[1]}`:txt(v);
  };
  function currentReturns(){
    try{
      if(typeof RETURNS!=='undefined' && Array.isArray(RETURNS)) return RETURNS;
    }catch(e){}
    try{return JSON.parse(localStorage.getItem('romvos_pending_returns')||'[]')}catch(e){return []}
  }
  function openForContact(contact){
    const n=norm(contact);
    return currentReturns()
      .filter(x=>x && !isClosed(x) && norm(x.contact)===n)
      .sort((a,b)=>txt(a.sendDate).localeCompare(txt(b.sendDate)));
  }
  function fillBatchContacts(){
    const sel=document.getElementById('retBatchContact');
    if(!sel)return;
    const previous=sel.value;
    const map=new Map();
    currentReturns().filter(x=>x && !isClosed(x) && txt(x.contact)).forEach(x=>{
      const key=norm(x.contact);
      if(!map.has(key))map.set(key,{name:txt(x.contact),count:0});
      map.get(key).count++;
    });
    const values=[...map.values()].sort((a,b)=>a.name.localeCompare(b.name,'el'));
    sel.innerHTML='<option value="">— Επιλογή επαφής —</option>'+values.map(x=>
      `<option value="${typeof esc==='function'?esc(x.name):x.name.replace(/"/g,'&quot;')}">${typeof esc==='function'?esc(x.name):x.name} (${x.count})</option>`
    ).join('');
    if(values.some(x=>x.name===previous))sel.value=previous;
  }
  function build(contact){
    const items=openForContact(contact);
    if(!items.length)return null;
    const lines=[
      '🔄 Εκκρεμείς επιστροφές',
      `👤 Επαφή: ${txt(contact)}`,
      ''
    ];
    items.forEach((x,i)=>{
      lines.push(`${i+1}. 📦 Τι στείλαμε: ${txt(x.sentItem)||'—'}`);
      lines.push(`   📅 Πότε το στείλαμε: ${fmtDate(x.sendDate)}`);
      lines.push(`   ↩️ Τι περιμένουμε πίσω: ${txt(x.expectedItem)||'—'}`);
      if(txt(x.deliveryNote))lines.push(`   📄 Δελτίο Αποστολής: ${txt(x.deliveryNote)}`);
      if(txt(x.invoice))lines.push(`   🧾 Τιμολόγιο / Πιστωτικό: ${txt(x.invoice)}`);
      if(txt(x.notes))lines.push(`   💬 Σημειώσεις: ${txt(x.notes)}`);
      if(i<items.length-1)lines.push('');
    });
    return {items, text:lines.join('\n')};
  }
  function selected(){
    const contact=txt(document.getElementById('retBatchContact')?.value);
    if(!contact){alert('Επίλεξε πρώτα επαφή για τη συνολική λίστα.');return null}
    const data=build(contact);
    if(!data){alert('Δεν υπάρχουν ανοικτές εκκρεμείς επιστροφές για αυτή την επαφή.');return null}
    return {contact,...data};
  }

  window.emailReturnSummary=function(){
    const d=selected(); if(!d)return;
    const subject=`Εκκρεμείς επιστροφές - ${d.contact} (${d.items.length})`;
    const subj=document.getElementById('returnEmailSubject');
    const body=document.getElementById('returnEmailBody');
    const msg=document.getElementById('returnEmailCopyMsg');
    if(subj)subj.value=subject;
    if(body)body.value=d.text;
    if(msg)msg.textContent='';
    document.getElementById('returnEmailModal')?.classList.add('open');
  };

  window.viberReturnSummary=function(){
    const d=selected(); if(!d)return;
    const short=`Εκκρεμείς επιστροφές — ${d.contact} (${d.items.length})`;
    if(typeof viberSend==='function')viberSend(d.text,short);
    else if(typeof copyTextSafe==='function')copyTextSafe(d.text).then(()=>alert('Η συνολική λίστα αντιγράφηκε στο πρόχειρο.'));
  };

  // Keep contact selector in sync whenever Returns list is rendered.
  const oldRender=window.renderReturns;
  if(typeof oldRender==='function'){
    window.renderReturns=function(){
      const r=oldRender.apply(this,arguments);
      try{fillBatchContacts()}catch(e){}
      return r;
    };
  }

  function init(){
    fillBatchContacts();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
