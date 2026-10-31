
/* v6.5.49 — Απλοποιημένο επίσημο Email επιστροφών */
(function(){
  const txt=v=>String(v??'').trim();
  const fmtDate=v=>{
    const s=txt(v); if(!s)return '';
    const m=s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return m?`${m[3]}/${m[2]}/${m[1]}`:s;
  };
  function itemBlock(x,i,showContact){
    const L=[`${i}. ${txt(x.sentItem)||'Εκκρεμής επιστροφή'}`];
    if(showContact && txt(x.contact)) L.push(`   Επαφή: ${txt(x.contact)}`);
    if(txt(x.sendDate)) L.push(`   Ημερομηνία αποστολής: ${fmtDate(x.sendDate)}`);
    if(txt(x.expectedItem)) L.push(`   Αναμένουμε να επιστραφεί: ${txt(x.expectedItem)}`);
    if(txt(x.partCode)) L.push(`   Κωδικός ανταλλακτικού: ${txt(x.partCode)}`);
    if(txt(x.serial)) L.push(`   Serial Number: ${txt(x.serial)}`);
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
    const opening = items.length===1
      ? 'Αγαπητέ συνεργάτη, παρακαλώ για την ενημέρωσή μας σχετικά με την πορεία της παρακάτω εκκρεμότητας.'
      : 'Αγαπητέ συνεργάτη, παρακαλώ για την ενημέρωσή μας σχετικά με την πορεία των παρακάτω εκκρεμοτήτων.';
    return [
      opening,
      '',
      items.map((x,i)=>itemBlock(x,i+1,showContact)).join('\n\n')
    ].join('\n');
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
    const x=data.find(r=>r.id===id);
    if(!x)return;
    const contact=txt(x.contact);
    document.getElementById('returnEmailSubject').value=
      `Εκκρεμής επιστροφή ανταλλακτικού${contact?' - '+contact:''}`;
    document.getElementById('returnEmailBody').value=buildBody([x]);
    const msg=document.getElementById('returnEmailCopyMsg'); if(msg)msg.textContent='';
    document.getElementById('returnEmailModal')?.classList.add('open');
  };

  window.emailSelectedReturns=function(){
    const items=selectedItems();
    if(!items.length){
      alert('Τσέκαρε πρώτα μία ή περισσότερες εκκρεμείς επιστροφές.');
      return;
    }
    const contacts=[...new Set(items.map(x=>txt(x.contact)).filter(Boolean))];
    document.getElementById('returnEmailSubject').value =
      contacts.length===1
        ? `Εκκρεμείς επιστροφές ανταλλακτικών - ${contacts[0]}`
        : 'Εκκρεμείς επιστροφές ανταλλακτικών';
    document.getElementById('returnEmailBody').value=buildBody(items);
    const msg=document.getElementById('returnEmailCopyMsg'); if(msg)msg.textContent='';
    document.getElementById('returnEmailModal')?.classList.add('open');
  };

  window.copyReturnEmailSubject=async function(){
    const subject=txt(document.getElementById('returnEmailSubject')?.value);
    if(!subject)return;
    try{
      if(typeof copyTextSafe==='function') await copyTextSafe(subject);
      else await navigator.clipboard.writeText(subject);
      const msg=document.getElementById('returnEmailCopyMsg');
      if(msg) msg.textContent='Το θέμα αντιγράφηκε.';
    }catch(e){
      alert('Δεν έγινε αντιγραφή του θέματος.');
    }
  };
})();
