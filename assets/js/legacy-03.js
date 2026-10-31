
/* v6.3 — Εισερχόμενος εξοπλισμός και εκκρεμείς επιστροφές */
let INCOMING=[],RETURNS=[];
try{INCOMING=JSON.parse(localStorage.getItem('romvos_incoming_equipment')||'[]')}catch(e){INCOMING=[]}
try{RETURNS=JSON.parse(localStorage.getItem('romvos_pending_returns')||'[]')}catch(e){RETURNS=[]}
const saveIncomingData=()=>localStorage.setItem('romvos_incoming_equipment',JSON.stringify(INCOMING));
const saveReturnsData=()=>localStorage.setItem('romvos_pending_returns',JSON.stringify(RETURNS));
function nextModuleCode(prefix,list){let y=new Date().getFullYear(),max=list.reduce((m,x)=>{let r=new RegExp('^'+prefix+'-'+y+'-(\\d+)$').exec(x.code||'');return r?Math.max(m,Number(r[1])):m},0);return prefix+'-'+y+'-'+String(max+1).padStart(5,'0')}
function fillModuleLists(){let h=C.filter(c=>c.active!==false).sort((a,b)=>a.name.localeCompare(b.name,'el')).map(c=>`<option value="${esc(c.name)}"></option>`).join('');if($('incomingContacts'))$('incomingContacts').innerHTML=h;if($('returnContacts'))$('returnContacts').innerHTML=h;let e='<option value="">—</option>'+E.map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join('');if($('inTechnician'))$('inTechnician').innerHTML=e}
function newIncoming(){clearIncoming();document.querySelector('[data-tab="incoming"]')?.click()}
function clearIncoming(){['inId','inCode','inContact','inBillingName','inDocumentNumber','inReceivedByWarehouse','inContents','inProblem','inDiagnosis','inLocation','inNotes','inExitDate'].forEach(id=>{if($(id))$(id).value=''});if($('inDocumentType'))$('inDocumentType').value='';if($('inDate'))$('inDate').value=today();if($('inStatus'))$('inStatus').value='Παραλήφθηκε';if($('inReason'))$('inReason').selectedIndex=0;if($('inTechnician'))$('inTechnician').value='';if($('inOwner'))$('inOwner').value='Πελάτη';if($('inOutcome'))$('inOutcome').value='';if($('inDeliveryMethod'))$('inDeliveryMethod').value='';$('equipmentItems').innerHTML='';addEquipmentItem();$('inDeleteBtn').style.display='none';$('inEditorTitle').textContent='Νέα παραλαβή'}
function addEquipmentItem(item={}){
  let d=document.createElement('div');d.className='equipment-item';
  let oldModel=item.model||'', oldSerial=item.serial||'';
  d.innerHTML=`
  <div class="field"><label>Είδος</label><select class="eq-type">
    <option value="">— Επιλογή —</option>
    ${['Εξωτερική μονάδα','Εσωτερική μονάδα','Αντλία θερμότητας','Πλακέτα','BC Box / Box','Χειριστήριο','Controller','Inverter','Συμπιεστής','Ανταλλακτικό','Άλλο'].map(v=>`<option ${item.type===v?'selected':''}>${v}</option>`).join('')}
  </select></div>
  <div class="field"><label>Μάρκα</label><input class="eq-brand" value="${esc(item.brand||'')}" placeholder="Mitsubishi, Midea..."></div>
  <div class="field"><label>Μοντέλο</label><input class="eq-model" value="${esc(oldModel)}" placeholder="π.χ. PUHY-P250YKM"></div>
  <div class="field"><label>Serial Number</label><input class="eq-serial" value="${esc(oldSerial)}" placeholder="Serial Number"></div>
  <div class="field"><label>Service Ref</label><input class="eq-service-ref" value="${esc(item.serviceRef||'')}" placeholder="Service Ref"></div>
  <div class="field"><label>Ποσότητα</label><input class="eq-qty" type="number" min="1" value="${Number(item.qty||1)}"></div>
  <div class="field"><label>Παρατηρήσεις</label><textarea class="eq-notes" placeholder="Χτύπημα, ελλείψεις, τι περιλαμβάνει...">${esc(item.notes||'')}</textarea></div>
  <button type="button" class="btn danger" title="Διαγραφή γραμμής" onclick="this.parentElement.remove()">✕</button>`;
  $('equipmentItems').appendChild(d)
}
function collectEquipmentItems(){
  return [...document.querySelectorAll('#equipmentItems .equipment-item')].map(d=>({
    type:d.querySelector('.eq-type').value.trim(),
    brand:d.querySelector('.eq-brand').value.trim(),
    model:d.querySelector('.eq-model').value.trim(),
    serial:d.querySelector('.eq-serial').value.trim(),
    serviceRef:d.querySelector('.eq-service-ref').value.trim(),
    qty:Number(d.querySelector('.eq-qty').value||1),
    notes:d.querySelector('.eq-notes').value.trim()
  })).filter(x=>x.type||x.brand||x.model||x.serial||x.serviceRef||x.notes)
}
function saveIncoming(){let id=$('inId').value,items=collectEquipmentItems();if(!$('inContact').value.trim())return alert('Συμπλήρωσε επαφή.');if(!items.length)return alert('Πρόσθεσε τουλάχιστον ένα αντικείμενο.');let d={code:$('inCode').value||nextModuleCode('EQ',INCOMING),date:$('inDate').value||today(),contact:$('inContact').value.trim(),billingName:$('inBillingName').value.trim(),receiveMethod:$('inReceiveMethod').value,documentType:$('inDocumentType').value,documentNumber:$('inDocumentNumber').value.trim(),receivedByWarehouse:$('inReceivedByWarehouse').value.trim(),reason:$('inReason').value,status:$('inStatus').value,technicianId:$('inTechnician').value,owner:$('inOwner').value,items,contents:$('inContents').value.trim(),problem:$('inProblem').value.trim(),diagnosis:$('inDiagnosis').value.trim(),outcome:$('inOutcome').value,location:$('inLocation').value.trim(),exitDate:$('inExitDate').value,deliveryMethod:$('inDeliveryMethod').value,notes:$('inNotes').value.trim(),updatedAt:new Date().toISOString()};if(id){let x=INCOMING.find(x=>x.id===id);if(x)Object.assign(x,d)}else INCOMING.unshift({id:uid('EQ'),...d,createdAt:new Date().toISOString()});saveIncomingData();clearIncoming();renderIncoming();alert('Η παραλαβή αποθηκεύτηκε.')}
function editIncoming(id){let x=INCOMING.find(x=>x.id===id);if(!x)return;const map={inId:'id',inCode:'code',inDate:'date',inContact:'contact',inBillingName:'billingName',inReceiveMethod:'receiveMethod',inReason:'reason',inStatus:'status',inTechnician:'technicianId',inOwner:'owner',inContents:'contents',inProblem:'problem',inDiagnosis:'diagnosis',inOutcome:'outcome',inLocation:'location',inExitDate:'exitDate',inDeliveryMethod:'deliveryMethod',inNotes:'notes'};Object.keys(map).forEach(k=>$(k).value=x[map[k]]||'');$('inDocumentType').value=x.documentType||(x.deliveryNote?'Δελτίο Αποστολής':'');$('inDocumentNumber').value=x.documentNumber||x.deliveryNote||'';$('inReceivedByWarehouse').value=x.receivedByWarehouse||'';$('equipmentItems').innerHTML='';(x.items||[]).forEach(addEquipmentItem);if(!(x.items||[]).length)addEquipmentItem();$('inDeleteBtn').style.display='inline-block';$('inEditorTitle').textContent='Επεξεργασία παραλαβής';window.scrollTo({top:0,behavior:'smooth'})}
async function deleteIncoming(){let id=$('inId').value,x=INCOMING.find(x=>x.id===id);if(!x)return;if(!(await askConfirm('Να διαγραφεί η παραλαβή για «'+(x.contact||'χωρίς επαφή')+'»;','Διαγραφή')))return;if(!(await askConfirm('Δεύτερη επιβεβαίωση: οριστική διαγραφή;','Οριστική διαγραφή')))return;INCOMING=INCOMING.filter(x=>x.id!==id);saveIncomingData();clearIncoming();renderIncoming()}
function incomingStatusClass(s){if(['Παραδόθηκε','Επιστράφηκε σε προμηθευτή'].includes(s))return 'status-closed';if(['Επισκευάστηκε','Έτοιμο για παράδοση'].includes(s))return 'status-ready';if(['Υπό έλεγχο'].includes(s))return 'status-progress';if(['Αναμονή ανταλλακτικού','Αναμονή έγκρισης'].includes(s))return 'status-wait';return 'status-open'}
function renderIncoming(){if(!$('incomingBody'))return;let q=(($('inSearch')?.value)||'').toLowerCase(),st=$('inFilterStatus')?.value||'',list=INCOMING.filter(x=>!st||x.status===st).filter(x=>!q||JSON.stringify(x).toLowerCase().includes(q));$('incomingBody').innerHTML=list.length?list.map(x=>`<tr><td>${esc(x.date)}</td><td>${esc(x.contact)}</td><td>${esc((x.items||[]).map(i=>(i.qty>1?i.qty+'× ':'')+(i.type||i.model)).join(', '))}</td><td><span class="badge ${incomingStatusClass(x.status)}">${esc(x.status)}</span></td><td>${esc(x.location||'—')}</td><td><div class="incoming-row-actions"><button class="btn light" type="button" onclick="printIncomingTag('${x.id}')" title="Εκτύπωση καρτέλας Α4">🖨️ Α4</button><button class="btn light" type="button" onclick="editIncoming('${x.id}')" title="Επεξεργασία">✏️</button></div></td></tr>`).join(''):'<tr><td colspan="6">Δεν υπάρχουν εγγραφές.</td></tr>';let open=INCOMING.filter(x=>!['Παραδόθηκε','Επιστράφηκε σε προμηθευτή','Προς καταστροφή'].includes(x.status));$('inKpiOpen').textContent=open.length;$('inKpiWaiting').textContent=INCOMING.filter(x=>x.status==='Αναμονή ελέγχου'||x.status==='Παραλήφθηκε').length;$('inKpiProgress').textContent=INCOMING.filter(x=>x.status==='Υπό έλεγχο').length;$('inKpiStored').textContent=INCOMING.filter(x=>['Παραμένει στην αποθήκη','Για ανταλλακτικά'].includes(x.status)||x.location).length;let n=$('incomingNavCount');n.textContent=open.length;n.style.display=open.length?'inline-flex':'none'}
function incomingTagText(v){return (v===undefined||v===null||String(v).trim()==='')?'—':String(v)}
function fitIncomingTagToOneA4(){
  const pa=$('printArea');
  const card=pa?.querySelector('.incoming-tag-card');
  const inner=card?.querySelector('.incoming-tag-fit');
  if(!pa||!card||!inner)return;

  const prev={
    display:pa.style.display,position:pa.style.position,left:pa.style.left,top:pa.style.top,
    width:pa.style.width,visibility:pa.style.visibility,pointerEvents:pa.style.pointerEvents
  };
  const hidden=getComputedStyle(pa).display==='none';
  if(hidden){
    pa.style.display='block';
    pa.style.position='fixed';
    pa.style.left='-20000px';
    pa.style.top='0';
    pa.style.width='210mm';
    pa.style.visibility='hidden';
    pa.style.pointerEvents='none';
  }

  inner.style.transform='none';
  inner.style.width='100%';

  const cs=getComputedStyle(card);
  const available=Math.max(1,card.clientHeight-parseFloat(cs.paddingTop||0)-parseFloat(cs.paddingBottom||0)-8);
  let scale=1;
  for(let i=0;i<6;i++){
    inner.style.width=(100/scale)+'%';
    inner.style.transform='none';
    const needed=Math.max(1,inner.scrollHeight);
    const next=Math.max(0.55,Math.min(1,available/needed));
    if(Math.abs(next-scale)<0.002){scale=next;break}
    scale=next;
  }
  inner.style.width=(100/scale)+'%';
  inner.style.transform=`scale(${scale})`;

  if(hidden){
    pa.style.display=prev.display;
    pa.style.position=prev.position;
    pa.style.left=prev.left;
    pa.style.top=prev.top;
    pa.style.width=prev.width;
    pa.style.visibility=prev.visibility;
    pa.style.pointerEvents=prev.pointerEvents;
  }
}
function printIncomingTag(id){
  const x=INCOMING.find(z=>z.id===id);if(!x)return;
  const items=(x.items&&x.items.length)?x.items:[{}];
  const tech=x.technicianId?E.find(e=>e.id===x.technicianId):null;
  const fmtDate=v=>{if(!v)return '—';const d=new Date(v+'T12:00:00');return isNaN(d)?v:d.toLocaleDateString('el-GR')};
  const docType=x.documentType||(x.deliveryNote?'Δελτίο Αποστολής':'');
  const docNumber=x.documentNumber||x.deliveryNote||'';
  const reminderText=x.reminderDate
    ? fmtDate(x.reminderDate)+(x.reminderTime?' • '+x.reminderTime:'')
    : '—';

  const itemsHtml=items.map((it,idx)=>{
    const itemName=[it.type,it.brand].filter(Boolean).join(' • ')||'Εξοπλισμός';
    return `<div class="incoming-tag-item">
      <div class="incoming-tag-item-title">${esc(itemName)}${items.length>1?' — '+(idx+1)+' / '+items.length:''}</div>
      <div class="incoming-tag-item-grid">
        <div class="incoming-tag-box"><div class="incoming-tag-label">Μοντέλο</div><div class="incoming-tag-value big">${esc(incomingTagText(it.model))}</div></div>
        <div class="incoming-tag-box"><div class="incoming-tag-label">Serial Number</div><div class="incoming-tag-value big">${esc(incomingTagText(it.serial))}</div></div>
        <div class="incoming-tag-box"><div class="incoming-tag-label">Service Ref</div><div class="incoming-tag-value">${esc(incomingTagText(it.serviceRef))}</div></div>
        <div class="incoming-tag-box"><div class="incoming-tag-label">Ποσότητα</div><div class="incoming-tag-value">${esc(incomingTagText(it.qty||1))}</div></div>
        <div class="incoming-tag-box full"><div class="incoming-tag-label">Παρατηρήσεις αντικειμένου</div><div class="incoming-tag-value">${esc(incomingTagText(it.notes))}</div></div>
      </div>
    </div>`;
  }).join('');

  const legacyShipping=[];
  if(x.carrier)legacyShipping.push(`<div class="incoming-tag-box"><div class="incoming-tag-label">Μεταφορική / Courier (παλιά καταχώριση)</div><div class="incoming-tag-value">${esc(incomingTagText(x.carrier))}</div></div>`);
  if(x.tracking)legacyShipping.push(`<div class="incoming-tag-box"><div class="incoming-tag-label">Tracking / Στοιχείο παραλαβής (παλιά καταχώριση)</div><div class="incoming-tag-value">${esc(incomingTagText(x.tracking))}</div></div>`);
  const legacyShippingHtml=legacyShipping.length?`<div class="incoming-tag-grid">${legacyShipping.join('')}</div>`:'';

  const card=`<section class="incoming-tag-card"><div class="incoming-tag-fit">
    <div class="incoming-tag-head">
      <div class="incoming-tag-brand">ROMVOS SERVICE
        <small>ΚΑΡΤΕΛΑ ΕΙΣΕΡΧΟΜΕΝΟΥ ΕΞΟΠΛΙΣΜΟΥ — Α4</small>
        <small style="font-size:12px;color:#111827;margin-top:5px">Κωδικός παραλαβής: <b>${esc(incomingTagText(x.code))}</b></small>
      </div>
      <div class="incoming-tag-code"><small>ΚΑΤΑΣΤΑΣΗ</small><span class="incoming-tag-status">${esc(incomingTagText(x.status))}</span></div>
    </div>

    <div class="incoming-tag-grid">
      <div class="incoming-tag-box full"><div class="incoming-tag-label">Πελάτης / Επαφή</div><div class="incoming-tag-value big">${esc(incomingTagText(x.contact))}</div></div>
      <div class="incoming-tag-box full"><div class="incoming-tag-label">Τιμολόγηση / Επωνυμία παραστατικού</div><div class="incoming-tag-value big">${esc(incomingTagText(x.billingName))}</div></div>
      <div class="incoming-tag-box"><div class="incoming-tag-label">Ημερομηνία παραλαβής</div><div class="incoming-tag-value">${esc(fmtDate(x.date))}</div></div>
      <div class="incoming-tag-box"><div class="incoming-tag-label">Λόγος εισόδου</div><div class="incoming-tag-value">${esc(incomingTagText(x.reason))}</div></div>
      <div class="incoming-tag-box"><div class="incoming-tag-label">Τρόπος παραλαβής</div><div class="incoming-tag-value">${esc(incomingTagText(x.receiveMethod))}</div></div>
      <div class="incoming-tag-box"><div class="incoming-tag-label">Είδος παραστατικού</div><div class="incoming-tag-value">${esc(incomingTagText(docType))}</div></div>
      <div class="incoming-tag-box"><div class="incoming-tag-label">Αριθμός παραστατικού</div><div class="incoming-tag-value">${esc(incomingTagText(docNumber))}</div></div>
      <div class="incoming-tag-box"><div class="incoming-tag-label">Παρέλαβε στην αποθήκη μας</div><div class="incoming-tag-value">${esc(incomingTagText(x.receivedByWarehouse))}</div></div>
      <div class="incoming-tag-box"><div class="incoming-tag-label">Υπενθύμιση</div><div class="incoming-tag-value">${esc(reminderText)}</div></div>
      <div class="incoming-tag-box"><div class="incoming-tag-label">Ιδιοκτησία</div><div class="incoming-tag-value">${esc(incomingTagText(x.owner))}</div></div>
    </div>

    ${legacyShippingHtml}
    ${itemsHtml}

    <div class="incoming-tag-grid">
      <div class="incoming-tag-box"><div class="incoming-tag-label">Θέση αποθήκευσης</div><div class="incoming-tag-value big">${esc(incomingTagText(x.location))}</div></div>
      <div class="incoming-tag-box"><div class="incoming-tag-label">Τεχνικός ελέγχου</div><div class="incoming-tag-value">${esc(incomingTagText(tech?.name))}</div></div>
      <div class="incoming-tag-box"><div class="incoming-tag-label">Τελική κατάληξη</div><div class="incoming-tag-value">${esc(incomingTagText(x.outcome))}</div></div>
      <div class="incoming-tag-box"><div class="incoming-tag-label">Ημερομηνία παράδοσης / εξόδου</div><div class="incoming-tag-value">${esc(fmtDate(x.exitDate))}</div></div>
      <div class="incoming-tag-box full"><div class="incoming-tag-label">Τρόπος παράδοσης</div><div class="incoming-tag-value">${esc(incomingTagText(x.deliveryMethod))}</div></div>
    </div>

    <div class="incoming-tag-problem"><div class="incoming-tag-label">Περιγραφή προβλήματος / Κατάσταση παραλαβής</div><div class="incoming-tag-value">${esc(incomingTagText(x.problem))}</div></div>
    <div class="incoming-tag-notes incoming-tag-general-notes"><div class="incoming-tag-label">Γενικές σημειώσεις</div><div class="incoming-tag-value">${esc(incomingTagText(x.notes))}</div></div>
    <div class="incoming-tag-notes"><div class="incoming-tag-label">Τι περιλαμβάνει / Συνοδευτικά</div><div class="incoming-tag-value">${esc(incomingTagText(x.contents))}</div></div>
    <div class="incoming-tag-notes"><div class="incoming-tag-label">Διάγνωση / Εργασίες</div><div class="incoming-tag-value">${esc(incomingTagText(x.diagnosis))}</div></div>
    <div class="incoming-tag-footer"><span>ROMVOS SERVICE • ${esc(incomingTagText(x.code))}</span><span>Εκτύπωση: ${new Date().toLocaleDateString('el-GR')}</span></div>
  </div></section>`;

  const pa=$('printArea');if(!pa)return;
  pa.innerHTML=`<div class="incoming-tag-sheet">${card}</div>`;
  document.body.classList.remove('incoming-sticker-print');
  document.body.classList.add('incoming-tag-print');
  let st=document.getElementById('incomingTagPageStyle');
  if(!st){st=document.createElement('style');st.id='incomingTagPageStyle';document.head.appendChild(st)}
  st.textContent='@page{size:A4 portrait;margin:7mm}';
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    fitIncomingTagToOneA4();
    setTimeout(()=>window.print(),80);
  }));
}
window.addEventListener('afterprint',()=>{
  document.body.classList.remove('incoming-tag-print');
  document.body.classList.remove('incoming-sticker-print');
  const st=document.getElementById('incomingTagPageStyle');if(st)st.remove();
});
function newReturn(){clearReturn();document.querySelector('[data-tab="returns"]')?.click()}
function clearReturn(){['retId','retCode','retContact','retSentItem','retModel','retPartCode','retSerial','retExpectedItem','retDeliveryNote','retInvoice','retCarrier','retTracking','retNotes','retReceivedDate','retCommPerson','retCommNote'].forEach(id=>{if($(id))$(id).value=''});['retSendDate','retDocumentDate','retCommDate'].forEach(id=>{if($(id))$(id).value=today()});if($('retDueDate'))$('retDueDate').value='';if($('retReminderDate'))$('retReminderDate').value='';if($('retStatus'))$('retStatus').value='Εκκρεμεί';$('retHistory').innerHTML='';$('retHistory').dataset.items='[]';$('retDeleteBtn').style.display='none';$('retEditorTitle').textContent='Νέα εκκρεμής επιστροφή'}
function getRetHistory(){try{return JSON.parse($('retHistory').dataset.items||'[]')}catch(e){return []}}
function showRetHistory(items){$('retHistory').dataset.items=JSON.stringify(items||[]);$('retHistory').innerHTML=(items||[]).length?(items||[]).slice().reverse().map(h=>`<div class="history-line"><b>${esc(h.date)}</b> • ${esc(h.person||'—')}<br>${esc(h.note)}</div>`).join(''):'<div class="small">Δεν υπάρχει ιστορικό.</div>'}
function addReturnCommunication(){let note=$('retCommNote').value.trim();if(!note)return alert('Γράψε τι ειπώθηκε.');let items=getRetHistory();items.push({date:$('retCommDate').value||today(),person:$('retCommPerson').value.trim(),note});showRetHistory(items);$('retCommNote').value='';$('retCommPerson').value=''}
function saveReturn(){if(!$('retContact').value.trim())return alert('Συμπλήρωσε επαφή.');if(!$('retSentItem').value.trim())return alert('Συμπλήρωσε τι στάλθηκε.');let id=$('retId').value,d={code:$('retCode').value||nextModuleCode('RET',RETURNS),sendDate:$('retSendDate').value||today(),contact:$('retContact').value.trim(),sentItem:$('retSentItem').value.trim(),model:$('retModel').value.trim(),partCode:$('retPartCode').value.trim(),serial:$('retSerial').value.trim(),expectedItem:$('retExpectedItem').value.trim(),dueDate:$('retDueDate').value,status:$('retStatus').value,deliveryNote:$('retDeliveryNote').value.trim(),invoice:$('retInvoice').value.trim(),documentDate:$('retDocumentDate').value,carrier:$('retCarrier').value.trim(),tracking:$('retTracking').value.trim(),reminderDate:$('retReminderDate').value,receivedDate:$('retReceivedDate').value,notes:$('retNotes').value.trim(),history:getRetHistory(),updatedAt:new Date().toISOString()};if(id){let x=RETURNS.find(x=>x.id===id);if(x)Object.assign(x,d)}else RETURNS.unshift({id:uid('RET'),...d,createdAt:new Date().toISOString()});saveReturnsData();clearReturn();renderReturns();alert('Η εκκρεμότητα αποθηκεύτηκε.')}

