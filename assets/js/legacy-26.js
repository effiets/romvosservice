
/* v6.5.46 — checkbox ανά κωδικό + Email/Viber μόνο για τις επιλεγμένες επιστροφές */
(function(){
  const selected=new Set();
  const txt=v=>String(v??'').trim();
  const fmtDate=v=>{const s=txt(v),m=s.match(/^(\d{4})-(\d{2})-(\d{2})$/);return m?`${m[3]}/${m[2]}/${m[1]}`:s||'—'};
  const closed=x=>typeof returnClosed==='function'?returnClosed(x):['Παραλήφθηκε','Δεν θα επιστραφεί','Έκλεισε'].includes(txt(x?.status));
  function rows(){try{return Array.isArray(RETURNS)?RETURNS:[]}catch(e){return []}}
  function updateCount(){
    const el=document.getElementById('retSelectedCount');
    if(el)el.textContent=`${selected.size} επιλεγμέν${selected.size===1?'ο':'α'}`;
  }
  window.toggleReturnSelection=function(id,on){
    if(on)selected.add(id); else selected.delete(id);
    updateCount();
  };

  window.deleteReturnFromList=async function(id){
    const x=rows().find(r=>r.id===id);
    if(!x)return;
    const label=txt(x.code)||'τη συγκεκριμένη επιστροφή';
    if(!(await askConfirm(
      'Να διαγραφεί οριστικά η επιστροφή '+label+'; Η ενέργεια δεν αναιρείται.',
      'Διαγραφή επιστροφής'
    )))return;
    selected.delete(id);
    RETURNS=RETURNS.filter(r=>r.id!==id);
    saveReturnsData();
    if(document.getElementById('retId')?.value===id){
      try{clearReturn()}catch(e){}
    }
    renderReturns();
  };
  function selectedRows(){
    const list=rows().filter(x=>selected.has(x.id) && !closed(x));
    // purge ids that no longer exist/open
    const valid=new Set(list.map(x=>x.id));
    [...selected].forEach(id=>{if(!valid.has(id))selected.delete(id)});
    updateCount();
    return list;
  }
  function build(items){
    if(!items.length)return '';
    const contacts=[...new Set(items.map(x=>txt(x.contact)).filter(Boolean))];
    const lines=['🔄 Εκκρεμείς επιστροφές'];
    if(contacts.length===1)lines.push(`👤 Επαφή: ${contacts[0]}`);
    lines.push('');
    items.forEach((x,i)=>{
      if(contacts.length>1 && txt(x.contact))lines.push(`${i+1}. 👤 ${txt(x.contact)}`);
      else lines.push(`${i+1}. 📦 Τι στείλαμε: ${txt(x.sentItem)||'—'}`);
      if(contacts.length>1)lines.push(`   📦 Τι στείλαμε: ${txt(x.sentItem)||'—'}`);
      lines.push(`   📅 Πότε το στείλαμε: ${fmtDate(x.sendDate)}`);
      lines.push(`   ↩️ Τι περιμένουμε πίσω: ${txt(x.expectedItem)||'—'}`);
      if(txt(x.deliveryNote))lines.push(`   📄 Δελτίο Αποστολής: ${txt(x.deliveryNote)}`);
      if(txt(x.invoice))lines.push(`   🧾 Τιμολόγιο / Πιστωτικό: ${txt(x.invoice)}`);
      if(txt(x.notes))lines.push(`   💬 Σημειώσεις: ${txt(x.notes)}`);
      if(i<items.length-1)lines.push('');
    });
    return lines.join('\n');
  }
  function getSelectedOrWarn(){
    const items=selectedRows();
    if(!items.length){alert('Τσέκαρε πρώτα μία ή περισσότερες εκκρεμείς επιστροφές.');return null}
    return {items,text:build(items)};
  }
  window.emailSelectedReturns=function(){
    const d=getSelectedOrWarn(); if(!d)return;
    const contacts=[...new Set(d.items.map(x=>txt(x.contact)).filter(Boolean))];
    const subject=contacts.length===1?`Εκκρεμείς επιστροφές - ${contacts[0]}`:'Εκκρεμείς επιστροφές';
    const subj=document.getElementById('returnEmailSubject');
    const body=document.getElementById('returnEmailBody');
    const msg=document.getElementById('returnEmailCopyMsg');
    if(subj)subj.value=subject;
    if(body)body.value=d.text;
    if(msg)msg.textContent='';
    document.getElementById('returnEmailModal')?.classList.add('open');
  };
  window.viberSelectedReturns=function(){
    const d=getSelectedOrWarn(); if(!d)return;
    const contacts=[...new Set(d.items.map(x=>txt(x.contact)).filter(Boolean))];
    const short=contacts.length===1?`Εκκρεμείς επιστροφές — ${contacts[0]} (${d.items.length})`:`Εκκρεμείς επιστροφές (${d.items.length})`;
    if(typeof viberSend==='function')viberSend(d.text,short);
    else if(typeof copyTextSafe==='function')copyTextSafe(d.text).then(()=>alert('Το μήνυμα αντιγράφηκε στο πρόχειρο.'));
  };

  // Replace the active renderer so each open return gets a checkbox next to its code.
  window.renderReturns=function(){
    if(!$('returnsBody'))return;
    let q=(($('retSearch')?.value)||'').toLowerCase(),st=$('retFilterStatus')?.value||'',list=RETURNS.filter(x=>!st||x.status===st).filter(x=>!q||JSON.stringify(x).toLowerCase().includes(q));
    // remove selections that became closed/deleted
    [...selected].forEach(id=>{const x=RETURNS.find(r=>r.id===id);if(!x||closed(x))selected.delete(id)});
    $('returnsBody').innerHTML=list.length?list.map(x=>{
      let d=daysDiff(x.dueDate),isClosed=closed(x),cls=!isClosed&&d<0?'overdue-return':!isClosed&&d<=7?'due-soon-return':'';
      const checked=selected.has(x.id)?' checked':'';
      const selector=isClosed?'':`<input class="return-select" type="checkbox" title="Επιλογή για Email / Viber" aria-label="Επιλογή ${esc(x.code)}" onchange="toggleReturnSelection('${x.id}',this.checked)"${checked}>`;
      return `<tr class="${cls}"><td><span class="return-select-wrap">${selector}<b>${esc(x.code)}</b></span></td><td>${esc(x.sendDate)}</td><td>${esc(x.contact)}</td><td><b>${esc(x.sentItem)}</b><div class="small">Πίσω: ${esc(x.expectedItem||'—')}</div></td><td>${esc(x.dueDate||'—')}${!isClosed&&d<0?`<div class="bad">${Math.abs(d)} ημέρες καθυστέρηση</div>`:''}</td><td>${esc(x.deliveryNote||x.invoice||'—')}<div class="small">${esc(x.tracking||'')}</div></td><td><span class="badge ${isClosed?'status-closed':d<0?'expired':d<=7?'today':'return-status-neutral'}">${esc(x.status)}</span></td><td><div class="return-row-actions"><button class="btn light" title="Προβολή" aria-label="Προβολή" onclick="viewReturn('${x.id}')">👁️</button><button class="btn light" title="Επεξεργασία" aria-label="Επεξεργασία" onclick="editReturn('${x.id}')">✏️</button><button class="btn light" title="Email" aria-label="Email" onclick="emailReturn('${x.id}')">📧</button><button class="btn light" title="Viber" aria-label="Viber" onclick="viberReturn('${x.id}')">📨</button><button class="btn light return-row-trash" title="Διαγραφή" aria-label="Διαγραφή" onclick="deleteReturnFromList('${x.id}')">🗑️</button></div></td></tr>`
    }).join(''):'<tr><td colspan="8">Δεν υπάρχουν εγγραφές.</td></tr>';
    let open=RETURNS.filter(x=>!closed(x)),soon=open.filter(x=>{let d=daysDiff(x.dueDate);return d>=0&&d<=7}),over=open.filter(x=>daysDiff(x.dueDate)<0);
    $('retKpiOpen').textContent=open.length;$('retKpiSoon').textContent=soon.length;$('retKpiOver').textContent=over.length;$('retKpiReceived').textContent=RETURNS.filter(x=>x.status==='Παραλήφθηκε').length;
    const rs7=open.filter(x=>{const d=daysDiff(x.dueDate);return d>=4&&d<=7}).length;
    const rs3=open.filter(x=>{const d=daysDiff(x.dueDate);return d>=1&&d<=3}).length;
    const rst=open.filter(x=>daysDiff(x.dueDate)===0).length;
    if($('retSafe7'))$('retSafe7').textContent=rs7;
    if($('retSafe3'))$('retSafe3').textContent=rs3;
    if($('retSafeToday'))$('retSafeToday').textContent=rst;
    if($('retSafeOver'))$('retSafeOver').textContent=over.length;
    let n=$('returnsNavCount');if(n){n.textContent=over.length||open.length;n.style.display=open.length?'inline-flex':'none'}
    updateCount();
  };

  // Old batch selector is no longer used; hide if an older block survives for any reason.
  const old=document.getElementById('retBatchContact'); if(old)old.closest('.field')?.remove();
  updateCount();
  try{renderReturns()}catch(e){console.error(e)}
})();
