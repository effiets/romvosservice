
/* v6.5.27 — Απλές Υπενθυμίσεις: σαφή κουμπιά Επεξεργασία / Διαγραφή και edit mode */
(function(){
  const q=id=>document.getElementById(id);
  function formPanel(){return q('simpleRemText')?.closest('.panel')||null}
  function ensureUi(){
    const panel=formPanel(); if(!panel)return;
    if(!q('simpleReminderEditBanner')){
      const b=document.createElement('div');b.id='simpleReminderEditBanner';b.textContent='✏️ Επεξεργασία υπενθύμισης';
      const hidden=q('simpleRemId'); if(hidden)hidden.insertAdjacentElement('afterend',b); else panel.prepend(b);
    }
    const saveBtn=panel.querySelector('button[onclick="saveSimpleReminder()"]');if(saveBtn)saveBtn.id='simpleReminderSaveBtn';
    const clearBtn=panel.querySelector('button[onclick="clearSimpleReminder()"]');if(clearBtn)clearBtn.id='simpleReminderClearBtn';
  }
  function setEditMode(on){
    ensureUi();
    const panel=formPanel(),banner=q('simpleReminderEditBanner'),saveBtn=q('simpleReminderSaveBtn'),clearBtn=q('simpleReminderClearBtn');
    panel?.classList.toggle('reminder-editing',!!on);banner?.classList.toggle('show',!!on);
    if(saveBtn)saveBtn.textContent=on?'💾 Αποθήκευση αλλαγών':'Αποθήκευση';
    if(clearBtn)clearBtn.textContent=on?'Ακύρωση':'Καθαρισμός';
  }

  window.editSimpleReminder=function(id){
    const r=(Array.isArray(SIMPLE_REMINDERS)?SIMPLE_REMINDERS:[]).find(x=>String(x.id)===String(id));
    if(!r)return;
    ensureUi();
    q('simpleRemId').value=r.id||'';
    q('simpleRemText').value=r.text||'';
    q('simpleRemDate').value=r.date||today();
    q('simpleRemTime').value=r.time||'09:00';
    setEditMode(true);
    const panel=formPanel();
    try{panel?.scrollIntoView({behavior:'smooth',block:'start'})}catch(e){window.scrollTo(0,0)}
    setTimeout(()=>{try{q('simpleRemText')?.focus()}catch(e){}},250);
  };

  const oldClear=window.clearSimpleReminder;
  window.clearSimpleReminder=function(){
    if(typeof oldClear==='function')oldClear();
    else{
      if(q('simpleRemId'))q('simpleRemId').value='';
      if(q('simpleRemText'))q('simpleRemText').value='';
      if(q('simpleRemDate'))q('simpleRemDate').value=today();
      if(q('simpleRemTime'))q('simpleRemTime').value='09:00';
    }
    setEditMode(false);
  };

  const oldSave=window.saveSimpleReminder;
  window.saveSimpleReminder=function(){
    const wasEditing=!!q('simpleRemId')?.value;
    if(typeof oldSave==='function')oldSave();
    setTimeout(()=>setEditMode(false),0);
  };

  window.deleteSimpleReminder=async function(id){
    if(!(await askConfirm('Να διαγραφεί οριστικά η υπενθύμιση;')))return;
    SIMPLE_REMINDERS=(Array.isArray(SIMPLE_REMINDERS)?SIMPLE_REMINDERS:[]).filter(r=>String(r.id)!==String(id));
    saveSimpleReminders();
    if(String(q('simpleRemId')?.value||'')===String(id))window.clearSimpleReminder();
    renderSimpleReminders();
  };

  window.renderSimpleReminders=function(){
    const listEl=q('simpleReminderList');if(!listEl)return;
    const now=new Date(), list=[...(Array.isArray(SIMPLE_REMINDERS)?SIMPLE_REMINDERS:[])].sort((a,b)=>simpleReminderMoment(a)-simpleReminderMoment(b));
    listEl.innerHTML=list.length?list.map(r=>{
      const due=!r.done&&simpleReminderMoment(r)<=now;
      return `<div class="reminder-row ${due?'due':''} ${r.done?'done':''}"><div class="reminder-icon">${r.done?'✅':due?'🔔':'🕒'}</div><div class="reminder-text"><b>${esc(r.text)}</b><small>${r.done?'Ολοκληρωμένη':due?'Η υπενθύμιση έχει φτάσει':'Προγραμματισμένη'}</small></div><div class="reminder-when"><b>${new Date((r.date||today())+'T12:00:00').toLocaleDateString('el-GR')}</b> • ${esc(r.time||'09:00')}</div><div class="actions"><button class="btn ${r.done?'light':'good'}" onclick="toggleSimpleReminder('${r.id}')">${r.done?'↩ Επαναφορά':'✓ Έγινε'}</button><button class="btn light" title="Επεξεργασία" aria-label="Επεξεργασία" onclick="editSimpleReminder('${r.id}')">✏️</button><button class="btn danger" title="Διαγραφή" aria-label="Διαγραφή" onclick="deleteSimpleReminder('${r.id}')">🗑️</button></div></div>`;
    }).join(''):'<div class="small">Δεν υπάρχουν υπενθυμίσεις.</div>';
    const dueCount=list.filter(r=>!r.done&&simpleReminderMoment(r)<=now).length;
    if(q('reminderNavCount')){q('reminderNavCount').textContent=dueCount;q('reminderNavCount').style.display=dueCount?'inline-flex':'none'}
    if(q('remNow'))q('remNow').innerHTML=dueCount?`<button class="btn light" onclick="openSimpleReminders()">🔔 ${dueCount} υπενθύμιση${dueCount===1?'':'εις'}</button>`:'<span class="small">Καμία εκκρεμής υπενθύμιση</span>';
  };

  function init(){ensureUi();setEditMode(!!q('simpleRemId')?.value);try{renderSimpleReminders()}catch(e){console.error('v6.5.27 reminders render',e)}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