function viewReturn(id){
  let x=RETURNS.find(x=>x.id===id);
  if(!x)return;
  const val=v=>esc(v||'—');
  const hist=(x.history||[]).length
    ? (x.history||[]).map(h=>`<div class="history-line"><b>${val(h.date)}</b>${h.person?` • ${val(h.person)}`:''}<div>${val(h.note)}</div></div>`).join('')
    : '<div class="small">Δεν υπάρχει ιστορικό επικοινωνίας.</div>';

  $('returnViewTitle').textContent='Προβολή '+(x.code||'εκκρεμούς επιστροφής');
  $('returnViewBody').innerHTML=`
    <div class="sheet">
      <table>
        <tr><th>Κωδικός</th><td>${val(x.code)}</td><th>Κατάσταση</th><td>${val(x.status)}</td></tr>
        <tr><th>Ημερομηνία αποστολής</th><td>${val(x.sendDate)}</td><th>Προθεσμία επιστροφής</th><td>${val(x.dueDate)}</td></tr>
        <tr><th>Πελάτης / Συνεργάτης / Επαφή</th><td colspan="3">${val(x.contact)}</td></tr>
        <tr><th>Τι στάλθηκε</th><td>${val(x.sentItem)}</td><th>Τι περιμένουμε πίσω</th><td>${val(x.expectedItem)}</td></tr>
        <tr><th>Μοντέλο μηχανήματος / εξοπλισμού</th><td colspan="3">${val(x.model)}</td></tr>
        <tr><th>Κωδικός ανταλλακτικού</th><td>${val(x.partCode)}</td><th>Serial Number</th><td>${val(x.serial)}</td></tr>
        <tr><th>Δελτίο Αποστολής</th><td>${val(x.deliveryNote)}</td><th>Τιμολόγιο / Πιστωτικό</th><td>${val(x.invoice)}</td></tr>
        <tr><th>Ημερομηνία παραστατικού</th><td>${val(x.documentDate)}</td><th>Μεταφορική / Courier</th><td>${val(x.carrier)}</td></tr>
        <tr><th>Voucher / Tracking / Φορτωτική</th><td colspan="3">${val(x.tracking)}</td></tr>
        <tr><th>Επόμενη υπενθύμιση</th><td>${val(x.reminderDate)}</td><th>Ημερομηνία παραλαβής</th><td>${val(x.receivedDate)}</td></tr>
        <tr><th>Σημειώσεις</th><td colspan="3" style="white-space:pre-wrap">${val(x.notes)}</td></tr>
      </table>
      <div class="subhead" style="margin-top:12px">Ιστορικό επικοινωνίας</div>
      <div class="history-box" style="max-height:220px">${hist}</div>
    </div>`;
  $('returnViewModal').classList.add('open');
}
function closeReturnView(){
  $('returnViewModal').classList.remove('open');
}



