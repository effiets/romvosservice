
/* v6.5.9 — Γενική διακριτική ειδοποίηση: μία φορά ανά προθεσμία + πολύ χαμηλός ήχος */
(function(){
  const SEEN_KEY='romvos_gentle_deadline_seen_v1';
  let toastTimer=null,toastOpenAction=null,audioCtx=null;
  const parseSeen=()=>{try{const x=JSON.parse(localStorage.getItem(SEEN_KEY)||'{}');return x&&typeof x==='object'?x:{}}catch(e){return {}}};
  const saveSeen=x=>{try{localStorage.setItem(SEEN_KEY,JSON.stringify(x))}catch(e){}};
  function enableAudio(){try{if(!audioCtx)audioCtx=new (window.AudioContext||window.webkitAudioContext)();if(audioCtx.state==='suspended')audioCtx.resume()}catch(e){}}
  ['pointerdown','keydown'].forEach(ev=>document.addEventListener(ev,enableAudio,{once:true,capture:true}));
  window.playRomvosSoftAlert=function(){try{enableAudio();if(!audioCtx||audioCtx.state!=='running')return;const o=audioCtx.createOscillator(),g=audioCtx.createGain(),t=audioCtx.currentTime;o.type='sine';o.frequency.setValueAtTime(720,t);g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(0.022,t+0.015);g.gain.exponentialRampToValueAtTime(0.0001,t+0.12);o.connect(g);g.connect(audioCtx.destination);o.start(t);o.stop(t+0.13)}catch(e){}};
  window.romvosCloseGentleToast=function(){const el=document.getElementById('romvosGentleToast');el?.classList.remove('show');if(toastTimer){clearTimeout(toastTimer);toastTimer=null}};
  function openTab(tab){document.querySelector(`nav button[data-tab="${tab}"]`)?.click()}
  function showToast(items,{force=false}={}){
    if(!items?.length)return;
    const el=document.getElementById('romvosGentleToast');if(!el)return;
    const first=items[0],type=document.getElementById('romvosToastType'),title=document.getElementById('romvosToastTitle'),detail=document.getElementById('romvosToastDetail');
    if(type)type.textContent=items.length>1?`${items.length} προθεσμίες`:first.type;
    if(title)title.textContent=items.length>1?first.title:first.title;
    if(detail)detail.textContent=items.length>1?`${first.detail||''}${first.detail?' • ':''}και ${items.length-1} ακόμη`:(first.detail||'');
    el.classList.toggle('due',items.some(x=>x.overdue));el.classList.add('show');
    toastOpenAction=()=>{romvosCloseGentleToast();if(first.tab)openTab(first.tab);setTimeout(()=>{try{first.open?.()}catch(e){}},80)};
    el.onclick=e=>{if(e.target.closest('.romvos-toast-close'))return;toastOpenAction?.()};
    if(toastTimer)clearTimeout(toastTimer);toastTimer=setTimeout(romvosCloseGentleToast,7000);playRomvosSoftAlert();
  }
  function dateMoment(date,time){if(!date)return null;const d=new Date(date+'T'+(time||'09:00')+':00');return Number.isNaN(d.getTime())?null:d}
  function collect(){
    const now=new Date(),out=[];
    // Απλές υπενθυμίσεις
    try{if(typeof SIMPLE_REMINDERS!=='undefined')SIMPLE_REMINDERS.forEach(r=>{if(r.done||!r.date)return;const m=dateMoment(r.date,r.time||'09:00');if(!m||m>now)return;if(r.snoozeUntil&&new Date(r.snoozeUntil)>now)return;out.push({sig:`rem:${r.id}:${r.date}:${r.time||'09:00'}`,moment:m,type:'Υπενθύμιση',title:r.text||'Υπενθύμιση',detail:m.toLocaleString('el-GR',{dateStyle:'short',timeStyle:'short'}),overdue:m<now,tab:'reminders'})})}catch(e){}
    // Παραγγελίες / προσφορές
    try{if(typeof ORDERS!=='undefined')ORDERS.forEach(x=>{if(['Ολοκληρώθηκε','Ακυρώθηκε'].includes(x.status))return;let d='',label='';if(x.status==='Αναμονή προσφοράς'){d=x.quoteDueDate||(x.requestDate?addDays(x.requestDate,2):'');label='Απάντηση προσφοράς'}else if(['Παραγγέλθηκε / Αναμονή παραλαβής','Μερική παραλαβή / Αναμονή υπολοίπων','Λάθος υλικά / Αναμονή διόρθωσης'].includes(x.status)){d=x.expectedDate;label='Αναμενόμενη παραλαβή'}if(!d)return;const m=dateMoment(d,'09:00');if(m&&m<=now)out.push({sig:`ord:${x.id}:${label}:${d}`,moment:m,type:'Παραγγελία',title:[x.supplier,x.title||x.code].filter(Boolean).join(' — '),detail:`${label}: ${new Date(d+'T12:00:00').toLocaleDateString('el-GR')}`,overdue:m<now,tab:'orders',open:()=>window.editOrder?.(x.id)})})}catch(e){}
    // Εκκρεμείς επιστροφές: επόμενη υπενθύμιση και προθεσμία
    try{if(typeof RETURNS!=='undefined')RETURNS.forEach(x=>{if(['Παραλήφθηκε','Δεν θα επιστραφεί','Έκλεισε'].includes(x.status))return;[['reminderDate','Υπενθύμιση επιστροφής'],['dueDate','Προθεσμία επιστροφής']].forEach(([k,label])=>{const d=x[k];if(!d)return;const m=dateMoment(d,'09:00');if(m&&m<=now)out.push({sig:`ret:${x.id}:${k}:${d}`,moment:m,type:'Επιστροφή',title:[x.contact,x.sentItem||x.code].filter(Boolean).join(' — '),detail:`${label}: ${new Date(d+'T12:00:00').toLocaleDateString('el-GR')}`,overdue:m<now,tab:'returns',open:()=>window.editReturn?.(x.id)})})})}catch(e){}
    return out.sort((a,b)=>a.moment-b.moment);
  }
  window.romvosCheckDeadlineNotices=function(forceTest){
    if(forceTest==='test'){showToast([{type:'Δοκιμή',title:'Η διακριτική ειδοποίηση λειτουργεί.',detail:'Ο ήχος είναι χαμηλός και η ειδοποίηση κλείνει μόνη της.',overdue:false}],{force:true});return}
    const seen=parseSeen(),now=Date.now();Object.keys(seen).forEach(k=>{if(now-Number(seen[k]||0)>1000*60*60*24*120)delete seen[k]});
    const fresh=collect().filter(x=>!seen[x.sig]);if(!fresh.length){saveSeen(seen);return}fresh.forEach(x=>seen[x.sig]=now);saveSeen(seen);showToast(fresh.slice(0,8));
  };
  // Αντικατάσταση των παλιών μεγάλων pop-up υπενθυμίσεων με το μικρό toast.
  try{window.showSimpleReminderAlert=function(items,testMode){if(testMode){romvosCheckDeadlineNotices('test');return}romvosCheckDeadlineNotices()}}catch(e){}
  try{window.showOrderAlertPopup=function(){romvosCheckDeadlineNotices()};window.checkOrderAlertsOnOpen=function(){try{updateOrderAlerts?.()}catch(e){}romvosCheckDeadlineNotices()}}catch(e){}
  // Το κουμπί δοκιμής στις Υπενθυμίσεις δοκιμάζει πλέον το μικρό toast.
  try{window.testSimpleReminder=function(){romvosCheckDeadlineNotices('test')}}catch(e){}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>romvosCheckDeadlineNotices(),1300));else setTimeout(()=>romvosCheckDeadlineNotices(),1300);
  setInterval(()=>romvosCheckDeadlineNotices(),60000);
  window.addEventListener('focus',()=>setTimeout(()=>romvosCheckDeadlineNotices(),250));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(()=>romvosCheckDeadlineNotices(),250)});
})();
