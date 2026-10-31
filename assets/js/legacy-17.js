
(function(){
  'use strict';
  const KEY='romvos_simple_reminders';
  const SEED=[{"id":"REM-ms7bjxaulpw","text":"ΑΝΑΜΕΝΕΤΑΙ Η ΜΟΝΑΔΑ ΓΙΑ ΤΡΑΠΕΖΑ ΕΛΛΑΔΟΣ","date":"2026-09-15","time":"09:00","done":false,"notified":false,"createdAt":"2026-07-30T09:36:24.150Z"},{"id":"REM-msctow92k66","text":"ΚΑΛΥΒΑΣ ΠΑΥΛΟΣ ΔΕΝ ΕΧΩ ΔΕΛΤΙΟ ΑΠΟ ΕΝΡΓ-00007849","date":"2026-08-15","time":"19:44","done":false,"notified":false,"createdAt":"2026-08-03T06:03:00.038Z"},{"id":"REM-msctqajq8i7","text":"ΚΑΛΥΒΑΣ ΠΑΥΛΟΣ ΠΟΤΕ ΘΑ ΣΥΝΕΧΙΣΕΙ ΣΥΝΤΗΡΗΣΗ ΣΤΟ PALACE;;;","date":"2026-08-15","time":"09:00","done":false,"notified":false,"createdAt":"2026-08-03T06:04:05.222Z"},{"id":"REM-msefrn05uwr","text":"ΤΣΑΛΟΥΜΗΣ ΣΥΝΤΗΡΗΣΗ ΜΑΣΟΥΤΗΣ","date":"2026-08-15","time":"11:17","done":false,"notified":false,"createdAt":"2026-08-04T09:08:45.750Z"},{"id":"REM-msfpwo342cu","text":"ELECTRA PALACE ΔΙΚΤΥΟ ΕΞΑΕΡΙΣΜΟΥ ΧΩΡΟΥ ΚΑΒΑΣ ΑΝ ΕΧΕΙ ΟΛΟΚΛΗΡΩΣΕΙ Ο ΚΑΛΥΒΑΣ ΝΑ ΤΙΜΟΛΟΓΗΣΟΥΜΕ","date":"2026-08-15","time":"09:00","done":false,"notified":false,"createdAt":"2026-08-05T06:40:22.768Z"},{"id":"REM-mspp1f4d74g","text":"ΚΟΚΚΙΝΟΥ -ΠΛΙΑΤΣΙΚΑΣ ΕΝΗΜΕΡΩΣΗ","date":"2026-08-17","time":"09:00","done":false,"notified":false,"createdAt":"2026-08-12T06:13:46.573Z"},{"id":"REM-msq1xbs0k67","text":"ΤΣΑΓΚΑΛΙΔΗΣ ΧΡΗΜΑΤΑ ΓΙΑ ΕΠΙΣΚΕΥΗ ΠΛΑΚΕΤΩΝ 100 ΕΥΡΩ","date":"2026-08-25","time":"09:00","done":false,"notified":false,"createdAt":"2026-08-12T12:57:30.624Z"},{"id":"REM-msrdoke3i90","text":"ΕΣΤΕΙΛΑ 14/8 ΠΛΑΚΕΤΑ MAIN ΣΤΟΝ ΓΚΑΓΚΑ.ΠΕΡΙΜΕΝΩ ΤΑ 200 ΕΥΡΩ ΑΡ.ΑΠΟΣΤΟΛΗΣ 5824741473","date":"2026-08-19","time":"09:00","done":false,"notified":false,"createdAt":"2026-08-13T10:31:23.451Z"}];
  let mem=null;
  const q=id=>document.getElementById(id);
  const clone=x=>JSON.parse(JSON.stringify(x));
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const uid=()=> 'REM-'+Date.now().toString(36)+Math.random().toString(36).slice(2,7);
  const ymd=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
  function read(){
    try{
      const raw=localStorage.getItem(KEY);
      if(raw!==null){
        const arr=JSON.parse(raw);
        if(Array.isArray(arr)){mem=arr;return mem}
      }
    }catch(e){}
    if(!Array.isArray(mem))mem=clone(SEED);
    return mem;
  }
  function write(arr){
    mem=Array.isArray(arr)?arr:[];
    try{localStorage.setItem(KEY,JSON.stringify(mem))}catch(e){}
    return mem;
  }
  function moment(r){
    const d=r?.date||ymd(), t=r?.time||'09:00';
    const x=new Date(d+'T'+t+':00');
    return isNaN(x)?new Date(8640000000000000):x;
  }
  function syncLegacy(arr){
    /* Αν το παλιό global υπάρχει, το συγχρονίζουμε. Αν όχι, δεν αποτυγχάνουμε. */
    try{if(typeof SIMPLE_REMINDERS!=='undefined')SIMPLE_REMINDERS=arr}catch(e){}
  }
  function clearForm(){
    if(q('simpleRemId'))q('simpleRemId').value='';
    if(q('simpleRemText'))q('simpleRemText').value='';
    if(q('simpleRemDate'))q('simpleRemDate').value=ymd();
    if(q('simpleRemTime'))q('simpleRemTime').value='09:00';
    q('simpleRemText')?.focus();
  }
  function render(){
    const el=q('simpleReminderList'); if(!el)return;
    const now=new Date(), list=[...read()].sort((a,b)=>moment(a)-moment(b));
    syncLegacy(list);
    el.innerHTML=list.length?list.map(r=>{
      const due=!r.done&&moment(r)<=now;
      const ds=new Date((r.date||ymd())+'T12:00:00');
      const dateText=isNaN(ds)?esc(r.date||''):ds.toLocaleDateString('el-GR');
      return `<div class="reminder-row ${due?'due':''} ${r.done?'done':''}" data-rem-id="${esc(r.id||'')}">
        <div class="reminder-icon">${r.done?'✅':due?'🔔':'🕒'}</div>
        <div class="reminder-text"><b>${esc(r.text||'')}</b><small>${r.done?'Ολοκληρωμένη':due?'Η υπενθύμιση έχει φτάσει':'Προγραμματισμένη'}</small></div>
        <div class="reminder-when"><b>${dateText}</b> • ${esc(r.time||'09:00')}</div>
        <div class="actions">
          <button type="button" class="btn ${r.done?'light':'good'}" data-rem-action="toggle" data-rem-id="${esc(r.id||'')}">${r.done?'↩ Επαναφορά':'✓ Έγινε'}</button>
          <button type="button" class="btn light romvos-rem-icon" data-rem-action="edit" data-rem-id="${esc(r.id||'')}" title="Επεξεργασία" aria-label="Επεξεργασία">✏️</button>
          <button type="button" class="btn light romvos-rem-icon" data-rem-action="viber" data-rem-id="${esc(r.id||'')}" title="Αποστολή υπενθύμισης στο Viber" aria-label="Αποστολή υπενθύμισης στο Viber">📨</button>
          <button type="button" class="btn danger romvos-rem-icon" data-rem-action="delete" data-rem-id="${esc(r.id||'')}" title="Διαγραφή" aria-label="Διαγραφή">🗑️</button>
        </div>
      </div>`;
    }).join(''):'<div class="small">Δεν υπάρχουν υπενθυμίσεις.</div>';
    const dueCount=list.filter(r=>!r.done&&moment(r)<=now).length;
    const pendingCount=list.filter(r=>!r.done).length;
    const nav=q('reminderNavCount');
    if(nav){nav.textContent=pendingCount;nav.style.display=pendingCount?'inline-flex':'none'}
    const rn=q('remNow');
    if(rn)rn.innerHTML=dueCount?`<button class="btn light" onclick="document.querySelector('nav button[data-tab=&quot;reminders&quot;]')?.click()">🔔 ${dueCount} υπενθύμιση${dueCount===1?'':'εις'}</button>`:'<span class="small">Καμία υπενθύμιση που έχει λήξει</span>';
  }
  function edit(id){
    const r=read().find(x=>String(x.id)===String(id)); if(!r)return;
    if(q('simpleRemId'))q('simpleRemId').value=r.id||'';
    if(q('simpleRemText'))q('simpleRemText').value=r.text||'';
    if(q('simpleRemDate'))q('simpleRemDate').value=r.date||ymd();
    if(q('simpleRemTime'))q('simpleRemTime').value=r.time||'09:00';
    try{q('simpleRemText')?.scrollIntoView({behavior:'smooth',block:'center'})}catch(e){}
    setTimeout(()=>q('simpleRemText')?.focus(),100);
  }
  function save(){
    const text=String(q('simpleRemText')?.value||'').trim();
    const date=String(q('simpleRemDate')?.value||'');
    const time=String(q('simpleRemTime')?.value||'09:00');
    const id=String(q('simpleRemId')?.value||'');
    if(!text){alert('Γράψε τη σημείωση της υπενθύμισης.');return}
    if(!date){alert('Διάλεξε ημερομηνία.');return}
    const arr=read(); const i=id?arr.findIndex(r=>String(r.id)===id):-1;
    if(i>=0){
      arr[i]={...arr[i],text,date,time,notified:false};
    }else{
      arr.push({id:uid(),text,date,time,done:false,notified:false,createdAt:new Date().toISOString()});
    }
    write(arr); syncLegacy(arr); clearForm(); render();
    try{window.updateReminderDueBanner?.()}catch(e){}
  }
  function toggle(id){
    const arr=read(), r=arr.find(x=>String(x.id)===String(id)); if(!r)return;
    r.done=!r.done; r.notified=!!r.done; write(arr); syncLegacy(arr); render();
    try{window.updateReminderDueBanner?.()}catch(e){}
  }
  function sendViber(id){
    const r=read().find(x=>String(x.id)===String(id)); if(!r)return;
    const task=String(r.text||'').trim();
    if(!task)return;
    const full=[
      '💡 Ευγενική υπενθύμιση',
      '🛠️ '+task
    ].join('\n');
    const short='💡 Ευγενική υπενθύμιση — '+task;
    if(typeof window.viberSend==='function')window.viberSend(full,short);
    else if(typeof viberSend==='function')viberSend(full,short);
    else{
      try{navigator.clipboard?.writeText(full)}catch(e){}
      try{window.open('viber://forward?text='+encodeURIComponent(short.slice(0,90)),'_blank')}catch(e){}
    }
  }
  function del(id){
    if(!confirm('Να διαγραφεί η υπενθύμιση;'))return;
    const arr=read().filter(r=>String(r.id)!==String(id)); write(arr); syncLegacy(arr);
    if(String(q('simpleRemId')?.value||'')===String(id))clearForm();
    render();
  }
  function bind(){
    const el=q('simpleReminderList'); if(!el||el.dataset.v6530Bound==='1')return;
    el.dataset.v6530Bound='1';
    el.addEventListener('click',e=>{
      const b=e.target.closest('button[data-rem-action]'); if(!b)return;
      e.preventDefault(); e.stopPropagation();
      const id=b.dataset.remId, a=b.dataset.remAction;
      if(a==='edit')edit(id); else if(a==='toggle')toggle(id); else if(a==='viber')sendViber(id); else if(a==='delete')del(id);
    });
  }

  /* Αυτές οι συναρτήσεις υπερισχύουν των παλιών μόνο για το module Απλών Υπενθυμίσεων. */
  window.renderSimpleReminders=render;
  window.editSimpleReminder=edit;
  window.toggleSimpleReminder=toggle;
  window.deleteSimpleReminder=del;
  window.viberSimpleReminder=sendViber;
  window.saveSimpleReminder=save;
  window.clearSimpleReminder=clearForm;

  function init(){
    bind(); render();
    /* δεύτερο render μετά από όλους τους παλιούς DOMContentLoaded handlers */
    setTimeout(render,50);
    setTimeout(render,400);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
