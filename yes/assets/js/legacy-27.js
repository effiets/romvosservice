
/* v6.5.47 — Επίσημη αυτόματη σύνταξη Email για Εκκρεμείς Επιστροφές */
(function(){
  const txt=v=>String(v??'').trim();
  const fmtDate=v=>{
    const s=txt(v);
    if(!s)return '';
    const m=s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return m?`${m[3]}/${m[2]}/${m[1]}`:s;
  };
  function formalItem(x,i,showContact){
    const L=[];
    L.push(`${i}. ${txt(x.sentItem)||'Εκκρεμής επιστροφή'}`);
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
  function formalBody(items){
    const contacts=[...new Set(items.map(x=>txt(x.contact)).filter(Boolean))];
    const showContact=contacts.length>1;
    const intro=items.length===1
      ? 'θα θέλαμε την ενημέρωσή σας σχετικά με την παρακάτω εκκρεμή επιστροφή ανταλλακτικού:'
      : 'θα θέλαμε την ενημέρωσή σας σχετικά με τις παρακάτω εκκρεμείς επιστροφές ανταλλακτικών:';
    const list=items.map((x,i)=>formalItem(x,i+1,showContact)).join('\n\n');
    const outro=items.length===1
      ? 'Παρακαλούμε για την ενημέρωσή μας σχετικά με την πορεία της παραπάνω εκκρεμότητας.'
      : 'Παρακαλούμε για την ενημέρωσή μας σχετικά με την πορεία των παραπάνω εκκρεμοτήτων.';
    return [
      'Αγαπητέ συνεργάτη,',
      '',
      intro,
      '',
      list,
      '',
      outro,
      '',
      'Με εκτίμηση,',
      'Ρόμβος'
    ].join('\n');
  }

  // Override single-return email with formal composition.
  window.emailReturn=function(id){
    const x=(typeof RETURNS!=='undefined'&&Array.isArray(RETURNS))?RETURNS.find(r=>r.id===id):null;
    if(!x)return;
    const contact=txt(x.contact);
    const subject=`Εκκρεμής επιστροφή ανταλλακτικού${contact?' - '+contact:''}`;
    document.getElementById('returnEmailSubject').value=subject;
    document.getElementById('returnEmailBody').value=formalBody([x]);
    const msg=document.getElementById('returnEmailCopyMsg'); if(msg)msg.textContent='';
    document.getElementById('returnEmailModal')?.classList.add('open');
  };

  // Override selected-return email with formal composition, while keeping Viber unchanged.
  window.emailSelectedReturns=function(){
    if(typeof getSelectedOrWarn==='function'){
      const d=getSelectedOrWarn(); if(!d)return;
      const contacts=[...new Set(d.items.map(x=>txt(x.contact)).filter(Boolean))];
      const subject=contacts.length===1
        ? `Εκκρεμείς επιστροφές ανταλλακτικών - ${contacts[0]}`
        : 'Εκκρεμείς επιστροφές ανταλλακτικών';
      document.getElementById('returnEmailSubject').value=subject;
      document.getElementById('returnEmailBody').value=formalBody(d.items);
      const msg=document.getElementById('returnEmailCopyMsg'); if(msg)msg.textContent='';
      document.getElementById('returnEmailModal')?.classList.add('open');
      return;
    }
    alert('Δεν βρέθηκε η επιλογή εκκρεμών επιστροφών.');
  };

  window.openReturnEmailClient=function(){
    const subject=txt(document.getElementById('returnEmailSubject')?.value);
    const body=txt(document.getElementById('returnEmailBody')?.value);
    window.location.href='mailto:?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body);
  };
})();