function emailReturn(id){
 const x=RETURNS.find(r=>r.id===id); if(!x)return;
 const c=v=>(v||'').toString().trim();
 const subject=`Εκκρεμής επιστροφή${c(x.code)?' - '+c(x.code):''}${c(x.contact)?' - '+c(x.contact):''}`;
 const rows=[
 'Καλημέρα σας,','','Σχετικά με την παρακάτω εκκρεμή επιστροφή:','',
 c(x.code)?`Κωδικός: ${c(x.code)}`:'',
 c(x.contact)?`Πελάτης / Συνεργάτης / Επαφή: ${c(x.contact)}`:'',
 c(x.sendDate)?`Ημερομηνία αποστολής: ${c(x.sendDate)}`:'',
 c(x.dueDate)?`Προθεσμία επιστροφής: ${c(x.dueDate)}`:'',
 c(x.sentItem)?`Τι στάλθηκε:\n${c(x.sentItem)}`:'',
 c(x.expectedItem)?`Τι περιμένουμε πίσω:\n${c(x.expectedItem)}`:'',
 c(x.partCode)?`Κωδικοί ανταλλακτικών:\n${c(x.partCode)}`:'',
 c(x.serial)?`Serial No:\n${c(x.serial)}`:'',
 c(x.deliveryNote)?`Δελτίο Αποστολής: ${c(x.deliveryNote)}`:'',
 c(x.invoice)?`Τιμολόγιο / Πιστωτικό: ${c(x.invoice)}`:'',
 c(x.documentDate)?`Ημερομηνία παραστατικού: ${c(x.documentDate)}`:'',
 c(x.carrier)?`Μεταφορική / Courier: ${c(x.carrier)}`:'',
 c(x.tracking)?`Voucher / Tracking / Φορτωτική: ${c(x.tracking)}`:'',
 c(x.notes)?`Σημειώσεις:\n${c(x.notes)}`:'',
 '','Παρακαλούμε για την ενημέρωσή σας σχετικά με την επιστροφή.','','Ευχαριστούμε.'
 ];
 $('returnEmailSubject').value=subject;
 $('returnEmailBody').value=rows.join('\n');
 $('returnEmailCopyMsg').textContent='';
 $('returnEmailModal').classList.add('open');
}
function closeReturnEmail(){$('returnEmailModal').classList.remove('open')}
async function copyTextSafe(v){
 try{if(navigator.clipboard&&window.isSecureContext){await navigator.clipboard.writeText(v);return true}}catch(e){}
 const t=document.createElement('textarea');t.value=v;t.style.position='fixed';t.style.opacity='0';
 document.body.appendChild(t);t.focus();t.select();let ok=false;try{ok=document.execCommand('copy')}catch(e){}t.remove();return ok;
}
async function copyReturnEmail(){
 const ok=await copyTextSafe($('returnEmailBody').value);
 $('returnEmailCopyMsg').textContent=ok?'✓ Το κείμενο αντιγράφηκε.':'Επίλεξε το κείμενο και πάτησε Ctrl+C.';
}
async function copyReturnEmailSubject(){
 const ok=await copyTextSafe($('returnEmailSubject').value);
 $('returnEmailCopyMsg').textContent=ok?'✓ Το θέμα αντιγράφηκε.':'Επίλεξε το θέμα και πάτησε Ctrl+C.';
}

