
/* v6.5.23 — αξιόπιστες ειδοποιήσεις ΜΕΣΑ στην εφαρμογή για Απλές Υπενθυμίσεις + To Do */
(function(){
  const q=id=>document.getElementById(id);
  const ymd=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  const esc2=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  let state={kind:'',ids:[],test:false,items:[]};
  let dismissUntil={reminder:0,todo:0};

  function todoMoment(x){if(!x?.deadlineDate)return null;const d=new Date(x.deadlineDate+'T'+(x.deadlineTime||'09:00')+':00');return Number.isNaN(d.getTime())?null:d}
  function reminderMoment2(r){try{return simpleReminderMoment(r)}catch(e){const d=new Date((r?.date||ymd(new Date()))+'T'+(r?.time||'09:00')+':00');return d}}
  function loadTodo2(){try{const a=JSON.parse(localStorage.getItem('romvos_todo_v1')||'[]');return Array.isArray(a)?a:[]}catch(e){return []}}
  function saveTodo2(a){try{localStorage.setItem('romvos_todo_v1',JSON.stringify(a))}catch(e){}try{renderTodoList?.()}catch(e){}try{renderTodoArchive?.()}catch(e){}}

  function play(){try{playDeadlineSound?.()}catch(e){try{playRomvosSoftAlert?.()}catch(_){}}}
  function show(kind,items,test){
    const el=q('romvosInAppAlert'),body=q('romvosInAppBody'),type=q('romvosInAppType');if(!el||!body)return;
    state={kind,ids:test?[]:items.map(x=>x.id).filter(Boolean),test:!!test,items};
    if(type)type.textContent=kind==='todo'?'To Do':'Απλή υπενθύμιση';
    body.innerHTML=(test?'<div class="romvos-inapp-test-note">🧪 Δοκιμή — αυτό είναι το ίδιο παράθυρο που θα εμφανίζεται όταν λήξει πραγματική εγγραφή.</div>':'')+
      items.map(x=>{
        const title=kind==='todo'?(x.title||x.text||'To Do'):(x.text||'Υπενθύμιση');
        const note=kind==='todo'&&x.note?'<small>'+esc2(x.note)+'</small>':'';
        const m=kind==='todo'?todoMoment(x):reminderMoment2(x);
        const when=m&&!Number.isNaN(m.getTime())?m.toLocaleString('el-GR',{dateStyle:'short',timeStyle:'short'}):'';
        return '<div class="romvos-inapp-item"><b>'+esc2(title)+'</b>'+note+(when?'<small>⏰ '+esc2(when)+'</small>':'')+'</div>';
      }).join('');
    q('romvosInAppMove')?.classList.remove('show');
    el.classList.add('show');
    play();
  }

  window.romvosCloseInAppAlert=function(){q('romvosInAppAlert')?.classList.remove('show');q('romvosInAppMove')?.classList.remove('show');if(!state.test&&state.kind)dismissUntil[state.kind]=Date.now()+15*60*1000};
  window.romvosToggleInAppDate=function(){
    const row=q('romvosInAppMove');if(!row)return;row.classList.toggle('show');if(!row.classList.contains('show'))return;
    const t=new Date();t.setDate(t.getDate()+1);if(q('romvosInAppDate'))q('romvosInAppDate').value=ymd(t);
    const first=state.items?.[0];const tm=state.kind==='todo'?(first?.deadlineTime||'09:00'):(first?.time||'09:00');if(q('romvosInAppTime'))q('romvosInAppTime').value=tm;
  };
  window.romvosTomorrowInAppAlert=function(){
    if(state.test){romvosCloseInAppAlert();return}
    const t=new Date();t.setDate(t.getDate()+1);const d=ymd(t);
    if(state.kind==='reminder'){
      try{SIMPLE_REMINDERS.forEach(r=>{if(state.ids.includes(r.id)){r.date=d;r.snoozeUntil='';r.notified=false}});saveSimpleReminders();renderSimpleReminders?.();updateReminderDueBanner?.()}catch(e){}
    }else if(state.kind==='todo'){
      const a=loadTodo2();a.forEach(x=>{if(state.ids.includes(x.id)){x.deadlineDate=d;x.alertSnoozeUntil='';x.editedAt=new Date().toISOString()}});saveTodo2(a)
    }
    dismissUntil[state.kind]=0;q('romvosInAppAlert')?.classList.remove('show');state={kind:'',ids:[],test:false,items:[]};
  };
  window.romvosApplyInAppDate=function(){
    const d=q('romvosInAppDate')?.value,t=q('romvosInAppTime')?.value||'09:00';if(!d)return alert('Διάλεξε ημερομηνία.');
    if(state.test){romvosCloseInAppAlert();return}
    if(state.kind==='reminder'){
      try{SIMPLE_REMINDERS.forEach(r=>{if(state.ids.includes(r.id)){r.date=d;r.time=t;r.snoozeUntil='';r.notified=false}});saveSimpleReminders();renderSimpleReminders?.();updateReminderDueBanner?.()}catch(e){}
    }else if(state.kind==='todo'){
      const a=loadTodo2();a.forEach(x=>{if(state.ids.includes(x.id)){x.deadlineDate=d;x.deadlineTime=t;x.alertSnoozeUntil='';x.editedAt=new Date().toISOString()}});saveTodo2(a)
    }
    dismissUntil[state.kind]=0;q('romvosInAppAlert')?.classList.remove('show');state={kind:'',ids:[],test:false,items:[]};
  };
  window.romvosCompleteInAppAlert=function(){
    if(state.test){romvosCloseInAppAlert();return}
    if(state.kind==='reminder'){
      try{SIMPLE_REMINDERS.forEach(r=>{if(state.ids.includes(r.id)){r.done=true;r.snoozeUntil=''}});saveSimpleReminders();renderSimpleReminders?.();updateReminderDueBanner?.()}catch(e){}
    }else if(state.kind==='todo'){
      // Χρησιμοποιούμε την κανονική λειτουργία ολοκλήρωσης, ώστε να σεβαστεί Αρχείο/Παραμονή/Διαγραφή.
      const ids=[...state.ids];ids.forEach(id=>{try{toggleTodoItem?.(id)}catch(e){}});
    }
    dismissUntil[state.kind]=0;q('romvosInAppAlert')?.classList.remove('show');state={kind:'',ids:[],test:false,items:[]};
  };

  window.testSimpleReminder=function(){const n=new Date();show('reminder',[{id:'TEST-REM',text:'Δοκιμαστική απλή υπενθύμιση — το παράθυρο λειτουργεί.',date:ymd(n),time:String(n.getHours()).padStart(2,'0')+':'+String(n.getMinutes()).padStart(2,'0')}],true)};
  window.testTodoReminder=function(){const n=new Date();show('todo',[{id:'TEST-TODO',title:'Δοκιμαστικό To Do — η ειδοποίηση λειτουργεί.',note:'Αυτό είναι δείγμα της ειδοποίησης To Do.',deadlineDate:ymd(n),deadlineTime:String(n.getHours()).padStart(2,'0')+':'+String(n.getMinutes()).padStart(2,'0')}],true)};

  function dueReminders(){
    const now=new Date();try{return (Array.isArray(SIMPLE_REMINDERS)?SIMPLE_REMINDERS:[]).filter(r=>!r.done&&reminderMoment2(r)<=now&&(!r.snoozeUntil||new Date(r.snoozeUntil)<=now))}catch(e){return []}
  }
  function dueTodos(){
    const now=new Date();return loadTodo2().filter(x=>{if(x.done||!x.deadlineDate)return false;const m=todoMoment(x);if(!m||m>now)return false;if(x.alertSnoozeUntil&&new Date(x.alertSnoozeUntil)>now)return false;return true})
  }
  window.romvosCheckInAppAlerts=function(forceKind){
    const current=q('romvosInAppAlert');if(current?.classList.contains('show'))return;
    const rem=dueReminders();const td=dueTodos();
    if((forceKind==='reminder'||!forceKind)&&rem.length&&Date.now()>=dismissUntil.reminder){show('reminder',rem.slice(0,8),false);return}
    if((forceKind==='todo'||!forceKind)&&td.length&&Date.now()>=dismissUntil.todo){show('todo',td.slice(0,8),false);return}
  };

  // Οι πραγματικές Απλές Υπενθυμίσεις περνούν πλέον από το ίδιο παράθυρο της δοκιμής.
  window.showSimpleReminderAlert=function(items,testMode){show('reminder',items,!!testMode)};
  window.checkSimpleReminders=function(force){
    try{renderSimpleReminders?.();updateReminderDueBanner?.()}catch(e){}
    if(force){const d=dueReminders();if(d.length)show('reminder',d.slice(0,8),false);return}
    romvosCheckInAppAlerts('reminder');
  };

  // Κλείνουμε το παλιό toast όταν προσπαθεί να εμφανίσει To Do / Απλή Υπενθύμιση, για να μην υπάρχουν δύο ειδοποιήσεις.
  try{
    const toast=q('romvosGentleToast');if(toast)new MutationObserver(()=>{
      if(!toast.classList.contains('show'))return;const typ=String(q('romvosToastType')?.textContent||'').toLowerCase();
      if(typ.includes('to do')||typ.includes('υπενθύμι'))try{romvosCloseGentleToast?.()}catch(e){}
    }).observe(toast,{attributes:true,attributeFilter:['class']});
  }catch(e){}

  const start=()=>{setTimeout(()=>romvosCheckInAppAlerts(),700);setInterval(()=>romvosCheckInAppAlerts(),5000);window.addEventListener('focus',()=>setTimeout(()=>romvosCheckInAppAlerts(),120));document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(()=>romvosCheckInAppAlerts(),120)})};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
