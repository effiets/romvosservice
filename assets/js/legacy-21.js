
(function(){
'use strict';
const $=id=>document.getElementById(id);
const KEYS={reminder:'romvos_simple_reminders',orders:'romvos_supplier_orders',incoming:'romvos_incoming_equipment',returns:'romvos_pending_returns'};
const LABEL={reminder:'Υπενθυμίσεις',orders:'Παραγγελίες',incoming:'Εισερχόμενος Εξοπλισμός',returns:'Εκκρεμείς Επιστροφές'};
const TABS={reminder:'reminders',orders:'orders',incoming:'incoming',returns:'returns'};
const dismissed=new Set();
let current=null;
function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function read(key){try{const a=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(a)?a:[]}catch(e){return []}}
function write(key,a){try{localStorage.setItem(key,JSON.stringify(a));return true}catch(e){return false}}
function ymd(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function dt(date,time='09:00'){if(!date)return null;const d=new Date(date+'T'+(time||'09:00')+':00');return Number.isNaN(d.getTime())?null:d}
function fmt(d){return d&&!Number.isNaN(d.getTime())?d.toLocaleString('el-GR',{dateStyle:'short',timeStyle:'short'}):''}
function isFutureSnooze(x,now){if(!x?.alertSnoozeUntil)return false;const d=new Date(x.alertSnoozeUntil);return !Number.isNaN(d.getTime())&&d>now}
function closedIncoming(x){return ['Παραδόθηκε','Επιστράφηκε σε προμηθευτή','Προς καταστροφή'].includes(x?.status)}
function closedReturn(x){return ['Παραλήφθηκε','Δεν θα επιστραφεί','Έκλεισε'].includes(x?.status)}
function closedOrder(x){return ['Ολοκληρώθηκε','Ακυρώθηκε'].includes(x?.status)}
function addDays(date,n){const d=new Date(date+'T12:00:00');d.setDate(d.getDate()+n);return ymd(d)}
function sig(kind,id,date,time,sub=''){return [kind,id||'',sub||'',date||'',time||'09:00'].join('|')}
function mk(kind,x,m,title,info,sub,date,time){return {kind,id:x.id||'',moment:m,title:title||LABEL[kind],info:info||'',sub:sub||'',date:date||'',time:time||'09:00',sig:sig(kind,x.id,date,time,sub),raw:x}}

function collect(){
 const now=new Date(),out=[];
 // Απλές υπενθυμίσεις
 read(KEYS.reminder).forEach(r=>{if(!r||r.done||/^TEST(?:-|$)/i.test(String(r.id||'')))return;let m=dt(r.date,r.time||'09:00');if(!m||m>now)return;if(r.snoozeUntil){const sn=new Date(r.snoozeUntil);if(!Number.isNaN(sn.getTime())&&sn>now)return}out.push(mk('reminder',r,m,r.text||'Υπενθύμιση','', 'reminder',r.date,r.time||'09:00'))});
 // Παραγγελίες
 read(KEYS.orders).forEach(x=>{if(!x||closedOrder(x)||isFutureSnooze(x,now))return;let date='',sub='',info='';if(x.status==='Αναμονή προσφοράς'){date=x.quoteDueDate||(x.requestDate?addDays(x.requestDate,2):'');sub='quote';info=['Κατάσταση: '+(x.status||''),x.pending?('Εκκρεμότητα: '+x.pending):'',x.notes?('Σημείωση: '+x.notes):''].filter(Boolean).join('\n')}else if(['Παραγγέλθηκε / Αναμονή παραλαβής','Μερική παραλαβή / Αναμονή υπολοίπων','Λάθος υλικά / Αναμονή διόρθωσης'].includes(x.status)){date=x.expectedDate;sub='delivery';info=['Κατάσταση: '+(x.status||''),x.pending?('Εκκρεμότητα: '+x.pending):'',x.notes?('Σημείωση: '+x.notes):''].filter(Boolean).join('\n')}if(!date)return;let m=dt(date,'09:00');if(!m||m>now)return;out.push(mk('orders',x,m,[x.supplier,x.title||x.code].filter(Boolean).join(' — '),info,sub,date,'09:00'))});
 // Εισερχόμενος εξοπλισμός — μόνο όταν έχει οριστεί υπενθύμιση
 read(KEYS.incoming).forEach(x=>{if(!x||closedIncoming(x)||!x.reminderDate)return;let m=dt(x.reminderDate,x.reminderTime||'09:00');if(!m||m>now||isFutureSnooze(x,now))return;const items=(x.items||[]).map(i=>[i.type,i.brand,i.model,i.serial].filter(Boolean).join(' ')).filter(Boolean).join(', ');const info=[items?('Εξοπλισμός: '+items):'',x.status?('Κατάσταση: '+x.status):'',x.problem?('Πρόβλημα: '+x.problem):'',x.notes?('Σημείωση: '+x.notes):''].filter(Boolean).join('\n');out.push(mk('incoming',x,m,x.contact||'Εισερχόμενος εξοπλισμός',info,'reminder',x.reminderDate,x.reminderTime||'09:00'))});
 // Εκκρεμείς επιστροφές — ρητή υπενθύμιση αν υπάρχει, αλλιώς προθεσμία
 read(KEYS.returns).forEach(x=>{if(!x||closedReturn(x)||isFutureSnooze(x,now))return;const explicit=!!x.reminderDate;const date=explicit?x.reminderDate:x.dueDate;const time=explicit?(x.reminderTime||'09:00'):'09:00';if(!date)return;let m=dt(date,time);if(!m||m>now)return;const info=[x.sentItem?('Στάλθηκε: '+x.sentItem):'',x.expectedItem?('Αναμένεται πίσω: '+x.expectedItem):'',x.status?('Κατάσταση: '+x.status):'',x.notes?('Σημείωση: '+x.notes):''].filter(Boolean).join('\n');out.push(mk('returns',x,m,[x.contact,x.code].filter(Boolean).join(' — '),info,explicit?'reminder':'due',date,time))});
 return out.filter(a=>!dismissed.has(a.sig)).sort((a,b)=>a.moment-b.moment);
}
function play(){try{window.playRomvosSoftAlert?.()}catch(e){try{window.playDeadlineSound?.()}catch(_){}}}
function ensureActions(){
 const box=$('romvosInAppAlert');if(!box)return;
 const head=box.querySelector('.romvos-inapp-head b');if(head&&!head.id)head.id='romvosAlertCategory';
 const actions=box.querySelector('.romvos-inapp-actions');if(!actions)return;
 actions.innerHTML='<button id="romvosAlertDone" class="btn good" type="button" onclick="romvosCompleteInAppAlert()" title="Ολοκλήρωση">✓ Ολοκληρώθηκε</button><button id="romvosAlertOpen" class="btn primary" type="button" onclick="romvosOpenInAppAlert()" title="Άνοιγμα εγγραφής">Άνοιγμα</button><button class="btn light" type="button" onclick="romvosTomorrowInAppAlert()" title="Μεταφορά ειδοποίησης για αύριο">Αύριο</button><button class="btn light" type="button" onclick="romvosToggleInAppDate()" title="Επιλογή άλλης ημερομηνίας και ώρας">📅 Άλλη ημερομηνία</button><button class="btn light" type="button" onclick="romvosCloseInAppAlert()" title="Κλείσιμο — αν είναι πριν τις 16:00, θα ξαναειδοποιήσει στις 16:00">Κλείσιμο</button>';
}
function render(a,test=false){
 ensureActions();const el=$('romvosInAppAlert'),head=$('romvosAlertCategory'),body=$('romvosInAppBody');if(!el||!body)return;
 current={...a,test:!!test};
 if(head)head.textContent=LABEL[a.kind]||'Ειδοποίηση';
 const when=a.moment?fmt(a.moment):'';
 body.innerHTML=(test?'<span class="romvos-test-label">Δοκιμή</span>':'')+'<div class="romvos-inapp-item"><b>'+esc(a.title||'')+'</b>'+(a.info?'<div class="romvos-alert-info">'+esc(a.info)+'</div>':'')+(when?'<div class="romvos-alert-when">'+esc(when)+'</div>':'')+'</div>';
 $('romvosInAppMove')?.classList.remove('show');
 const done=$('romvosAlertDone'),open=$('romvosAlertOpen');
 const taskKind=a.kind==='reminder';
 if(done)done.style.display=taskKind?'inline-block':'none';
 if(open)open.style.display=taskKind?'none':'inline-block';
 el.classList.add('show');play();
}
function closeBox(){ $('romvosInAppAlert')?.classList.remove('show');$('romvosInAppMove')?.classList.remove('show');current=null }
function snoozeClosedAlertTo1600(c){
 const now=new Date(),four=new Date(now);
 four.setHours(16,0,0,0);
 if(now>=four)return false;
 const until=four.toISOString();
 if(c.kind==='reminder'){
   mutate('reminder',c.id,x=>{x.snoozeUntil=until;x.notified=false});
 }else if(['orders','incoming','returns'].includes(c.kind)){
   mutate(c.kind,c.id,x=>{x.alertSnoozeUntil=until});
 }
 dismissed.delete(c.sig);
 return true;
}
window.romvosCloseInAppAlert=function(){
 if(current&&!current.test){
   const c=current;
   if(!snoozeClosedAlertTo1600(c))dismissed.add(c.sig);
 }
 closeBox();setTimeout(tick,450)
};
window.romvosToggleInAppDate=function(){const row=$('romvosInAppMove');if(!row)return;row.classList.toggle('show');if(!row.classList.contains('show'))return;const t=new Date();t.setDate(t.getDate()+1);$('romvosInAppDate').value=ymd(t);$('romvosInAppTime').value=current?.time||'09:00'};
function mutate(kind,id,fn){const key=KEYS[kind],a=read(key),i=a.findIndex(x=>x&&x.id===id);if(i<0)return false;fn(a[i]);write(key,a);try{if(kind==='reminder'&&typeof SIMPLE_REMINDERS!=='undefined')SIMPLE_REMINDERS=a;if(kind==='orders'&&typeof ORDERS!=='undefined')ORDERS=a;if(kind==='incoming'&&typeof INCOMING!=='undefined')INCOMING=a;if(kind==='returns'&&typeof RETURNS!=='undefined')RETURNS=a}catch(e){};try{window.renderSimpleReminders?.();window.renderOrders?.();window.renderIncoming?.();window.renderReturns?.()}catch(e){}return true}
function futureISO(date,time){const d=dt(date,time||'09:00');return d?d.toISOString():''}
function moveCurrent(date,time){if(!current||current.test){closeBox();return}const c=current;if(c.kind==='reminder')mutate(c.kind,c.id,x=>{x.date=date;x.time=time;x.snoozeUntil='';x.notified=false});else if(c.kind==='incoming')mutate(c.kind,c.id,x=>{x.reminderDate=date;x.reminderTime=time;x.alertSnoozeUntil=''});else if(['orders','returns'].includes(c.kind))mutate(c.kind,c.id,x=>{x.alertSnoozeUntil=futureISO(date,time)});dismissed.delete(c.sig);closeBox();setTimeout(tick,450)}
window.romvosTomorrowInAppAlert=function(){const t=new Date();t.setDate(t.getDate()+1);moveCurrent(ymd(t),current?.time||'09:00')};
window.romvosApplyInAppDate=function(){const d=$('romvosInAppDate')?.value,t=$('romvosInAppTime')?.value||'09:00';if(!d)return alert('Διάλεξε ημερομηνία.');moveCurrent(d,t)};
window.romvosCompleteInAppAlert=function(){if(!current)return;if(current.test){closeBox();return}const c=current;if(c.kind==='reminder')mutate('reminder',c.id,x=>{x.done=true;x.snoozeUntil=''});dismissed.delete(c.sig);closeBox();setTimeout(tick,450)};
window.romvosOpenInAppAlert=function(){if(!current)return;const c=current;if(!c.test) dismissed.add(c.sig);closeBox();document.querySelector('nav button[data-tab="'+TABS[c.kind]+'"]')?.click();setTimeout(()=>{try{if(c.kind==='orders')window.editOrder?.(c.id);else if(c.kind==='incoming')window.editIncoming?.(c.id);else if(c.kind==='returns')window.editReturn?.(c.id)}catch(e){}},80)};
function tick(force=false,kind=''){if($('romvosInAppAlert')?.classList.contains('show'))return;const all=collect();const a=kind?all.find(x=>x.kind===kind):all[0];if(a)render(a,false)}
window.romvosAlertTick=tick;
window.romvosCheckInAppAlerts=function(forceKind){tick(!!forceKind,forceKind||'')};
window.checkSimpleReminders=function(force){try{window.renderSimpleReminders?.()}catch(e){};tick(!!force,'reminder')};
window.showSimpleReminderAlert=function(items,testMode){if(testMode)return window.testSimpleReminder();tick(true,'reminder')};
window.romvosCheckDeadlineNotices=function(mode){if(mode==='test')return window.testSimpleReminder();tick()};
window.showOrderAlertPopup=function(){tick(true,'orders')};

function test(kind){const n=new Date(),date=ymd(n),time=String(n.getHours()).padStart(2,'0')+':'+String(n.getMinutes()).padStart(2,'0');const samples={
 reminder:mk('reminder',{id:'TEST-REM'},n,'Δοκιμαστική υπενθύμιση','Έλεγχος του δικού μας παραθύρου.','test',date,time),
 orders:mk('orders',{id:'TEST-ORD'},n,'Προμηθευτής — Δοκιμαστική παραγγελία','Κατάσταση: Αναμονή παραλαβής\nΕκκρεμότητα: Δοκιμή popup.','test',date,time),
 incoming:mk('incoming',{id:'TEST-IN'},n,'Πελάτης — EQ-TEST','Εξοπλισμός: Δοκιμαστική μονάδα\nΚατάσταση: Αναμονή ελέγχου','test',date,time),
 returns:mk('returns',{id:'TEST-RET'},n,'Πελάτης — RET-TEST','Στάλθηκε: Δοκιμαστικό ανταλλακτικό\nΑναμένεται πίσω: Ελαττωματικό','test',date,time)};render(samples[kind],true)}
window.testSimpleReminder=()=>test('reminder');window.testOrderReminder=()=>test('orders');window.testIncomingReminder=()=>test('incoming');window.testReturnReminder=()=>test('returns');

function addReminderFields(){
 // Εισερχόμενος εξοπλισμός
 if(!$('inReminderDate')){const notes=$('inNotes')?.closest('.field');if(notes){const a=document.createElement('div');a.className='field';a.innerHTML='<label>Ημερομηνία υπενθύμισης</label><input class="romvos-reminder-field" type="date" id="inReminderDate">';const b=document.createElement('div');b.className='field';b.innerHTML='<label>Ώρα υπενθύμισης</label><input class="romvos-reminder-field" type="time" id="inReminderTime" value="09:00">';notes.parentNode.insertBefore(a,notes);notes.parentNode.insertBefore(b,notes)}}
 // Εκκρεμείς επιστροφές: το date υπήρχε κρυφό
 const rd=$('retReminderDate');if(rd&&rd.type==='hidden'){const wrap=document.createElement('div');wrap.className='field';rd.parentNode.insertBefore(wrap,rd);wrap.innerHTML='<label>Ημερομηνία υπενθύμισης</label>';rd.type='date';rd.classList.add('romvos-reminder-field');wrap.appendChild(rd)}
 if(!$('retReminderTime')&&$('retReminderDate')){const wrap=$('retReminderDate').closest('.field');const b=document.createElement('div');b.className='field';b.innerHTML='<label>Ώρα υπενθύμισης</label><input class="romvos-reminder-field" type="time" id="retReminderTime" value="09:00">';wrap?.after(b)}
}
function wrapModuleSaves(){
 const oldCI=window.clearIncoming,oldEI=window.editIncoming,oldSI=window.saveIncoming;
 if(typeof oldCI==='function')window.clearIncoming=function(){const r=oldCI.apply(this,arguments);if($('inReminderDate'))$('inReminderDate').value='';if($('inReminderTime'))$('inReminderTime').value='09:00';return r};
 if(typeof oldEI==='function')window.editIncoming=function(id){const r=oldEI.apply(this,arguments);const x=read(KEYS.incoming).find(v=>v.id===id);if($('inReminderDate'))$('inReminderDate').value=x?.reminderDate||'';if($('inReminderTime'))$('inReminderTime').value=x?.reminderTime||'09:00';return r};
 if(typeof oldSI==='function')window.saveIncoming=function(){const id=$('inId')?.value||'',date=$('inReminderDate')?.value||'',time=$('inReminderTime')?.value||'09:00',before=new Set(read(KEYS.incoming).map(x=>x.id));const r=oldSI.apply(this,arguments);let a=read(KEYS.incoming),target=id?a.find(x=>x.id===id):a.find(x=>!before.has(x.id));if(target){target.reminderDate=date;target.reminderTime=time;target.alertSnoozeUntil='';write(KEYS.incoming,a);try{if(typeof INCOMING!=='undefined')INCOMING=a;renderIncoming?.()}catch(e){}}return r};
 const oldCR=window.clearReturn,oldER=window.editReturn,oldSR=window.saveReturn;
 if(typeof oldCR==='function')window.clearReturn=function(){const r=oldCR.apply(this,arguments);if($('retReminderTime'))$('retReminderTime').value='09:00';return r};
 if(typeof oldER==='function')window.editReturn=function(id){const r=oldER.apply(this,arguments);const x=read(KEYS.returns).find(v=>v.id===id);if($('retReminderTime'))$('retReminderTime').value=x?.reminderTime||'09:00';return r};
 if(typeof oldSR==='function')window.saveReturn=function(){const id=$('retId')?.value||'',time=$('retReminderTime')?.value||'09:00',before=new Set(read(KEYS.returns).map(x=>x.id));const r=oldSR.apply(this,arguments);let a=read(KEYS.returns),target=id?a.find(x=>x.id===id):a.find(x=>!before.has(x.id));if(target){target.reminderTime=time;target.alertSnoozeUntil='';write(KEYS.returns,a);try{if(typeof RETURNS!=='undefined')RETURNS=a;renderReturns?.()}catch(e){}}return r};
}
function addTestButton(tab,fn,label='🧪 Δοκιμή υπενθύμισης'){const sec=$(tab);if(!sec)return;const actions=sec.querySelector('.top .actions')||sec.querySelector('.top');if(!actions||actions.querySelector('[data-romvos-alert-test]'))return;const b=document.createElement('button');b.type='button';b.className='btn light';b.dataset.romvosAlertTest='1';b.textContent=label;b.title='Δοκιμή του popup μέσα στο ROMVOS';b.onclick=fn;actions.appendChild(b)}
function arrangeMenu(){const nav=document.querySelector('aside nav');if(!nav)return;nav.querySelectorAll('.romvos-menu-separator').forEach(x=>x.remove());const groups=[['board'],['reminders'],['orders','incoming','returns'],['clients'],['emps','vehs']];groups.forEach((g,gi)=>{g.forEach(tab=>{const b=nav.querySelector('button[data-tab="'+tab+'"]');if(b)nav.appendChild(b)});if(gi<groups.length-1){const sep=document.createElement('div');sep.className='romvos-menu-separator';sep.setAttribute('aria-hidden','true');nav.appendChild(sep)}})}
function tooltipText(b){const t=(b.textContent||'').trim(),oc=b.getAttribute('onclick')||'';if(t==='✏️')return 'Επεξεργασία';if(t==='🗑️')return 'Διαγραφή';if(t==='👁️')return 'Προβολή';if(t==='📧')return 'Email';if(t==='✕'||t==='×')return oc.includes('remove')?'Διαγραφή γραμμής':'Κλείσιμο';if(t==='🎙️'||t==='🎤')return 'Υπαγόρευση';if(t==='↩')return 'Επαναφορά';if(t==='✓'||t==='✅')return 'Ολοκλήρωση';return ''}
function addTooltips(root=document){root.querySelectorAll?.('button').forEach(b=>{if(b.title)return;const x=tooltipText(b);if(x){b.title=x;b.setAttribute('aria-label',x)}})}
function updateReminderBadge(){const n=read(KEYS.reminder).filter(r=>r&&!r.done&&!/^TEST(?:-|$)/i.test(String(r.id||''))).length;const e=$('reminderNavCount');if(e){e.textContent=n;e.style.display=n?'inline-flex':'none'}}
function init(){
 try{localStorage.removeItem('romvos_simple_reminder_dismiss_until_v6536')}catch(e){}
 const _rr=window.renderSimpleReminders;if(typeof _rr==='function')window.renderSimpleReminders=function(){const r=_rr.apply(this,arguments);updateReminderBadge();return r};
 const el=$('romvosInAppAlert');el?.classList.remove('show');current=null;
 addReminderFields();wrapModuleSaves();ensureActions();arrangeMenu();
 addTestButton('orders',()=>test('orders'));addTestButton('incoming',()=>test('incoming'));addTestButton('returns',()=>test('returns'));
 addTooltips();new MutationObserver(m=>m.forEach(x=>x.addedNodes.forEach(n=>{if(n.nodeType===1)addTooltips(n)}))).observe(document.body,{childList:true,subtree:true});
 updateReminderBadge();setTimeout(updateReminderBadge,300);setTimeout(()=>tick(),900);setInterval(()=>{updateReminderBadge();tick()},3000);window.addEventListener('focus',()=>setTimeout(tick,100));document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(tick,100)});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