function editReturn(id){let x=RETURNS.find(x=>x.id===id);if(!x)return;let map={retId:'id',retCode:'code',retSendDate:'sendDate',retContact:'contact',retSentItem:'sentItem',retModel:'model',retPartCode:'partCode',retSerial:'serial',retExpectedItem:'expectedItem',retDueDate:'dueDate',retStatus:'status',retDeliveryNote:'deliveryNote',retInvoice:'invoice',retDocumentDate:'documentDate',retCarrier:'carrier',retTracking:'tracking',retReminderDate:'reminderDate',retReceivedDate:'receivedDate',retNotes:'notes'};Object.keys(map).forEach(k=>$(k).value=x[map[k]]||'');showRetHistory(x.history||[]);$('retDeleteBtn').style.display='inline-block';$('retEditorTitle').textContent='Επεξεργασία '+x.code;window.scrollTo({top:0,behavior:'smooth'})}
async function deleteReturn(){let id=$('retId').value,x=RETURNS.find(x=>x.id===id);if(!x)return;if(!(await askConfirm('Να διαγραφεί η εκκρεμότητα '+x.code+';','Διαγραφή')))return;if(!(await askConfirm('Δεύτερη επιβεβαίωση: οριστική διαγραφή;','Οριστική διαγραφή')))return;RETURNS=RETURNS.filter(x=>x.id!==id);saveReturnsData();clearReturn();renderReturns()}
async function deleteClosedReturnFromList(id){let x=RETURNS.find(r=>r.id===id);if(!x||!returnClosed(x))return;if(!(await askConfirm('Να διαγραφεί οριστικά η κλεισμένη επιστροφή '+(x.code||'')+'; Η ενέργεια δεν αναιρείται.','Οριστική διαγραφή')))return;RETURNS=RETURNS.filter(r=>r.id!==id);saveReturnsData();if($('retId')?.value===id)clearReturn();renderReturns()}
function daysDiff(date){if(!date)return 9999;let a=new Date(today()+'T00:00:00'),b=new Date(date+'T00:00:00');return Math.round((b-a)/86400000)}
function returnClosed(x){return ['Παραλήφθηκε','Δεν θα επιστραφεί','Έκλεισε'].includes(x.status)}
function renderReturns(){if(!$('returnsBody'))return;let q=(($('retSearch')?.value)||'').toLowerCase(),st=$('retFilterStatus')?.value||'',list=RETURNS.filter(x=>!st||x.status===st).filter(x=>!q||JSON.stringify(x).toLowerCase().includes(q));$('returnsBody').innerHTML=list.length?list.map(x=>{let d=daysDiff(x.dueDate),cls=!returnClosed(x)&&d<0?'overdue-return':!returnClosed(x)&&d<=7?'due-soon-return':'';return `<tr class="${cls}"><td><b>${esc(x.code)}</b></td><td>${esc(x.sendDate)}</td><td>${esc(x.contact)}</td><td><b>${esc(x.sentItem)}</b><div class="small">Πίσω: ${esc(x.expectedItem||'—')}</div></td><td>${esc(x.dueDate||'—')}${!returnClosed(x)&&d<0?`<div class="bad">${Math.abs(d)} ημέρες καθυστέρηση</div>`:''}</td><td>${esc(x.deliveryNote||x.invoice||'—')}<div class="small">${esc(x.tracking||'')}</div></td><td><span class="badge ${returnClosed(x)?'status-closed':d<0?'expired':d<=7?'today':'return-status-neutral'}">${esc(x.status)}</span></td><td><div class="actions" style="flex-wrap:nowrap"><button class="btn light" title="Προβολή" onclick="viewReturn('${x.id}')">👁️</button><button class="btn light" title="Επεξεργασία" onclick="editReturn('${x.id}')">✏️</button><button class="btn light" title="Email" onclick="emailReturn('${x.id}')">📧</button><button class="btn light" title="Viber" onclick="viberReturn('${x.id}')">📨</button>${returnClosed(x)?`<button class="btn light return-row-trash" title="Οριστική διαγραφή" onclick="deleteClosedReturnFromList('${x.id}')">🗑️</button>`:''}</div></td></tr>`}).join(''):'<tr><td colspan="8">Δεν υπάρχουν εγγραφές.</td></tr>';let open=RETURNS.filter(x=>!returnClosed(x)),soon=open.filter(x=>{let d=daysDiff(x.dueDate);return d>=0&&d<=7}),over=open.filter(x=>daysDiff(x.dueDate)<0);$('retKpiOpen').textContent=open.length;$('retKpiSoon').textContent=soon.length;$('retKpiOver').textContent=over.length;$('retKpiReceived').textContent=RETURNS.filter(x=>x.status==='Παραλήφθηκε').length;
const rs7=open.filter(x=>{const d=daysDiff(x.dueDate);return d>=4&&d<=7}).length;
const rs3=open.filter(x=>{const d=daysDiff(x.dueDate);return d>=1&&d<=3}).length;
const rst=open.filter(x=>daysDiff(x.dueDate)===0).length;
if($('retSafe7'))$('retSafe7').textContent=rs7;
if($('retSafe3'))$('retSafe3').textContent=rs3;
if($('retSafeToday'))$('retSafeToday').textContent=rst;
if($('retSafeOver'))$('retSafeOver').textContent=over.length;
let n=$('returnsNavCount');n.textContent=over.length||open.length;n.style.display=open.length?'inline-flex':'none'}
const _renderV63=render;render=function(){_renderV63();fillModuleLists();renderIncoming();renderReturns()};
const _exportDataV63=exportData;exportData=function(){let b=new Blob([JSON.stringify({app:'ROMVOS Service',version:'6.3',employees:E,vehicles:V,jobs:J,clients:C,board:B,incomingEquipment:INCOMING,pendingReturns:RETURNS,simpleReminders:typeof SIMPLE_REMINDERS!=='undefined'?SIMPLE_REMINDERS:[]},null,2)],{type:'application/json'}),u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download='ROMVOS_Service_Backup_'+today()+'.json';a.click();URL.revokeObjectURL(u)};
fillModuleLists();clearIncoming();clearReturn();renderIncoming();renderReturns();

