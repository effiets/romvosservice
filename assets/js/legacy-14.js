
/* v6.5.23 — αξιόπιστες ειδοποιήσεις ΜΕΣΑ στην εφαρμογή για Απλές Υπενθυμίσεις */
(function(){
  const q=id=>document.getElementById(id);
  const ymd=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  const esc2=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  let state={kind:'',ids:[],test:false,items:[]};
  let dismissUntil=0;

  function reminderMoment2(r){try{return simpleReminderMoment(r)}catch(e){const d=new Date((r?.date||ymd(new Date()))+'T'+(r?.time||'09:00')+':00');return d}}

  function play(){try{playDeadlineSound?.()}catch(e){try{playRomvosSoftAlert?.()}catch(_){}}}
  function show(kind,items,test){
    const el=q('romvosInAppAlert'),body=q('romvosInAppBody'),type=q('romvosInAppType');if(!el||!body)return;
    state={kind,ids:test?[]:items.map(x=>x.id).filter(Boolean),test:!!test,items};
    if(type)type.textContent='Απλή υπενθύμιση';
    body.innerHTML=(test?'<div class="romvos-inapp-test-note">🧪 Δοκιμή — αυτό είναι το ίδιο παράθυρο που θα εμφανίζεται όταν λήξει πραγματική εγγραφή.</div>':'')+
      items.map(x=>{
        const title=x.text||'Υπενθύμιση';
        const note='';
        const m=reminderMoment2(x);
        const when=m&&!Number.isNaN(m.getTime())?m.toLocaleString('el-GR',{dateStyle:'short',timeStyle:'short'}):'';
        return '<div class="romvos-inapp-item"><b>'+esc2(title)+'</b>'+note+(when?'<small>⏰ '+esc2(when)+'</small>':'')+'</div>';
      }).join('');
    q('romvosInAppMove')?.classList.remove('show');
    el.classList.add('show');
    play();
  }

  window.romvosCloseInAppAlert=function(){q('romvosInAppAlert')?.classList.remove('show');q('romvosInAppMove')?.classList.remove('show');if(!state.test&&state.kind)dismissUntil=Date.now()+15*60*1000};
  window.romvosToggleInAppDate=function(){
    const row=q('romvosInAppMove');if(!row)return;row.classList.toggle('show');if(!row.classList.contains('show'))return;
    const t=new Date();t.setDate(t.getDate()+1);if(q('romvosInAppDate'))q('romvosInAppDate').value=ymd(t);
    const first=state.items?.[0];const tm=first?.time||'09:00';if(q('romvosInAppTime'))q('romvosInAppTime').value=tm;
  };
  window.romvosTomorrowInAppAlert=function(){
    if(state.test){romvosCloseInAppAlert();return}
    const t=new Date();t.setDate(t.getDate()+1);const d=ymd(t);
    if(state.kind==='reminder')try{SIMPLE_REMINDERS.forEach(r=>{if(state.ids.includes(r.id)){r.date=d;r.snoozeUntil='';r.notified=false}});saveSimpleReminders();renderSimpleReminders?.();updateReminderDueBanner?.()}catch(e){}
    dismissUntil=0;q('romvosInAppAlert')?.classList.remove('show');state={kind:'',ids:[],test:false,items:[]};
  };
  window.romvosApplyInAppDate=function(){
    const d=q('romvosInAppDate')?.value,t=q('romvosInAppTime')?.value||'09:00';if(!d)return alert('Διάλεξε ημερομηνία.');
    if(state.test){romvosCloseInAppAlert();return}
    if(state.kind==='reminder')try{SIMPLE_REMINDERS.forEach(r=>{if(state.ids.includes(r.id)){r.date=d;r.time=t;r.snoozeUntil='';r.notified=false}});saveSimpleReminders();renderSimpleReminders?.();updateReminderDueBanner?.()}catch(e){}
    dismissUntil=0;q('romvosInAppAlert')?.classList.remove('show');state={kind:'',ids:[],test:false,items:[]};
  };
  window.romvosCompleteInAppAlert=function(){
    if(state.test){romvosCloseInAppAlert();return}
    if(state.kind==='reminder')try{SIMPLE_REMINDERS.forEach(r=>{if(state.ids.includes(r.id)){r.done=true;r.snoozeUntil=''}});saveSimpleReminders();renderSimpleReminders?.();updateReminderDueBanner?.()}catch(e){}
    dismissUntil=0;q('romvosInAppAlert')?.classList.remove('show');state={kind:'',ids:[],test:false,items:[]};
  };

  window.testSimpleReminder=function(){const n=new Date();show('reminder',[{id:'TEST-REM',text:'Δοκιμαστική απλή υπενθύμιση — το παράθυρο λειτουργεί.',date:ymd(n),time:String(n.getHours()).padStart(2,'0')+':'+String(n.getMinutes()).padStart(2,'0')}],true)};
  function dueReminders(){
    const now=new Date();try{return (Array.isArray(SIMPLE_REMINDERS)?SIMPLE_REMINDERS:[]).filter(r=>!r.done&&reminderMoment2(r)<=now&&(!r.snoozeUntil||new Date(r.snoozeUntil)<=now))}catch(e){return []}
  }
  window.romvosCheckInAppAlerts=function(forceKind){
    const current=q('romvosInAppAlert');if(current?.classList.contains('show'))return;
    const rem=dueReminders();
    if((forceKind==='reminder'||!forceKind)&&rem.length&&Date.now()>=dismissUntil){show('reminder',rem.slice(0,8),false);return}
  };

  // Οι πραγματικές Απλές Υπενθυμίσεις περνούν πλέον από το ίδιο παράθυρο της δοκιμής.
  window.showSimpleReminderAlert=function(items,testMode){show('reminder',items,!!testMode)};
  window.checkSimpleReminders=function(force){
    try{renderSimpleReminders?.();updateReminderDueBanner?.()}catch(e){}
    if(force){const d=dueReminders();if(d.length)show('reminder',d.slice(0,8),false);return}
    romvosCheckInAppAlerts('reminder');
  };

  // Κλείνουμε το παλιό toast όταν προσπαθεί να εμφανίσει Απλή Υπενθύμιση, για να μην υπάρχουν δύο ειδοποιήσεις.
  try{
    const toast=q('romvosGentleToast');if(toast)new MutationObserver(()=>{
      if(!toast.classList.contains('show'))return;const typ=String(q('romvosToastType')?.textContent||'').toLowerCase();
      if(typ.includes('υπενθύμι'))try{romvosCloseGentleToast?.()}catch(e){}
    }).observe(toast,{attributes:true,attributeFilter:['class']});
  }catch(e){}

  const start=()=>{setTimeout(()=>romvosCheckInAppAlerts(),700);setInterval(()=>romvosCheckInAppAlerts(),5000);window.addEventListener('focus',()=>setTimeout(()=>romvosCheckInAppAlerts(),120));document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(()=>romvosCheckInAppAlerts(),120)})};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
