
/* v6.5.41 — Viber στις Εκκρεμείς Επιστροφές */
function romvosReturnViberDate(v){
  if(!v)return '—';
  const m=String(v).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m?`${m[3]}/${m[2]}/${m[1]}`:String(v);
}
function viberReturn(id){
  const x=(typeof RETURNS!=='undefined'?RETURNS:[]).find(r=>r&&r.id===id);
  if(!x)return;
  const val=v=>String(v??'').trim();
  const lines=[
    '🔄 Εκκρεμής επιστροφή',
    '',
    `👤 Επαφή: ${val(x.contact)||'—'}`,
    `📦 Τι στείλαμε: ${val(x.sentItem)||'—'}`,
    `📅 Πότε το στείλαμε: ${romvosReturnViberDate(x.sendDate)}`,
    `↩️ Τι περιμένουμε πίσω: ${val(x.expectedItem)||'—'}`
  ];
  if(val(x.deliveryNote))lines.push(`📄 Δελτίο Αποστολής: ${val(x.deliveryNote)}`);
  if(val(x.invoice))lines.push(`🧾 Τιμολόγιο / Πιστωτικό: ${val(x.invoice)}`);
  if(val(x.notes))lines.push(`💬 Σημειώσεις: ${val(x.notes)}`);
  const full=lines.join('\n');
  const short=[val(x.contact),val(x.sentItem)].filter(Boolean).join(' — ')||'Εκκρεμής επιστροφή';
  if(typeof viberSend==='function')viberSend(full,short);
  else if(typeof copyTextSafe==='function')copyTextSafe(full).then(()=>alert('Το μήνυμα αντιγράφηκε στο πρόχειρο.'));
}