/* v6.5.0 — Παραγγελίες / ζητήσεις προσφοράς */
let ORDERS=[];
try{ORDERS=JSON.parse(localStorage.getItem('romvos_supplier_orders')||'[]')}catch(e){ORDERS=[]}
const saveOrdersData=()=>{localStorage.setItem('romvos_supplier_orders',JSON.stringify(ORDERS));setTimeout(checkOrderAlertsOnOpen,0)};
function orderClosed(x){return ['Ολοκληρώθηκε','Ακυρώθηκε'].includes(x.status)}
function orderProblem(x){return ['Μερική παραλαβή / Αναμονή υπολοίπων','Λάθος υλικά / Αναμονή διόρθωσης'].includes(x.status)}
function orderQuoteDeadline(x){return x.quoteDueDate||(x.requestDate?addDays(x.requestDate,2):'')}
function orderAlertInfo(x){
 if(orderClosed(x))return null;
 if(x.status==='Αναμονή προσφοράς'){const d=orderQuoteDeadline(x);if(d&&d<today())return {type:'quote',due:d,label:'Δεν ήρθε απάντηση στην προσφορά'};}
 if(['Παραγγέλθηκε / Αναμονή παραλαβής','Μερική παραλαβή / Αναμονή υπολοίπων','Λάθος υλικά / Αναμονή διόρθωσης'].includes(x.status)){const d=x.expectedDate;if(d&&d<today())return {type:'order',due:d,label:'Καθυστέρησε η παραγγελία / παραλαβή'};}
 return null;
}
function getOrderAlerts(){return ORDERS.map(x=>({x,a:orderAlertInfo(x)})).filter(z=>z.a).sort((p,q)=>String(p.a.due).localeCompare(String(q.a.due)))}
function syncQuoteDueDate(){const r=$('ordRequestDate')?.value;if(r&&$('ordQuoteDueDate')&&!$('ordQuoteDueDate').value)$('ordQuoteDueDate').value=addDays(r,2)}
function closeOrderAlertPopup(){$('orderAlertPopup')?.classList.remove('show')}
function openOrderFromAlert(id){closeOrderAlertPopup();document.querySelector('[data-tab="orders"]')?.click();editOrder(id)}
function orderAlertSignature(alerts=getOrderAlerts()){return today()+'|'+alerts.map(({x,a})=>x.id+':'+a.type+':'+a.due).sort().join(',')}
function showOrderAlertPopup(force=false){
 const alerts=getOrderAlerts();if(!alerts.length)return;
 const body=$('orderAlertPopupBody');if(body)body.innerHTML=alerts.map(({x,a})=>`<button class="order-alert-item" onclick="openOrderFromAlert('${x.id}')"><b>${esc(x.supplier||'Προμηθευτής')} — ${esc(x.title||x.code)}</b><span>${a.type==='quote'?'📩':'📦'} ${esc(a.label)}</span><small>Όριο: ${new Date(a.due+'T12:00:00').toLocaleDateString('el-GR')} • ${esc(x.code)}</small></button>`).join('');
 $('orderAlertPopup')?.classList.add('show');
 if(!force)localStorage.setItem('romvos_last_order_alert_signature',orderAlertSignature(alerts));
}
function updateOrderAlerts(){
 const alerts=getOrderAlerts(),b=$('orderDueBanner');
 if(b){b.textContent=alerts.length?`🔔 ${alerts.length} καθυστερημένη${alerts.length===1?'':'ες'} παραγγελία / προσφορά`:'';b.classList.toggle('show',!!alerts.length)}
 if($('ordKpiOverdue'))$('ordKpiOverdue').textContent=alerts.length;
 return alerts;
}
function checkOrderAlertsOnOpen(){const alerts=updateOrderAlerts();if(!alerts.length)return;const sig=orderAlertSignature(alerts),last=localStorage.getItem('romvos_last_order_alert_signature')||'';if(last!==sig)setTimeout(()=>showOrderAlertPopup(false),700)}
function orderStatusClass(s){
 if(s==='Αναμονή προσφοράς')return 'order-status-quote';
 if(s==='Προσφορά ελήφθη')return 'order-status-received';
 if(s==='Παραγγέλθηκε / Αναμονή παραλαβής')return 'order-status-wait';
 if(s==='Μερική παραλαβή / Αναμονή υπολοίπων')return 'order-status-partial';
 if(s==='Λάθος υλικά / Αναμονή διόρθωσης')return 'order-status-error';
 if(s==='Ολοκληρώθηκε')return 'order-status-done';
 return 'order-status-cancel';
}
function fillOrderSuppliers(){
 const dl=$('orderSuppliers');if(!dl)return;
 const suppliers=C.filter(c=>c.active!==false&&((Array.isArray(c.contactRoles)&&c.contactRoles.includes('Προμηθευτής'))||String(c.category||'').toLowerCase().includes('προμηθευ')))
  .sort((a,b)=>(a.name||'').localeCompare(b.name||'','el'));
 dl.innerHTML=suppliers.map(c=>`<option value="${esc(c.name)}"></option>`).join('');
}
function newOrder(mode='quote'){clearOrder();document.querySelector('[data-tab="orders"]')?.click();if(mode==='order'){$('ordStatus').value='Παραγγέλθηκε / Αναμονή παραλαβής';$('ordOrderDate').value=today();$('ordEditorTitle').textContent='Νέα παραγγελία'}else{$('ordStatus').value='Αναμονή προσφοράς';$('ordRequestDate').value=today();$('ordQuoteDueDate').value=addDays(today(),2);$('ordEditorTitle').textContent='Νέα ζήτηση προσφοράς'};setTimeout(()=>$('ordSupplier')?.focus(),50)}
function clearOrder(){
 ['ordId','ordCode','ordSupplier','ordTitle','ordRequestDate','ordQuoteDueDate','ordOrderDate','ordExpectedDate','ordSupplierRef','ordPaste','ordPending','ordReceivedDate','ordUpdated','ordNotes'].forEach(id=>{if($(id))$(id).value=''});
 if($('ordStatus'))$('ordStatus').value='Αναμονή προσφοράς';
 if($('ordDeleteBtn'))$('ordDeleteBtn').style.display='none';
 if($('ordEditorTitle'))$('ordEditorTitle').textContent='Νέα καταχώριση';
}
function orderDataFromForm(existing){
 const status=$('ordStatus').value;
 let orderDate=$('ordOrderDate').value,receivedDate=$('ordReceivedDate').value;
 if(status==='Παραγγέλθηκε / Αναμονή παραλαβής'&&!orderDate)orderDate=today();
 if(['Μερική παραλαβή / Αναμονή υπολοίπων','Λάθος υλικά / Αναμονή διόρθωσης','Ολοκληρώθηκε'].includes(status)&&!receivedDate)receivedDate=today();
 return {code:$('ordCode').value||(typeof nextModuleCode==='function'?nextModuleCode('ORD',ORDERS):'ORD-'+Date.now()),supplier:$('ordSupplier').value.trim(),title:$('ordTitle').value.trim(),requestDate:$('ordRequestDate').value,quoteDueDate:$('ordQuoteDueDate').value,orderDate,expectedDate:$('ordExpectedDate').value,supplierRef:$('ordSupplierRef').value.trim(),status,paste:$('ordPaste').value,pending:$('ordPending').value.trim(),receivedDate,notes:$('ordNotes').value.trim(),updatedAt:new Date().toISOString(),createdAt:existing?.createdAt||new Date().toISOString()};
}
function saveOrder(keepOpen=false,silent=false){
 const id=$('ordId').value,existing=id?ORDERS.find(x=>x.id===id):null,d=orderDataFromForm(existing);
 if(!d.supplier)return alert('Συμπλήρωσε προμηθευτή.');
 if(!d.title&&!d.paste&&!d.supplierRef)return alert('Συμπλήρωσε μια σύντομη περιγραφή ή κάνε επικόλληση της παραγγελίας / προσφοράς από το email.');
 let saved;
 if(existing){Object.assign(existing,d);saved=existing}else{saved={id:uid('ORD'),...d};ORDERS.unshift(saved)}
 saveOrdersData();renderOrders();
 if(keepOpen){editOrder(saved.id);if(!silent)alert('Η παραγγελία ενημερώθηκε.')}else{clearOrder();if(!silent)alert('Η καταχώριση αποθηκεύτηκε.')}
}
function viewOrder(id){
 const x=ORDERS.find(o=>o.id===id);if(!x)return;
 const val=v=>esc(v||'—');
 const fmtDate=v=>v?new Date(v+'T12:00:00').toLocaleDateString('el-GR'):'—';
 const statusDate=x.status==='Αναμονή προσφοράς'?orderQuoteDeadline(x):x.expectedDate;
 const alertInfo=orderAlertInfo(x);
 $('orderViewTitle').textContent='Προβολή '+(x.code||'παραγγελίας');
 $('orderViewBody').innerHTML=`
   <div class="sheet">
    <table>
      <tr><th>Κωδικός</th><td>${val(x.code)}</td><th>Κατάσταση</th><td><span class="badge ${orderStatusClass(x.status)}">${val(x.status)}</span></td></tr>
      <tr><th>Προμηθευτής</th><td colspan="3">${val(x.supplier)}</td></tr>
      <tr><th>Περιγραφή</th><td colspan="3">${val(x.title)}</td></tr>
      <tr><th>Ζήτηση προσφοράς</th><td>${fmtDate(x.requestDate)}</td><th>Απάντηση έως</th><td>${fmtDate(orderQuoteDeadline(x))}</td></tr>
      <tr><th>Ημερομηνία παραγγελίας</th><td>${fmtDate(x.orderDate)}</td><th>Αναμενόμενη παραλαβή</th><td>${fmtDate(x.expectedDate)}${alertInfo&&alertInfo.type==='order'?'<div class="bad">ΚΑΘΥΣΤΕΡΗΣΕ</div>':''}</td></tr>
      <tr><th>Αρ. προσφοράς / παραγγελίας</th><td>${val(x.supplierRef)}</td><th>Τελευταία παραλαβή</th><td>${fmtDate(x.receivedDate)}</td></tr>
      <tr><th>Τελευταία ενημέρωση</th><td colspan="3">${x.updatedAt?esc(new Date(x.updatedAt).toLocaleString('el-GR')):'—'}</td></tr>
    </table>
    <div class="subhead" style="margin-top:12px">📋 Ολόκληρη παραγγελία / προσφορά από email</div>
    <div class="order-view-paste">${x.paste?esc(x.paste):'—'}</div>
    <div class="subhead" style="margin-top:12px">⚠️ Εκκρεμότητα</div>
    <div class="order-view-pending">${x.pending?esc(x.pending):'Δεν υπάρχει εκκρεμότητα.'}</div>
    <div class="subhead" style="margin-top:12px">Σημειώσεις</div>
    <div style="white-space:pre-wrap;overflow-wrap:anywhere;border:1px solid #d8dee8;border-radius:7px;padding:10px;background:#fff">${x.notes?esc(x.notes):'—'}</div>
   </div>`;
 $('orderViewModal').classList.add('open');
}
function closeOrderView(){$('orderViewModal')?.classList.remove('open')}

