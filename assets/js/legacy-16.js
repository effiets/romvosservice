
/* ΜΟΝΟ οι Απλές Υπενθυμίσεις. Δεν γίνεται καμία μεταβολή/εκκαθάριση localStorage. */
(function(){
  const q=id=>document.getElementById(id);

  window.editSimpleReminder=function(id){
    const r=(Array.isArray(SIMPLE_REMINDERS)?SIMPLE_REMINDERS:[]).find(x=>String(x.id)===String(id));
    if(!r)return;
    if(q('simpleRemId'))q('simpleRemId').value=r.id||'';
    if(q('simpleRemText'))q('simpleRemText').value=r.text||'';
    if(q('simpleRemDate'))q('simpleRemDate').value=r.date||today();
    if(q('simpleRemTime'))q('simpleRemTime').value=r.time||'09:00';
    const panel=q('simpleRemText')?.closest('.panel');
    panel?.classList.remove('reminder-editing');
    const saveBtn=panel?.querySelector('button[onclick="saveSimpleReminder()"]');
    const clearBtn=panel?.querySelector('button[onclick="clearSimpleReminder()"]');
    if(saveBtn)saveBtn.textContent='Αποθήκευση';
    if(clearBtn)clearBtn.textContent='Καθαρισμός';
    window.scrollTo(0,0);
    setTimeout(()=>q('simpleRemText')?.focus(),50);
  };

  window.deleteSimpleReminder=async function(id){
    if(!(await askConfirm('Να διαγραφεί η υπενθύμιση;')))return;
    SIMPLE_REMINDERS=(Array.isArray(SIMPLE_REMINDERS)?SIMPLE_REMINDERS:[]).filter(r=>String(r.id)!==String(id));
    saveSimpleReminders();
    if(String(q('simpleRemId')?.value||'')===String(id)){
      if(q('simpleRemId'))q('simpleRemId').value='';
      if(q('simpleRemText'))q('simpleRemText').value='';
      if(q('simpleRemDate'))q('simpleRemDate').value=today();
      if(q('simpleRemTime'))q('simpleRemTime').value='09:00';
    }
    window.renderSimpleReminders();
  };

  window.renderSimpleReminders=function(){
    const el=q('simpleReminderList');if(!el)return;
    const now=new Date();
    const list=[...(Array.isArray(SIMPLE_REMINDERS)?SIMPLE_REMINDERS:[])].sort((a,b)=>simpleReminderMoment(a)-simpleReminderMoment(b));
    el.innerHTML=list.length?list.map(r=>{
      const due=!r.done&&simpleReminderMoment(r)<=now;
      return `<div class="reminder-row ${due?'due':''} ${r.done?'done':''}"><div class="reminder-icon">${r.done?'✅':due?'🔔':'🕒'}</div><div class="reminder-text"><b>${esc(r.text)}</b><small>${due?'Η υπενθύμιση έχει φτάσει':'Προγραμματισμένη'}</small></div><div class="reminder-when"><b>${new Date((r.date||today())+'T12:00:00').toLocaleDateString('el-GR')}</b> • ${esc(r.time||'09:00')}</div><div class="actions"><button class="btn ${r.done?'light':'good'}" onclick="toggleSimpleReminder('${r.id}')">${r.done?'↩ Επαναφορά':'✓ Έγινε'}</button><button class="btn light rem-icon-btn" onclick="editSimpleReminder('${r.id}')" title="Επεξεργασία">✏️</button><button class="btn danger rem-icon-btn" onclick="deleteSimpleReminder('${r.id}')" title="Διαγραφή">🗑️</button></div></div>`;
    }).join(''):'<div class="small">Δεν υπάρχουν υπενθυμίσεις.</div>';
    const dueCount=list.filter(r=>!r.done&&simpleReminderMoment(r)<=now).length;
    if(q('reminderNavCount')){q('reminderNavCount').textContent=dueCount;q('reminderNavCount').style.display=dueCount?'inline-flex':'none'}
    if(q('remNow'))q('remNow').innerHTML=dueCount?`<button class="btn light" onclick="openSimpleReminders()">🔔 ${dueCount} υπενθύμιση${dueCount===1?'':'εις'}</button>`:'<span class="small">Καμία εκκρεμής υπενθύμιση</span>';
  };

  function init(){try{window.renderSimpleReminders()}catch(e){console.error('v6.5.29 reminder render',e)}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
