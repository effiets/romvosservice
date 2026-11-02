
/* v6.5.20 — τελικές διορθώσεις Επαφών και Απλών Υπενθυμίσεων */
(function(){
  const q=id=>document.getElementById(id);
  const dateYMD=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  const canonOwner=v=>{
    const raw=String(v||'').trim();
    const n=raw.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/\s+/g,' ');
    if(n==='ΦΟΥΝΤΟΤΟΣ'||n==='ΦΟΥΝΤΩΤΟΣ')return 'ΦΟΥΝΤΩΤΟΣ';
    return raw;
  };
  function normalizeMaintenanceOwners(saveNow){
    let changed=false;
    try{
      if(Array.isArray(C))C.forEach(c=>{
        const x=canonOwner(c.maintenanceOwner);if(x!==String(c.maintenanceOwner||'')){c.maintenanceOwner=x;changed=true}
        if(Array.isArray(c.sites))c.sites.forEach(site=>{const y=canonOwner(site?.maintenanceOwner);if(site&&y!==String(site.maintenanceOwner||'')){site.maintenanceOwner=y;changed=true}});
      });
      if(changed&&saveNow){try{localStorage.setItem('cf_clients',JSON.stringify(C))}catch(e){}}
    }catch(e){}
    return changed;
  }
  normalizeMaintenanceOwners(true);

  // Προτάσεις για FM / FMA / Συντηρητές σε νέα καταχώρηση.
  function ensureList(id){let d=q(id);if(!d){d=document.createElement('datalist');d.id=id;document.body.appendChild(d)}return d}
  function fillList(id,vals){const d=ensureList(id);const uniq=[...new Set(vals.map(v=>String(v||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'el'));d.innerHTML=uniq.map(v=>`<option value="${v.replace(/&/g,'&amp;').replace(/"/g,'&quot;')}">`).join('')}
  function refreshContactSuggestions(){
    const list=Array.isArray(C)?C:[];
    fillList('fmSuggestions620',list.map(c=>c.facilityManager));
    fillList('fmaSuggestions620',list.map(c=>c.facilityAssistant));
    fillList('ownerSuggestions620',list.map(c=>canonOwner(c.maintenanceOwner)));
    q('cliFacilityManager')?.setAttribute('list','fmSuggestions620');
    q('cliFacilityAssistant')?.setAttribute('list','fmaSuggestions620');
    q('cliMaintenanceOwner')?.setAttribute('list','ownerSuggestions620');
  }
  refreshContactSuggestions();
  window.romvosRefreshContactSuggestions=refreshContactSuggestions;

  // Καθαρή προσθήκη νέου καταστήματος/επαφής.
  const oldOpen=window.openNewClientEditor;
  window.openNewClientEditor=function(){
    if(typeof oldOpen==='function')oldOpen();
    const title=q('clientEditorTitle');if(title)title.textContent='Νέο κατάστημα / επαφή';
    setTimeout(()=>q('cliCategory')?.focus(),70);
  };
  const oldSave=window.saveClient;
  window.saveClient=function(){
    const owner=q('cliMaintenanceOwner');if(owner)owner.value=canonOwner(owner.value);
    if(typeof oldSave==='function')oldSave();
    normalizeMaintenanceOwners(true);refreshContactSuggestions();
    try{window.renderClients?.()}catch(e){}
  };

  // Η τελική λίστα φίλτρων πρέπει να βλέπει μία μόνο γραφή ΦΟΥΝΤΩΤΟΣ.
  const oldRender=window.renderClients;
  window.renderClients=function(){normalizeMaintenanceOwners(false);return typeof oldRender==='function'?oldRender():undefined};

  // Μικρή σημείωση στην Προβολή — η υπάρχουσα προβολή ήδη διαβάζει c.notes.
  const oldView=window.viewClientAt;
  window.viewClientAt=function(i){
    if(typeof oldView==='function')oldView(i);
    const body=q('contactViewBody');
    if(body){body.querySelectorAll('.contact-view-section h3').forEach(h=>{if(h.textContent.trim()==='Σημειώσεις')h.textContent='📝 Σημείωση'})}
  };

  // --- Απλές Υπενθυμίσεις ---
  window.__romvosReminderDismissUntil=0;
  window.showSimpleReminderAlert=function(items,testMode){
    if(!items||!items.length)return;
    SHOWN_REMINDER_IDS=testMode?[]:items.map(r=>r.id);
    const body=q('simpleReminderPopupBody');
    if(body)body.innerHTML=items.map(r=>`<div style="border-bottom:1px solid #e5e7eb"><b>${typeof esc==='function'?esc(r.text):String(r.text||'')}</b><div class="small" style="margin-top:4px">${new Date((r.date||dateYMD(new Date()))+'T12:00:00').toLocaleDateString('el-GR')} • ${String(r.time||'09:00')}</div></div>`).join('');
    q('reminderMoveRow')&&(q('reminderMoveRow').style.display='none');
    q('simpleReminderPopup')?.classList.add('show');
    try{playDeadlineSound()}catch(e){try{playRomvosSoftAlert?.()}catch(_) {}}
  };
  window.checkSimpleReminders=function(force){
    const now=new Date();
    const due=SIMPLE_REMINDERS.filter(r=>!r.done&&simpleReminderMoment(r)<=now&&(!r.snoozeUntil||new Date(r.snoozeUntil)<=now));
    try{renderSimpleReminders();updateReminderDueBanner()}catch(e){}
    if(!due.length)return;
    if(!force && Date.now()<Number(window.__romvosReminderDismissUntil||0))return;
    const open=q('simpleReminderPopup')?.classList.contains('show');
    if(force||!open)showSimpleReminderAlert(due,false);
  };
  window.closeSimpleReminderPopup=function(){
    q('simpleReminderPopup')?.classList.remove('show');
    // Κλείσιμο χωρίς αλλαγή στην υπενθύμιση: δεν ξαναπετάγεται αμέσως.
    window.__romvosReminderDismissUntil=Date.now()+15*60*1000;
    try{updateReminderDueBanner()}catch(e){}
  };
  window.completeShownReminders=function(){
    SHOWN_REMINDER_IDS.forEach(id=>{const r=SIMPLE_REMINDERS.find(x=>x.id===id);if(r){r.done=true;r.snoozeUntil=''}});
    saveSimpleReminders();SHOWN_REMINDER_IDS=[];window.__romvosReminderDismissUntil=0;
    q('simpleReminderPopup')?.classList.remove('show');renderSimpleReminders();
  };
  window.snoozeShownRemindersNextDay=function(){
    const tomorrow=new Date();tomorrow.setDate(tomorrow.getDate()+1);const d=dateYMD(tomorrow);
    SHOWN_REMINDER_IDS.forEach(id=>{const r=SIMPLE_REMINDERS.find(x=>x.id===id);if(r){r.date=d;r.snoozeUntil='';r.notified=false}});
    saveSimpleReminders();SHOWN_REMINDER_IDS=[];window.__romvosReminderDismissUntil=0;
    q('simpleReminderPopup')?.classList.remove('show');renderSimpleReminders();updateReminderDueBanner();
  };
  window.toggleReminderMoveRow=function(){
    const row=q('reminderMoveRow');if(!row)return;
    const show=row.style.display==='none'||!row.style.display;
    row.style.display=show?'grid':'none';
    if(show){
      const tomorrow=new Date();tomorrow.setDate(tomorrow.getDate()+1);
      const first=SIMPLE_REMINDERS.find(r=>SHOWN_REMINDER_IDS.includes(r.id));
      if(q('reminderMoveDate'))q('reminderMoveDate').value=dateYMD(tomorrow);
      if(q('reminderMoveTime'))q('reminderMoveTime').value=first?.time||'09:00';
      setTimeout(()=>q('reminderMoveDate')?.focus(),20);
    }
  };
  window.applyReminderCustomDate=function(){
    const d=q('reminderMoveDate')?.value,t=q('reminderMoveTime')?.value||'09:00';
    if(!d)return alert('Διάλεξε ημερομηνία.');
    SHOWN_REMINDER_IDS.forEach(id=>{const r=SIMPLE_REMINDERS.find(x=>x.id===id);if(r){r.date=d;r.time=t;r.snoozeUntil='';r.notified=false}});
    saveSimpleReminders();SHOWN_REMINDER_IDS=[];window.__romvosReminderDismissUntil=0;
    q('simpleReminderPopup')?.classList.remove('show');renderSimpleReminders();updateReminderDueBanner();
  };
  window.testSimpleReminder=function(){
    const now=new Date();showSimpleReminderAlert([{id:'TEST',text:'Δοκιμαστική υπενθύμιση — έτσι θα εμφανίζεται.',date:dateYMD(now),time:String(now.getHours()).padStart(2,'0')+':'+String(now.getMinutes()).padStart(2,'0')}],true);
  };

  // Η v6.5.9 έδειχνε και toast για τις απλές υπενθυμίσεις. Το popup είναι πλέον η κύρια ειδοποίηση.
  try{window.romvosCloseGentleToast?.()}catch(e){}
  try{
    const toast=q('romvosGentleToast');
    if(toast){
      new MutationObserver(()=>{
        if(!toast.classList.contains('show'))return;
        const title=String(q('romvosToastTitle')?.textContent||'').trim();
        const due=SIMPLE_REMINDERS.some(r=>!r.done&&simpleReminderMoment(r)<=new Date()&&String(r.text||'').trim()===title);
        if(due)window.romvosCloseGentleToast?.();
      }).observe(toast,{attributes:true,attributeFilter:['class']});
    }
  }catch(e){}
  refreshContactSuggestions();
  try{window.renderClients?.()}catch(e){}
  setTimeout(()=>{try{checkSimpleReminders(false)}catch(e){}},500);
})();