function editOrder(id){
 const x=ORDERS.find(x=>x.id===id);if(!x)return;
 const map={ordId:'id',ordCode:'code',ordSupplier:'supplier',ordTitle:'title',ordRequestDate:'requestDate',ordQuoteDueDate:'quoteDueDate',ordOrderDate:'orderDate',ordExpectedDate:'expectedDate',ordSupplierRef:'supplierRef',ordStatus:'status',ordPaste:'paste',ordPending:'pending',ordReceivedDate:'receivedDate',ordNotes:'notes'};
 Object.keys(map).forEach(k=>{if($(k))$(k).value=x[map[k]]||''});
 if($('ordQuoteDueDate')&&!$('ordQuoteDueDate').value&&x.status==='Αναμονή προσφοράς'&&x.requestDate)$('ordQuoteDueDate').value=orderQuoteDeadline(x);
 if($('ordUpdated'))$('ordUpdated').value=x.updatedAt?new Date(x.updatedAt).toLocaleString('el-GR'):'';
 $('ordDeleteBtn').style.display='inline-block';$('ordEditorTitle').textContent='Επεξεργασία '+x.code;window.scrollTo({top:0,behavior:'smooth'});
}
async function deleteOrder(){
 const id=$('ordId').value,x=ORDERS.find(x=>x.id===id);if(!x)return;
 if(!(await askConfirm('Να διαγραφεί η καταχώριση '+x.code+';','Διαγραφή')))return;
 ORDERS=ORDERS.filter(o=>o.id!==id);saveOrdersData();clearOrder();renderOrders();
}
function setOrderStatus(status){
 $('ordStatus').value=status;
 if(status==='Παραγγέλθηκε / Αναμονή παραλαβής'&&!$('ordOrderDate').value)$('ordOrderDate').value=today();
 if(['Μερική παραλαβή / Αναμονή υπολοίπων','Λάθος υλικά / Αναμονή διόρθωσης','Ολοκληρώθηκε'].includes(status)&&!$('ordReceivedDate').value)$('ordReceivedDate').value=today();
 const canSave=$('ordSupplier').value.trim()&&($('ordTitle').value.trim()||$('ordPaste').value.trim()||$('ordSupplierRef').value.trim());
 if(canSave)saveOrder(true,true);
 if(['Μερική παραλαβή / Αναμονή υπολοίπων','Λάθος υλικά / Αναμονή διόρθωσης'].includes(status))setTimeout(()=>$('ordPending')?.focus(),50);
}
function orderShortText(v,n=110){v=String(v||'').replace(/\s+/g,' ').trim();return v.length>n?v.slice(0,n-1)+'…':v}
function renderOrders(){
 if(!$('ordersBody'))return;
 fillOrderSuppliers();
 const q=(($('ordSearch')?.value)||'').toLowerCase(),st=$('ordFilterStatus')?.value||'',view=$('ordFilterOpen')?.value||'open';
 let list=ORDERS.filter(x=>!st||x.status===st).filter(x=>view==='open'?!orderClosed(x):view==='closed'?orderClosed(x):true).filter(x=>!q||JSON.stringify(x).toLowerCase().includes(q));
 list.sort((a,b)=>Number(orderClosed(a))-Number(orderClosed(b))||String(b.updatedAt||'').localeCompare(String(a.updatedAt||'')));
 $('ordersBody').innerHTML=list.length?list.map(x=>{
   const alertInfo=orderAlertInfo(x),overdue=!!alertInfo,rowcls=overdue?'order-overdue':orderProblem(x)?'order-problem':'';
   const preview=orderShortText(x.paste||'',130),pending=orderShortText(x.pending||'',110);
   const pendingRow=pending?`<tr class="order-pending-row ${rowcls}"><td colspan="7"><div class="order-pending-box"><b>⚠️ Εκκρεμότητα:</b><span class="order-pending-text">${esc(pending)}</span></div></td></tr>`:'';
   return `<tr class="order-main-row ${rowcls}"><td><b>${esc(x.code)}</b><div class="small">${esc(x.supplierRef||'')}</div></td><td><b>${esc(x.supplier)}</b></td><td class="order-preview"><b>${esc(x.title||'—')}</b>${preview?`<small>${esc(preview)}</small>`:''}</td><td><span class="badge ${orderStatusClass(x.status)}">${esc(x.status)}</span></td><td>${esc(x.status==='Αναμονή προσφοράς'?(orderQuoteDeadline(x)||'—'):(x.expectedDate||'—'))}${overdue?`<div class="bad">${alertInfo.type==='quote'?'ΧΩΡΙΣ ΑΠΑΝΤΗΣΗ':'ΚΑΘΥΣΤΕΡΗΣΕ'}</div>`:''}</td><td>${x.updatedAt?new Date(x.updatedAt).toLocaleDateString('el-GR'):'—'}</td><td><div class="order-row-actions"><button class="btn light" title="Προβολή ολόκληρης παραγγελίας" onclick="viewOrder('${x.id}')"><span>👁️</span> Προβολή</button><button class="btn light" title="Επεξεργασία" onclick="editOrder('${x.id}')"><span>✏️</span> Επεξεργασία</button></div></td></tr>${pendingRow}`;
 }).join(''):'<tr><td colspan="7">Δεν υπάρχουν καταχωρίσεις με αυτά τα φίλτρα.</td></tr>';
 const quotes=ORDERS.filter(x=>x.status==='Αναμονή προσφοράς').length;
 const waiting=ORDERS.filter(x=>['Προσφορά ελήφθη','Παραγγέλθηκε / Αναμονή παραλαβής'].includes(x.status)).length;
 const problems=ORDERS.filter(orderProblem).length,done=ORDERS.filter(x=>x.status==='Ολοκληρώθηκε').length,open=ORDERS.filter(x=>!orderClosed(x)).length;
 $('ordKpiQuotes').textContent=quotes;$('ordKpiWaiting').textContent=waiting;$('ordKpiProblems').textContent=problems;$('ordKpiDone').textContent=done;
 updateOrderAlerts();
 const n=$('ordersNavCount');if(n){n.textContent=open;n.style.display=open?'inline-flex':'none'}
}
const _renderV65Orders=render;render=function(){_renderV65Orders();renderOrders()};
const _exportDataV65Orders=exportData;exportData=function(){let b=new Blob([JSON.stringify({app:'ROMVOS Service',version:'6.5.3',employees:E,vehicles:V,jobs:J,clients:C,board:B,incomingEquipment:typeof INCOMING!=='undefined'?INCOMING:[],pendingReturns:typeof RETURNS!=='undefined'?RETURNS:[],supplierOrders:ORDERS,simpleReminders:typeof SIMPLE_REMINDERS!=='undefined'?SIMPLE_REMINDERS:[]},null,2)],{type:'application/json'}),u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download='ROMVOS_Service_Backup_'+today()+'.json';a.click();URL.revokeObjectURL(u)};
clearOrder();renderOrders();checkOrderAlertsOnOpen();setInterval(checkOrderAlertsOnOpen,60000);


function movementBoardClone(){
 const main=document.querySelector('#board .board-main');
 if(!main)return null;
 const clone=main.cloneNode(true);
 clone.querySelectorAll('[draggable]').forEach(el=>el.removeAttribute('draggable'));
 clone.querySelectorAll('button,.x').forEach(el=>el.remove());
 return clone;
}
function printMovementBoard(){
 const clone=movementBoardClone();if(!clone)return alert('Δεν βρέθηκε ο Πίνακας Κίνησης.');
 const end=addDays(boardStart,4),pa=$('printArea');pa.innerHTML='';
 const wrap=document.createElement('div');wrap.className='movement-print';
 wrap.innerHTML=`<h2>ROMVOS SERVICE — Πίνακας Κίνησης Συνεργείων</h2><div class="sub">Εβδομάδα ${new Date(boardStart+'T12:00:00').toLocaleDateString('el-GR')} – ${new Date(end+'T12:00:00').toLocaleDateString('el-GR')}</div>`;
 wrap.appendChild(clone);pa.appendChild(wrap);document.body.classList.add('board-export-print');setTimeout(()=>window.print(),80);
}
function printMovementDay(){
 const date=boardSelectedDate||boardStart;
 const pa=$('printArea');pa.innerHTML='';
 const wrap=document.createElement('div');wrap.className='movement-print movement-day-print';
 const d=new Date(date+'T12:00:00');
 const dayName=d.toLocaleDateString('el-GR',{weekday:'long'});
 const dateText=d.toLocaleDateString('el-GR');
 wrap.innerHTML=`<h2>ROMVOS SERVICE — Πίνακας Κίνησης Συνεργείων</h2><div class="sub">${dayName.charAt(0).toUpperCase()+dayName.slice(1)} ${dateText}</div>`;
 const dayMain=document.createElement('div');dayMain.className='board-main day-only-main';
 const dayDates=document.createElement('div');dayDates.className='board-dates day-only-date';
 dayDates.innerHTML=`<div class="board-date selected">${dayName.charAt(0).toUpperCase()+dayName.slice(1)}<br>${dateText}</div>`;
 const dayGrid=document.createElement('div');dayGrid.className='board-grid day-only-grid';
 let count=0;
 for(let slot=1;slot<=4;slot++){
   const key=boardKey(date,slot),entry=B[key]||{};
   const hasWork=((entry.drafts||[]).length>0)||((entry.jobs||[]).length>0);
   if(!hasWork)continue;
   const source=document.querySelector(`.board-cell[data-board-key="${key}"]`);
   if(!source)continue;
   const cell=source.cloneNode(true);
   cell.querySelectorAll('[draggable]').forEach(el=>el.removeAttribute('draggable'));
   cell.querySelectorAll('button,.x').forEach(el=>el.remove());
   dayGrid.appendChild(cell);count++;
 }
 if(!count){alert('Δεν υπάρχουν συνεργεία με εργασία στην επιλεγμένη ημέρα.');return;}
 dayMain.appendChild(dayDates);dayMain.appendChild(dayGrid);wrap.appendChild(dayMain);pa.appendChild(wrap);
 document.body.classList.add('board-export-print');setTimeout(()=>window.print(),80);
}

function printSelectedCrew(){
 printMovementCrew(selectedBoardCrewSlot());
}
function printMovementCrew(slot){
 slot=Math.min(4,Math.max(1,parseInt(slot,10)||1));
 const date=boardSelectedDate||boardStart;
 const key=boardKey(date,slot),entry=B[key]||{};
 const hasWork=((entry.drafts||[]).length>0)||((entry.jobs||[]).length>0);
 if(!hasWork)return alert('Το Συνεργείο '+slot+' δεν έχει εργασίες στην επιλεγμένη ημέρα.');
 const source=document.querySelector(`.board-cell[data-board-key="${key}"]`);
 if(!source)return alert('Δεν βρέθηκε το Συνεργείο '+slot+' στον πίνακα.');
 const pa=$('printArea');pa.innerHTML='';
 const wrap=document.createElement('div');wrap.className='movement-print movement-crew-print';
 const d=new Date(date+'T12:00:00'),dayName=d.toLocaleDateString('el-GR',{weekday:'long'}),dateText=d.toLocaleDateString('el-GR');
 const page=document.createElement('section');page.className='crew-print-page';
 page.innerHTML=`<h2>ROMVOS SERVICE — Πρόγραμμα Συνεργείου ${slot}</h2><div class="sub">${dayName.charAt(0).toUpperCase()+dayName.slice(1)} ${dateText}</div>`;
 const cell=source.cloneNode(true);
 cell.querySelectorAll('[draggable]').forEach(el=>el.removeAttribute('draggable'));
 cell.querySelectorAll('button,.x').forEach(el=>el.remove());
 page.appendChild(cell);
 const crewNotes=['Δελτίο εργασίας πάντα συμπληρωμένο.','Για διευκρινίσεις σχετικά με τις εργασίες: επικοινωνία μαζί μου ή με τον υπεύθυνο μηχανικό.','Πριν την επιστροφή στην έδρα: επικοινωνία μαζί μου.'];
 const noteWrap=document.createElement('div');noteWrap.className='crew-note-wrap';
 noteWrap.innerHTML=`<ul class="crew-note-list">${crewNotes.map(t=>`<li>${esc(t)}</li>`).join('')}</ul>`;
 page.appendChild(noteWrap);wrap.appendChild(page);pa.appendChild(wrap);
 document.body.classList.add('board-export-print');setTimeout(()=>window.print(),80);
}

function printMovementDayPerCrew(){
 const date=boardSelectedDate||boardStart;
 const pa=$('printArea');pa.innerHTML='';
 const wrap=document.createElement('div');wrap.className='movement-print movement-crew-print';
 const d=new Date(date+'T12:00:00');
 const dayName=d.toLocaleDateString('el-GR',{weekday:'long'});
 const dateText=d.toLocaleDateString('el-GR');
 const crewNotes=[
   'Δελτίο εργασίας πάντα συμπληρωμένο.',
   'Για διευκρινίσεις σχετικά με τις εργασίες: επικοινωνία μαζί μου ή με τον υπεύθυνο μηχανικό.',
   'Πριν την επιστροφή στην έδρα: επικοινωνία μαζί μου.'
 ];
 let count=0;
 for(let slot=1;slot<=4;slot++){
   const key=boardKey(date,slot),entry=B[key]||{};
   const hasWork=((entry.drafts||[]).length>0)||((entry.jobs||[]).length>0);
   if(!hasWork)continue;
   const source=document.querySelector(`.board-cell[data-board-key="${key}"]`);
   if(!source)continue;
   const page=document.createElement('section');page.className='crew-print-page';
   page.innerHTML=`<h2>ROMVOS SERVICE — Πρόγραμμα Συνεργείου ${slot}</h2><div class="sub">${dayName.charAt(0).toUpperCase()+dayName.slice(1)} ${dateText}</div>`;
   const cell=source.cloneNode(true);
   cell.querySelectorAll('[draggable]').forEach(el=>el.removeAttribute('draggable'));
   cell.querySelectorAll('button,.x').forEach(el=>el.remove());
   page.appendChild(cell);
   const noteWrap=document.createElement('div');
   noteWrap.className='crew-note-wrap';
   noteWrap.innerHTML=`<ul class="crew-note-list">${crewNotes.map(t=>`<li>${esc(t)}</li>`).join('')}</ul>`;
   page.appendChild(noteWrap);
   wrap.appendChild(page);
   count++;
 }
 if(!count){alert('Δεν υπάρχουν συνεργεία με εργασία στην επιλεγμένη ημέρα.');return;}
 pa.appendChild(wrap);
 document.body.classList.add('board-export-print');
 setTimeout(()=>window.print(),80);
}

window.addEventListener('afterprint',()=>document.body.classList.remove('board-export-print'));

function crewCanvasWrap(ctx,text,maxWidth){
  const raw=String(text??'').replace(/\r\n/g,'\n').replace(/\r/g,'\n');
  const paragraphs=raw.split('\n'),lines=[];
  for(const paragraph of paragraphs){
    if(paragraph===''){
      lines.push('');
      continue;
    }
    const words=paragraph.split(/\s+/).filter(Boolean);
    let line='';
    for(const word of words){
      const test=line?line+' '+word:word;
      if(ctx.measureText(test).width>maxWidth && line){
        lines.push(line);
        line=word;
      }else{
        line=test;
      }
    }
    if(line)lines.push(line);
  }
  return lines.length?lines:['—'];
}
/* v28 — WYSIWYG wrapping: η εικόνα Viber ακολουθεί την οπτική αναδίπλωση του editor */
/* v29 — Viber readability: δυναμικό πλάτος στο πραγματικό περιεχόμενο, μεγαλύτερο κείμενο, λιγότερος κενός χώρος */
function crewEditorMetrics(){
  const editorBoxW=Math.min(920,window.innerWidth*0.96);
  const fontSize=window.innerWidth<=700?15:17;
  // draft-editor-box: border-box + 16px padding ανά πλευρά
  // rich-note-editor: 1px border + 16px padding ανά πλευρά
  const textWidth=Math.max(220,editorBoxW-66);
  return {fontSize,textWidth};
}
function crewTaskMeasureFont(ctx,bold,size){
  ctx.font=(bold?'700':'400')+' '+size+'px "Segoe UI", Arial, sans-serif';
}
function crewTaskFont(ctx,bold,size=30){
  ctx.font=(bold?'800':'600')+' '+size+'px "Segoe UI", Arial, sans-serif';
}
function crewRichWrap(ctx,task,editorWidth,editorSize){
  const source=(task&&task.richTitle)?task.richTitle:plainToRich(task&&task.title||'');
  const tokens=richTokensFromHTML(source);
  const lines=[[]];let width=0,pendingSpace=false;
  const current=()=>lines[lines.length-1];
  const newline=()=>{lines.push([]);width=0;pendingSpace=false};
  // Η μέτρηση γίνεται με τα ίδια βασικά metrics που βλέπει ο χρήστης στον editor.
  const runWidth=(text,bold)=>{crewTaskMeasureFont(ctx,bold,editorSize);return ctx.measureText(text).width};
  const addRun=(text,style)=>{
    if(!text)return;
    const line=current(),last=line[line.length-1];
    if(last&&last.bold===!!style.bold&&last.red===!!style.red)last.text+=text;
    else line.push({text,bold:!!style.bold,red:!!style.red});
    width+=runWidth(text,style.bold);
  };
  const addWord=(word,style)=>{
    let prefix=pendingSpace&&current().length?' ':'';
    let text=prefix+word,measure=runWidth(text,style.bold);
    if(width+measure>editorWidth&&current().length){
      newline();prefix='';text=word;measure=runWidth(text,style.bold);
    }
    // overflow-wrap:anywhere του editor για μία πολύ μεγάλη λέξη.
    if(measure>editorWidth&&!current().length){
      let part='';
      for(const ch of word){
        const test=part+ch;
        if(runWidth(test,style.bold)>editorWidth&&part){addRun(part,style);newline();part=ch}else part=test;
      }
      if(part)addRun(part,style);
    }else addRun(text,style);
    pendingSpace=false;
  };
  tokens.forEach(t=>{
    if(t.break){newline();return;}
    String(t.text||'').split(/(\s+)/).forEach(part=>{
      if(!part)return;
      if(/^\s+$/.test(part)){pendingSpace=true;return;}
      addWord(part,t);
    });
  });
  while(lines.length>1&&!lines[lines.length-1].length)lines.pop();
  if(!lines.length||!lines.some(l=>l.length))return [[{text:'—',bold:false,red:false}]];
  return lines;
}
function crewDrawRichLine(ctx,line,x,y,size=30){
  let px=x;
  (line||[]).forEach(run=>{
    crewTaskFont(ctx,run.bold,size);
    ctx.fillStyle=run.red?'#dc2626':'#172033';
    ctx.fillText(run.text||'',px,y);
    px+=ctx.measureText(run.text||'').width;
  });
}
function crewImageData(date,slot){
  const key=boardKey(date,slot),entry=B[key]||{};
  const emps=(entry.emps||[]).map(id=>E.find(e=>e.id===id)).filter(Boolean).map(e=>e.name);
  const vehs=(entry.vehs||[]).map(id=>V.find(v=>v.id===id)).filter(Boolean).map(v=>[v.model,v.plate].filter(Boolean).join(' • ')||'Χωρίς στοιχεία οχήματος');
  const drafts=(entry.drafts||[]).map(id=>D.find(d=>d.id===id)).filter(Boolean).map(d=>({title:d.title||'Πρόχειρη εργασία',richTitle:d.richTitle||''}));
  const jobs=(entry.jobs||[]).map(id=>J.find(j=>j.id===id)).filter(Boolean).map(j=>({title:j.client||j.code||j.type||'Εργασία',richTitle:''}));
  return {key,emps,vehs,tasks:[...drafts,...jobs]};
}
async function exportCrewImage(date,slot){
  const data=crewImageData(date,slot);
  if(!data.tasks.length){
    alert('Το Συνεργείο '+slot+' δεν έχει εργασία αυτή την ημέρα.');
    return;
  }

  const editorMetrics=crewEditorMetrics();
  const taskDrawSize=34;
  // v29 — κρατάμε ΑΚΡΙΒΩΣ τις ίδιες γραμμές με τον editor, αλλά η εικόνα
  // δεν κρατά πλέον άδειο πλάτος μόνο και μόνο επειδή ο editor είναι φαρδύς.
  // Το τελικό πλάτος προσαρμόζεται στο πραγματικό περιεχόμενο, ώστε στο Viber
  // τα γράμματα να φαίνονται μεγαλύτερα χωρίς zoom.
  const pad=38;
  const d=new Date(date+'T12:00:00');
  const day=d.toLocaleDateString('el-GR',{weekday:'long'});
  const dateText=d.toLocaleDateString('el-GR');
  const crewNotes=[
    'Δελτίο εργασίας πάντα συμπληρωμένο.',
    'Για διευκρινίσεις σχετικά με τις εργασίες: επικοινωνία μαζί μου ή με τον υπεύθυνο μηχανικό.',
    'Πριν την επιστροφή στην έδρα: επικοινωνία μαζί μου.'
  ];

  // Πρώτα μετράμε ΑΚΡΙΒΩΣ τις γραμμές του editor.
  const m=document.createElement('canvas').getContext('2d');
  const taskLayouts=data.tasks.map(task=>{
    const lines=crewRichWrap(m,task,editorMetrics.textWidth,editorMetrics.fontSize);
    return {task,lines};
  });

  // Μετράμε πόσο πλάτος χρειάζονται πραγματικά αυτές οι ίδιες γραμμές
  // στο μεγαλύτερο μέγεθος γραμματοσειράς της εικόνας.
  const richLineWidth=(line)=>{
    let total=0;
    (line||[]).forEach(run=>{
      crewTaskFont(m,run.bold,taskDrawSize);
      total+=m.measureText(run.text||'').width;
    });
    return total;
  };
  let widestTaskLine=0;
  taskLayouts.forEach(item=>item.lines.forEach(line=>{widestTaskLine=Math.max(widestTaskLine,richLineWidth(line));}));

  // 68px για αρίθμηση/κενό πριν το κείμενο. Κατώτατο 980px για καθαρή κάρτα,
  // αλλά χωρίς το παλιό αναγκαστικό πολύ μεγάλο πλάτος του editor.
  const W=Math.max(980,Math.ceil(widestTaskLine+pad*2+82));
  const contentW=W-pad*2;

  m.font='700 28px Arial';
  const empText=data.emps.length?data.emps.join(' • '):'Δεν έχουν οριστεί τεχνικοί';
  const empLines=crewCanvasWrap(m,empText,contentW);

  m.font='700 28px Arial';
  const vehText=data.vehs.length?data.vehs.join(' • '):'Δεν έχει οριστεί VAN';
  const vehLines=crewCanvasWrap(m,vehText,contentW);

  taskLayouts.forEach(item=>{
    item.boxH=Math.max(88,38+item.lines.length*42);
  });

  m.font='600 18px Arial';
  const noteLayouts=crewNotes.map(note=>{
    const lines=crewCanvasWrap(m,note,contentW-34);
    return {note,lines,blockH:lines.length*25};
  });

  // Σφιχτό, πραγματικό ύψος: χωρίς μεγάλο κενό κάτω από το περιεχόμενο.
  let H=122;                    // header
  H+=36+38+2;                  // ημερομηνία + διαχωριστική
  H+=34+42+empLines.length*33; // τεχνικοί
  H+=42+vehLines.length*33;    // VAN
  H+=22+30;                    // τίτλος ΕΡΓΑΣΙΕΣ
  H+=taskLayouts.reduce((sum,t)=>sum+14+t.boxH,0);
  H+=20;                       // κενό πριν τις σημειώσεις
  H+=2+18;                     // διαχωριστική + κενό
  H+=noteLayouts.reduce((sum,n)=>sum+9+n.blockH,0);
  H+=24;                       // κάτω περιθώριο
  H=Math.max(620,H);

  const c=document.createElement('canvas');
  c.width=W;c.height=H;
  const ctx=c.getContext('2d');
  ctx.fillStyle='#ffffff';ctx.fillRect(0,0,W,H);

  ctx.fillStyle='#111827';ctx.fillRect(0,0,W,122);
  ctx.fillStyle='#ffffff';
  ctx.font='800 40px Arial';ctx.fillText('ROMVOS SERVICE',pad,52);
  ctx.font='700 28px Arial';ctx.fillText('Πρόγραμμα Συνεργείου '+slot,pad,96);

  let y=156;
  ctx.fillStyle='#172033';ctx.font='800 32px Arial';
  const title=day.charAt(0).toUpperCase()+day.slice(1)+' '+dateText;
  ctx.fillText(title,pad,y);

  y+=38;
  ctx.strokeStyle='#d8dee8';ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(pad,y);ctx.lineTo(W-pad,y);ctx.stroke();

  y+=34;
  ctx.fillStyle='#475569';ctx.font='800 21px Arial';ctx.fillText('ΤΕΧΝΙΚΟΙ',pad,y);
  ctx.fillStyle='#172033';ctx.font='700 28px Arial';
  empLines.forEach((ln,i)=>ctx.fillText(ln,pad,y+34+i*33));
  y+=42+empLines.length*33;

  ctx.fillStyle='#475569';ctx.font='800 21px Arial';ctx.fillText('VAN / ΟΧΗΜΑ',pad,y);
  ctx.fillStyle='#172033';ctx.font='700 28px Arial';
  vehLines.forEach((ln,i)=>ctx.fillText(ln,pad,y+34+i*33));
  y+=42+vehLines.length*33;

  ctx.fillStyle='#475569';ctx.font='800 21px Arial';ctx.fillText('ΕΡΓΑΣΙΕΣ',pad,y);
  y+=22;

  taskLayouts.forEach((item,idx)=>{
    y+=14;
    ctx.fillStyle='#f8fafc';
    ctx.strokeStyle='#cbd5e1';ctx.lineWidth=2;
    ctx.beginPath();
    if(ctx.roundRect)ctx.roundRect(pad,y,contentW,item.boxH,16);
    else ctx.rect(pad,y,contentW,item.boxH);
    ctx.fill();ctx.stroke();

    ctx.fillStyle='#2563eb';
    ctx.beginPath();ctx.arc(pad+30,y+32,16,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#ffffff';ctx.font='800 17px Arial';
    ctx.textAlign='center';ctx.fillText(String(idx+1),pad+30,y+38);ctx.textAlign='left';

    item.lines.forEach((ln,i)=>crewDrawRichLine(ctx,ln,pad+64,y+40+i*42,taskDrawSize));
    y+=item.boxH;
  });

  y+=20;
  ctx.strokeStyle='#d8dee8';ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(pad,y);ctx.lineTo(W-pad,y);ctx.stroke();
  y+=18;

  ctx.font='600 18px Arial';
  noteLayouts.forEach(item=>{
    ctx.fillStyle='#2563eb';
    ctx.beginPath();ctx.arc(pad+7,y+6,4,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#475569';
    item.lines.forEach((ln,i)=>ctx.fillText(ln,pad+24,y+12+i*25));
    y+=item.blockH+9;
  });

  c.toBlob(async blob=>{
    if(!blob){alert('Δεν ήταν δυνατή η δημιουργία εικόνας.');return;}

    try{
      if(navigator.clipboard && window.ClipboardItem){
        await navigator.clipboard.write([new ClipboardItem({'image/png':blob})]);
        let toast=document.getElementById('crewCopyToast');
        if(!toast){
          toast=document.createElement('div');
          toast.id='crewCopyToast';
          document.body.appendChild(toast);
        }
        toast.textContent='✅ Συνεργείο '+slot+': αντιγράφηκαν '+data.tasks.length+' εργασίες. Άνοιξε Viber και πάτησε Ctrl+V.';
        toast.classList.add('show');
        setTimeout(()=>toast.classList.remove('show'),5000);
        return;
      }
    }catch(e){}

    try{
      const filename=`ROMVOS_Synergeio_${slot}_${date.replaceAll('-','_')}.png`;
      const file=new File([blob],filename,{type:'image/png'});
      if(navigator.share && (!navigator.canShare || navigator.canShare({files:[file]}))){
        await navigator.share({
          files:[file],
          title:`ROMVOS SERVICE — Συνεργείο ${slot}`,
          text:`Πρόγραμμα Συνεργείου ${slot} — ${dateText}`
        });
        return;
      }
    }catch(e){
      if(e && e.name==='AbortError')return;
    }

    const filename=`ROMVOS_Synergeio_${slot}_${date.replaceAll('-','_')}.png`;
    const u=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=u;a.download=filename;document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(u),1500);
    alert('Η εικόνα του Συνεργείου '+slot+' αποθηκεύτηκε με '+data.tasks.length+' εργασίες.');
  },'image/png');
}
function exportMovementBoardImage(){
 const main=document.querySelector('#board .board-main');if(!main)return alert('Δεν βρέθηκε ο Πίνακας Κίνησης.');
 const clone=main.cloneNode(true);clone.querySelectorAll('button,.x').forEach(el=>el.remove());
 const W=Math.max(1400,main.scrollWidth),H=Math.max(800,main.scrollHeight);
 const styles=[...document.querySelectorAll('style')].map(s=>s.textContent).join('\n');
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml"><style>${styles}</style><div class="board-mode" style="background:white;width:${W}px;min-height:${H}px">${clone.outerHTML}</div></div></foreignObject></svg>`;
 const b=new Blob([svg],{type:'image/svg+xml;charset=utf-8'}),u=URL.createObjectURL(b),img=new Image();
 img.onload=()=>{const c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,W,H);x.drawImage(img,0,0);URL.revokeObjectURL(u);c.toBlob(p=>{if(!p)return alert('Δεν ήταν δυνατή η δημιουργία εικόνας.');const pu=URL.createObjectURL(p),a=document.createElement('a');a.href=pu;a.download='ROMVOS_Pinakas_Kinisis_'+boardStart+'.png';a.click();setTimeout(()=>URL.revokeObjectURL(pu),1000)},'image/png')};
 img.onerror=()=>{URL.revokeObjectURL(u);alert('Η εξαγωγή εικόνας δεν υποστηρίχθηκε από αυτόν τον browser.');};img.src=u;
}
