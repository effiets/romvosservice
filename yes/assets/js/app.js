
const K={e:'cf_employees',v:'cf_vehicles',j:'cf_jobs',c:'cf_clients',b:'romvos_board',d:'romvos_board_drafts',p:'romvos_board_candidates_v1'},BOARD_CREW_COUNT=5;let E=JSON.parse(localStorage.getItem(K.e)||'[]'),V=JSON.parse(localStorage.getItem(K.v)||'[]'),J=JSON.parse(localStorage.getItem(K.j)||'[]'),C=JSON.parse(localStorage.getItem(K.c)||'[]'),B=JSON.parse(localStorage.getItem(K.b)||'{}'),D=JSON.parse(localStorage.getItem(K.d)||'[]'),CAND=JSON.parse(localStorage.getItem(K.p)||'[]');
// v5.0.16 — εφάπαξ διαγραφή εργασιών από 01/08/2026 και μετά
/* v6.5.11 DATA SAFE — δεν γίνεται καμία αυτόματη διαγραφή αποθηκευμένων Εργασιών ή Πίνακα Κίνησης κατά την εκκίνηση. */
// Preserve saved jobs and crew assignments when the app starts.
function empLeaveInfo(emp,date){if(!emp||!date||!emp.leaveFrom||!emp.leaveTo)return null;if(date>=emp.leaveFrom&&date<=emp.leaveTo)return{reason:emp.leaveReason||'Άδεια',from:emp.leaveFrom,to:emp.leaveTo};return null}function empOnLeave(emp,date){return !!empLeaveInfo(emp,date)}const $=id=>document.getElementById(id),today=()=>{let d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')},uid=p=>p+'-'+Date.now().toString(36)+Math.random().toString(36).slice(2,5),mins=t=>{let[a,b]=(t||'00:00').split(':').map(Number);return a*60+b},eur=n=>Number(n||0).toLocaleString('el-GR',{style:'currency',currency:'EUR'}),esc=s=>String(s||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));const save=()=>{if(window.romvosScheduleBeforeSave&&!window.romvosScheduleBeforeSave())return;localStorage.setItem(K.e,JSON.stringify(E));localStorage.setItem(K.v,JSON.stringify(V));localStorage.setItem(K.j,JSON.stringify(J));localStorage.setItem(K.c,JSON.stringify(C));localStorage.setItem(K.b,JSON.stringify(B));localStorage.setItem(K.d,JSON.stringify(D));localStorage.setItem(K.p,JSON.stringify(CAND));window.dispatchEvent(new Event('romvos:schedule-saved'))},names=ids=>(ids||[]).map(id=>E.find(e=>e.id===id)?.name).filter(Boolean).join(', ')||'—',veh=id=>{let v=V.find(x=>x.id===id);if(!v)return '—';let a=[v.model,v.plate].filter(Boolean);return a.length?a.join(' • '):'Χωρίς στοιχεία οχήματος'},clientKey=n=>(n||'').trim().toLowerCase();
const statusClass=s=>s==='Ολοκληρώθηκε'?'done':s==='Σε αναμονή'?'wait':s==='Σε εξέλιξη'?'prog':s==='Ακυρώθηκε'?'cancel':'';
function workState(j){
 if(j.status==='Ολοκληρώθηκε')return{key:'completed',label:'✅ Ολοκληρώθηκε',cls:'done'};
 if(j.status==='Ακυρώθηκε')return{key:'cancelled',label:'⚪ Ακυρώθηκε',cls:'cancel'};
 if(j.status==='Σε αναμονή')return{key:'waiting',label:'⏸️ Σε αναμονή',cls:'wait'};
 if(!j.date)return{key:'queue',label:'🗂️ Σε ουρά',cls:'queue-state'};
 let d=today();
 if(j.date<d)return{key:'expired',label:'🔴 Έληξε',cls:'expired'};
 if(j.date===d)return{key:'today',label:'🟡 Σήμερα',cls:'today'};
 return{key:'active',label:'🟢 Ενεργή',cls:'active'};
}
function workStateMatches(j,key){if(!key)return true;let w=workState(j);if(key==='inprogress')return j.status==='Σε εξέλιξη';return w.key===key}
function stateBadge(j){let w=workState(j),manual=(j.status&&j.status!=='Προγραμματισμένη'&&!['Ολοκληρώθηκε','Ακυρώθηκε','Σε αναμονή'].includes(j.status))?`<div class="small">${esc(j.status)}</div>`:'';return `<span class="badge ${w.cls}">${w.label}</span>${manual}`}
function jobDetailsHtml(j,className='job-visible-detail'){
 let parts=[],task=String(j?.task||'').trim(),notes=String(j?.notes||'').trim();
 if(task)parts.push(`<div><b>Περιγραφή:</b> ${esc(task)}</div>`);
 if(notes)parts.push(`<div class="job-detail-notes"><b>Σημειώσεις:</b> ${esc(notes)}</div>`);
 return parts.length?`<div class="${className}">${parts.join('')}</div>`:'';
}

function setBoardMode(on){document.body.classList.toggle('board-mode',!!on)}
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>{document.querySelectorAll('nav button').forEach(x=>x.classList.remove('active'));b.classList.add('active');document.querySelectorAll('.section').forEach(x=>x.classList.remove('active'));$(b.dataset.tab).classList.add('active');setBoardMode(b.dataset.tab==='board');render();if(b.dataset.tab==='board')renderBoard()});
setBoardMode(true);
function overlap(j,d,s,e,ignore=''){return j.id!==ignore&&j.date===d&&mins(s)<mins(j.end)&&mins(e)>mins(j.start)}function busyEmp(id,d,s,e,ignore=''){return J.some(j=>overlap(j,d,s,e,ignore)&&(j.employeeIds||[]).includes(id))}function busyVeh(id,d,s,e,ignore=''){return J.some(j=>overlap(j,d,s,e,ignore)&&j.vehicleId===id)}function nowBusy(j){let n=new Date(),m=n.getHours()*60+n.getMinutes();return j.date===today()&&mins(j.start)<=m&&m<mins(j.end)&&j.status!=='Ολοκληρώθηκε'}
function buildTimeSelects(){let hh='<option value="">--</option>'+Array.from({length:24},(_,i)=>String(i).padStart(2,'0')).map(h=>`<option value="${h}">${h}</option>`).join(''),mm='<option value="">--</option>'+Array.from({length:60},(_,i)=>String(i).padStart(2,'0')).map(m=>`<option value="${m}">${m}</option>`).join('');['jStartH','jEndH'].forEach(id=>$(id).innerHTML=hh);['jStartM','jEndM'].forEach(id=>$(id).innerHTML=mm)}
function timeGet(p){let h=$(p+'H').value,m=$(p+'M').value;return h!==''&&m!==''?h+':'+m:''}
function timeSet(p,val){let[h,m]=(val||'').split(':');$(p+'H').value=h||'';$(p+'M').value=m||''}
let _confirmResolver=null;
function askConfirm(msg,okText='Διαγραφή'){$('confirmMsg').textContent=msg;$('confirmOkBtn').textContent=okText;$('confirmModal').classList.add('open');return new Promise(res=>{_confirmResolver=res})}
function confirmResolve(v){$('confirmModal').classList.remove('open');if(_confirmResolver){_confirmResolver(v);_confirmResolver=null}}
$('confirmModal').addEventListener('click',e=>{if(e.target.id==='confirmModal')confirmResolve(false)});
$('clientHistModal').addEventListener('click',e=>{if(e.target.id==='clientHistModal')closeClientHist()});
function updExpTotal(){let t=Number($('jExpFuel').value||0)+Number($('jExpParts').value||0)+Number($('jExpOther').value||0);$('jExpTotal').value=eur(t)}
let weekAnchor=new Date(),programMode='week';
function fmtDate(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function mondayOf(d){let x=new Date(d),day=x.getDay(),diff=(day===0?-6:1-day);x.setDate(x.getDate()+diff);x.setHours(0,0,0,0);return x}
function setProgramMode(mode){programMode=mode;['day','week','month'].forEach(m=>{let b=$('program'+m.charAt(0).toUpperCase()+m.slice(1)+'Btn');if(b)b.className='btn '+(m===mode?'primary':'light')});renderWeek()}
function weekNav(delta){
 if(delta===0)weekAnchor=new Date();
 else if(programMode==='day')weekAnchor=new Date(weekAnchor.getFullYear(),weekAnchor.getMonth(),weekAnchor.getDate()+delta);
 else if(programMode==='week')weekAnchor=new Date(weekAnchor.getFullYear(),weekAnchor.getMonth(),weekAnchor.getDate()+delta*7);
 else weekAnchor=new Date(weekAnchor.getFullYear(),weekAnchor.getMonth()+delta,1);
 renderWeek()
}
function renderWeek(){
 let start,end;
 if(programMode==='day'){start=new Date(weekAnchor);start.setHours(0,0,0,0);end=new Date(start)}
 else if(programMode==='week'){start=mondayOf(weekAnchor);end=new Date(start);end.setDate(end.getDate()+6)}
 else {start=new Date(weekAnchor.getFullYear(),weekAnchor.getMonth(),1);end=new Date(weekAnchor.getFullYear(),weekAnchor.getMonth()+1,0)}
 let days=[],d=new Date(start);while(d<=end){days.push(new Date(d));d.setDate(d.getDate()+1)}
 $('weekLabel').textContent=programMode==='day'
  ?start.toLocaleDateString('el-GR',{weekday:'long',day:'2-digit',month:'long',year:'numeric'})
  :programMode==='week'
   ?start.toLocaleDateString('el-GR',{day:'2-digit',month:'2-digit',year:'numeric'})+' – '+end.toLocaleDateString('el-GR',{day:'2-digit',month:'2-digit',year:'numeric'})
   :start.toLocaleDateString('el-GR',{month:'long',year:'numeric'});
 let html=days.map(day=>{
  let ds=fmtDate(day),jobs=J.filter(j=>j.date===ds).sort((a,b)=>(a.start||'').localeCompare(b.start||''));
  if(programMode==='month'&&!jobs.length)return '';
  let items=jobs.length?jobs.map(j=>`<button type="button" class="program-job ${statusClass(j.status)}" onclick="editJob('${j.id}')"><span class="program-time">${esc(j.start||'--:--')}${j.end?'–'+esc(j.end):''}</span><span class="program-main"><b>${esc(j.client||j.type||'Χωρίς πελάτη')}</b><small>${esc(names(j.employeeIds))} · ${esc(veh(j.vehicleId))}</small></span><span class="badge ${statusClass(j.status)}">${esc(j.status||'Προγραμματισμένη')}</span></button>`).join(''):'<div class="program-empty">Δεν υπάρχουν εργασίες.</div>';
  return `<section class="program-day ${ds===today()?'is-today':''}"><div class="program-date"><b>${day.toLocaleDateString('el-GR',{weekday:'long'})}</b><span>${day.toLocaleDateString('el-GR',{day:'2-digit',month:'2-digit',year:'numeric'})}</span></div><div class="program-list">${items}</div></section>`
 }).join('');
 $('programAgenda').innerHTML=html||'<div class="panel">Δεν υπάρχουν προγραμματισμένες εργασίες σε αυτό το διάστημα.</div>'
}
function viberSend(text,shortLabel){if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(text).catch(()=>{});let short=(shortLabel||text).slice(0,90);window.open('viber://forward?text='+encodeURIComponent(short),'_blank');setTimeout(()=>alert('Το πλήρες κείμενο αντιγράφηκε στο πρόχειρο.\n\nΤο Viber κόβει τα μεγάλα μηνύματα στην αυτόματη προώθηση, γι\' αυτό άνοιξε απλά τη συνομιλία/ομάδα, σβήσε το σύντομο κείμενο που μπήκε αυτόματα, και κάνε Ctrl+V για να επικολλήσεις όλα τα στοιχεία πλήρη.'),400)}
function addViberField(parts,value,label,icon=''){let v=String(value??'').trim();if(v&&v!=='—'&&v!=='Χωρίς ανάθεση')parts.push(`${icon}${label?label+': ':''}${v}`)}
function sendJobViber(id){
 let j=J.find(x=>x.id===id);if(!j)return;
 let parts=[];
 addViberField(parts,j.code,'Εργασία','📋 ');
 addViberField(parts,j.client,'Πελάτης','👤 ');
 addViberField(parts,j.phone,'Τηλέφωνο','📞 ');addViberField(parts,j.email,'Email','✉️ ');addViberField(parts,j.pylonRef,'Pylon','🧾 ');
 addViberField(parts,j.address,'Διεύθυνση','📍 ');
 if(j.date){let hours=(j.start&&j.end)?` ${j.start}–${j.end}`:'';addViberField(parts,`${j.date}${hours}`,'Ημερομηνία','📅 ')}
 addViberField(parts,j.type,'Είδος εργασίας','🔧 ');
 addViberField(parts,j.equip,'Μάρκα / Μοντέλο','❄️ ');
 addViberField(parts,j.task,'Περιγραφή','📝 ');
 if((j.employeeIds||[]).length)addViberField(parts,names(j.employeeIds),'Τεχνικοί','👷 ');
 if(j.vehicleId)addViberField(parts,veh(j.vehicleId),'Όχημα','🚐 ');
 addViberField(parts,j.priority&&j.priority!=='Κανονική'?j.priority:'','Προτεραιότητα','⚠️ ');
 addViberField(parts,j.notes,'Σημειώσεις','💬 ');
 if(!parts.length)return alert('Δεν υπάρχουν συμπληρωμένα στοιχεία για αποστολή.');
 viberSend(parts.join('\n'),[j.code,j.client].filter(Boolean).join(' — ')||'Εργασία');
}
function sendTodayViber(){
 let d=today(),T=J.filter(x=>x.date===d).sort((a,b)=>(a.start||'').localeCompare(b.start||''));
 if(!T.length)return alert('Δεν υπάρχουν προγραμματισμένες εργασίες σήμερα.');
 let lines=T.map(j=>{
   let p=[];
   if(j.start&&j.end)p.push(`${j.start}–${j.end}`);
   if(j.client)p.push(j.client);
   if(j.type)p.push(j.type);
   if((j.employeeIds||[]).length)p.push(names(j.employeeIds));
   if(j.vehicleId)p.push(veh(j.vehicleId));
   return p.length?'• '+p.join(' | '):'';
 }).filter(Boolean);
 let dateStr=new Date().toLocaleDateString('el-GR',{weekday:'long',day:'2-digit',month:'2-digit'});
 viberSend([`📅 Πρόγραμμα ${dateStr}`,...lines].join('\n'),`Πρόγραμμα ${dateStr} (${T.length} εργασίες)`);
}
function markDone(id){let j=J.find(x=>x.id===id);if(j){j.status='Ολοκληρώθηκε';save();render()}}
function render(){renderDash();renderDashboardJobDetails();renderJobs();renderWeek();renderLists();renderEmpStats();renderClients();refreshClientList()}
function renderDash(){let d=today(),T=J.filter(j=>j.date===d).sort((a,b)=>a.start.localeCompare(b.start)),AE=E.filter(e=>e.active!==false&&!empOnLeave(e,d)),AV=V.filter(v=>v.active!==false),BE=new Set(J.filter(nowBusy).flatMap(j=>j.employeeIds||[])),BV=new Set(J.filter(nowBusy).map(j=>j.vehicleId).filter(Boolean)),ongoingAll=J.filter(j=>j.status==='Σε εξέλιξη'),carried=ongoingAll.filter(j=>j.date&&j.date<d).sort((a,b)=>a.date.localeCompare(b.date)),pr={'Επείγουσα':0,'Υψηλή':1,'Κανονική':2},queue=J.filter(j=>!j.date).sort((a,b)=>(pr[a.priority]??2)-(pr[b.priority]??2)||a.id.localeCompare(b.id));$('dateLabel').textContent=new Date().toLocaleDateString('el-GR',{weekday:'long',day:'2-digit',month:'long',year:'numeric'});$('k1').textContent=J.filter(j=>workState(j).key==='today').length;$('k7').textContent=J.filter(j=>workState(j).key==='expired').length;$('k8').textContent=J.filter(j=>workState(j).key==='active').length;$('k9').textContent=J.filter(j=>workState(j).key==='waiting').length;$('k10').textContent=J.filter(j=>workState(j).key==='completed').length;$('k2').textContent=ongoingAll.length;$('k3').textContent=AE.filter(e=>!BE.has(e.id)).length;$('k4').textContent=AV.filter(v=>!v.outOfService&&!BV.has(v.id)).length;$('k6').textContent=queue.length;let i=T.reduce((s,j)=>s+Number(j.income||0),0),e=T.reduce((s,j)=>s+Number(j.expense||0),0);$('k5').textContent=eur(i-e);$('todayBody').innerHTML=T.length?T.map(j=>`<tr><td><b>${j.start}–${j.end}</b></td><td>${esc(j.client||'—')}</td><td>${esc(j.type||j.task||'—')}</td><td>${esc(names(j.employeeIds))}</td><td>${esc(veh(j.vehicleId))}</td><td>${stateBadge(j)}</td><td><button class="btn light" onclick="editJob('${j.id}')">✏️</button></td></tr>`).join(''):'<tr><td colspan="7">Δεν υπάρχουν εργασίες σήμερα.</td></tr>';$('empNow').innerHTML=AE.length?AE.map(e=>`<div class="res"><span>${esc(e.name)}</span><span class="${BE.has(e.id)?'bad':'ok'}">${BE.has(e.id)?'● Απασχολημένος':'● Διαθέσιμος'}</span></div>`).join(''):'Δεν υπάρχουν τεχνικοί.';$('vehNow').innerHTML=AV.length?AV.map(v=>v.outOfService?`<div class="res"><span>${esc(v.plate+(v.model?' • '+v.model:''))}<span class="vehicle-problem-dash">⚠️ ${esc(v.problem||'Χωρίς περιγραφή προβλήματος')}</span></span><span class="bad">● ΑΚΙΝΗΤΟ</span></div>`:`<div class="res"><span>${esc(v.plate+(v.model?' • '+v.model:''))}</span><span class="${BV.has(v.id)?'bad':'ok'}">${BV.has(v.id)?'● Σε χρήση':'● Διαθέσιμο'}</span></div>`).join(''):'Δεν υπάρχουν οχήματα.';let R=J.filter(j=>j.reminder&&j.status!=='Ολοκληρώθηκε').sort((a,b)=>a.reminder.localeCompare(b.reminder)).slice(0,6);$('remNow').innerHTML=R.length?R.map(j=>`<div class="res"><span>${esc(j.client||j.type)}</span><span style="display:flex;gap:6px;align-items:center"><b>${j.reminder}</b><button class="btn light" style="padding:2px 6px;font-size:10px" title="Ολοκληρώθηκε" onclick="markDone('${j.id}')">✓</button></span></div>`).join(''):'Καμία ενεργή υπενθύμιση.';$('carriedPanel').style.display=carried.length?'block':'none';$('carriedBody').innerHTML=carried.length?carried.map(j=>`<tr class="overdue"><td>${j.date}</td><td>${esc(j.client||'—')}</td><td>${esc(names(j.employeeIds))}</td><td>${esc(veh(j.vehicleId))}</td><td><div class="actions"><button class="btn light" onclick="editJob('${j.id}')">✏️</button><button class="btn good" onclick="markDone('${j.id}')">✓ Ολοκλήρωση</button></div></td></tr>`).join(''):'';$('queueBody').innerHTML=queue.length?queue.map(j=>`<tr class="queue"><td><b>${esc(j.client||'—')}</b></td><td>${esc(j.type||j.task||'—')}</td><td><span class="pill ${j.priority==='Επείγουσα'?'hi':j.priority==='Υψηλή'?'mid':'lo'}">${esc(j.priority||'Κανονική')}</span></td><td><div class="actions"><button class="btn primary" onclick="scheduleJob('${j.id}')">📅 Προγραμματισμός</button><button class="btn light" onclick="editJob('${j.id}')">✏️</button><button class="btn danger" onclick="delJob('${j.id}')">🗑️</button></div></td></tr>`).join(''):'<tr><td colspan="4">Δεν υπάρχουν εργασίες σε ουρά.</td></tr>'}
function renderDashboardJobDetails(){
 const body=$('todayBody');
 if(!body)return;
 const jobs=J.filter(j=>j.date===today()).sort((a,b)=>a.start.localeCompare(b.start));
 const rows=body.querySelectorAll('tr');
 jobs.forEach((j,index)=>{
  const cell=rows[index]?.children?.[2];
  if(cell)cell.innerHTML=`<div>${esc(j.type||'—')}</div>${jobDetailsHtml(j,'job-dashboard-detail')}`;
 });
}
let jobSort={key:'date',dir:-1};
function sortJobs(key){if(jobSort.key===key)jobSort.dir*=-1;else{jobSort.key=key;jobSort.dir=1}renderJobs()}
function updateSortIndicators(){['code','date','client','status'].forEach(k=>{let el=$('th_'+k);if(el)el.textContent=el.dataset.label+(jobSort.key===k?(jobSort.dir>0?' ▲':' ▼'):'')})}
function clearFilters(){$('search').value='';$('jfStatus').value='';$('jfEmp').value='';$('jfFrom').value='';$('jfTo').value='';$('jfQueue').value='';renderJobs()}
function renderJobs(){let empSel=$('jfEmp'),curEmp=empSel.value;empSel.innerHTML='<option value="">Όλοι</option>'+E.map(e=>`<option value="${e.id}">${esc(e.name)}</option>`).join('');empSel.value=curEmp;
let q=($('search')?.value||'').toLowerCase(),st=$('jfStatus')?.value||'',emp=$('jfEmp')?.value||'',from=$('jfFrom')?.value||'',to=$('jfTo')?.value||'',fq=$('jfQueue')?.value||'';
let A=J.filter(j=>{let techNames=names(j.employeeIds||[]);if(q&&!([j.client,j.phone,j.address,j.type,j.task,j.notes,j.partsUsed,j.code,j.pylonRef,j.assignmentNo,j.storeNo,j.city,j.assignmentSender,j.contractorName,j.contractorPhone,j.assignmentNotes,techNames].join(' ').toLowerCase().includes(q)))return false;if(st&&!workStateMatches(j,st))return false;if(emp&&!(j.employeeIds||[]).includes(emp))return false;if(fq==='dated'&&!j.date)return false;if(fq==='queue'&&j.date)return false;if(from&&(!j.date||j.date<from))return false;if(to&&(!j.date||j.date>to))return false;return true});
let cmp={code:(a,b)=>(a.code||'').localeCompare(b.code||''),date:(a,b)=>((a.date||'')+(a.start||'')).localeCompare((b.date||'')+(b.start||'')),client:(a,b)=>(a.client||'').localeCompare(b.client||''),status:(a,b)=>(a.status||'').localeCompare(b.status||'')};
A.sort((a,b)=>(cmp[jobSort.key]?cmp[jobSort.key](a,b):0)*jobSort.dir);
$('jobsBody').innerHTML=A.length?A.map(j=>`<tr class="${j.date?'':'queue'}"><td>${esc(j.code||'—')}</td><td>${j.date||'<span class="pill lo">Ουρά</span>'}</td><td>${j.date?j.start+'–'+j.end:'—'}</td><td><b>${esc(j.client||'—')}</b><div class="small">${esc(j.type||'')} ${j.equip?'• '+esc(j.equip):''}</div>${jobDetailsHtml(j,'job-list-detail')}${(j.assignmentNo||j.storeNo||j.city||j.assignmentSender||j.contractorName)?`<div class="small"><b>Ανάθεση:</b> ${j.assignmentNo?esc(j.assignmentNo):'—'}${j.storeNo?' • Κατάστημα '+esc(j.storeNo):''}${j.city?' • '+esc(j.city):''}</div><div class="small">${j.assignmentSender?'Από: '+esc(j.assignmentSender):''}${j.contractorName?' • Ανάδοχος: '+esc(j.contractorName):''}${j.contractorPhone?' ('+esc(j.contractorPhone)+')':''}</div>`:''}</td><td>${esc(names(j.employeeIds))}</td><td>${esc(veh(j.vehicleId))}</td><td>${stateBadge(j)}</td><td><div class="actions">${j.date?'':'<button class="btn primary" onclick="scheduleJob(\''+j.id+'\')" title="Προγραμματισμός">📅</button>'}${j.date&&j.status!=='Ολοκληρώθηκε'&&j.status!=='Ακυρώθηκε'?`<button class="btn good" onclick="addJobToBoard('${j.id}')" title="Προσθήκη στον Πίνακα Κίνησης Συνεργείων">➕ Πίνακας</button>`:''}<button class="btn light" onclick="editJob('${j.id}')">✏️</button><button class="btn light" onclick="cloneJob('${j.id}')" title="Αντιγραφή σε νέα εργασία">📋</button><button class="btn light" onclick="printJob('${j.id}')" title="Εκτύπωση">🖨️</button><button class="btn light" onclick="sendJobViber('${j.id}')" title="Αποστολή στο Viber">📨</button><button class="btn danger" onclick="delJob('${j.id}')">🗑️</button></div></td></tr>`).join(''):'<tr><td colspan="8">Δεν υπάρχουν εργασίες.</td></tr>';
let i=A.reduce((s,j)=>s+Number(j.income||0),0),e=A.reduce((s,j)=>s+Number(j.expense||0),0);
$('jobsFoot').innerHTML=A.length?`<td colspan="3">Σύνολο (${A.length})</td><td colspan="2">Έσοδα: ${eur(i)} • Έξοδα: ${eur(e)} • Καθαρό: ${eur(i-e)}</td><td colspan="3"></td>`:'';
updateSortIndicators()}
function openBoardTab(){
 let btn=document.querySelector('nav button[data-tab="board"]');
 if(btn)btn.click();
}
function addJobToBoard(id){
 let j=J.find(x=>x.id===id);
 if(!j)return alert('Η εργασία δεν βρέθηκε.');
 if(!j.date)return alert('Η εργασία δεν έχει ημερομηνία. Πάτησε πρώτα Προγραμματισμός.');
 if(j.status==='Ολοκληρώθηκε'||j.status==='Ακυρώθηκε')return alert('Η εργασία είναι ολοκληρωμένη ή ακυρωμένη.');
 let existing='';
 Object.entries(B).some(([key,x])=>{if((x.jobs||[]).includes(id)){existing=key;return true}return false});
 if(existing){
   boardSelectedDate=existing.split('#')[0];
   boardStart=fmtDate(mondayOf(new Date(boardSelectedDate+'T12:00:00')));
   openBoardTab();
   return alert('Η εργασία βρίσκεται ήδη στον Πίνακα Κίνησης, στο Συνεργείο '+existing.split('#')[1]+'.');
 }
 let slot=prompt('Σε ποιο συνεργείο να προστεθεί η εργασία;\nΓράψε αριθμό από 1 έως 5.','1');
 if(slot===null)return;
 slot=String(slot).trim();
 if(!['1','2','3','4','5'].includes(slot))return alert('Δώσε αριθμό συνεργείου από 1 έως 5.');
 removeFromAll('job',id);
 let key=boardKey(j.date,Number(slot)),entry=boardEntry(key);
 if(!entry.jobs.includes(id))entry.jobs.push(id);
 save();
 boardSelectedDate=j.date;
 boardStart=fmtDate(mondayOf(new Date(j.date+'T12:00:00')));
 openBoardTab();
 setTimeout(()=>{
   let cell=document.querySelector('[data-board-key="'+key+'"]');
   if(cell){cell.scrollIntoView({behavior:'smooth',block:'center'});cell.style.outline='3px solid #22c55e';setTimeout(()=>cell.style.outline='',1800)}
 },80);
}
function renderLists(){
 $('empList').innerHTML=E.length?E.map(e=>{let li=empLeaveInfo(e,today()),period=e.leaveFrom&&e.leaveTo?`${e.leaveReason||'Άδεια'}: ${e.leaveFrom.split('-').reverse().join('/')}–${e.leaveTo.split('-').reverse().join('/')}`:'';return `<div class="list"><div><b>${esc(e.name)}</b>${li?`<span class="leave-note">${esc(li.reason)}</span>`:''}<div class="small">${esc(e.role||'')} ${e.phone?'• '+esc(e.phone):''}${period?' • '+esc(period):''}</div></div><div class="actions"><button class="btn light" onclick="editEmp('${e.id}')">✏️</button><button class="btn ${e.active===false?'danger':'light'}" onclick="toggleEmp('${e.id}')">${e.active===false?'Ανενεργός':'Ενεργός'}</button><button class="btn danger" onclick="delEmp('${e.id}')">🗑️</button></div></div>`}).join(''):'Δεν υπάρχουν τεχνικοί.';
 $('vehList').innerHTML=V.length?V.map(v=>{let out=!!v.outOfService,problem=String(v.problem||'').trim();return `<div class="list ${out?'vehicle-out-list':''}"><div><b>${esc(v.plate)}</b><span class="vehicle-status-badge ${out?'out':'ok'}">${out?'🔴 ΑΚΙΝΗΤΟ':'🟢 ΣΕ ΛΕΙΤΟΥΡΓΙΑ'}</span><div class="small">${esc(v.model||'')}</div>${out?`<div class="vehicle-problem-line">⚠️ ${esc(problem||'Χωρίς περιγραφή προβλήματος')}</div>`:''}</div><div class="actions"><button class="btn light" onclick="editVeh('${v.id}')">✏️</button><button class="btn ${v.active===false?'danger':'light'}" onclick="toggleVeh('${v.id}')">${v.active===false?'Ανενεργό':'Ενεργό'}</button><button class="btn danger" onclick="delVeh('${v.id}')">🗑️</button></div></div>`}).join(''):'Δεν υπάρχουν οχήματα.'
}
function saveEmp(){let id=$('empId').value,n=$('empName').value.trim(),lf=$('empLeaveFrom').value,lt=$('empLeaveTo').value,lr=$('empLeaveReason').value;if(!n)return alert('Συμπλήρωσε όνομα.');if((lf&&!lt)||(!lf&&lt))return alert('Συμπλήρωσε και έναρξη και λήξη απουσίας.');if(lf&&lt&&lt<lf)return alert('Η λήξη απουσίας δεν μπορεί να είναι πριν από την έναρξη.');if(lf&&lt&&!lr)lr='Άδεια';let d={name:n,role:$('empRole').value.trim(),phone:$('empPhone').value.trim(),leaveFrom:lf,leaveTo:lt,leaveReason:lr};if(id)Object.assign(E.find(x=>x.id===id),d);else E.push({id:uid('EMP'),active:true,...d});clearEmp();save();render();renderBoard()}function editEmp(id){let e=E.find(x=>x.id===id);$('empId').value=id;$('empName').value=e.name;$('empRole').value=e.role||'';$('empPhone').value=e.phone||'';$('empLeaveFrom').value=e.leaveFrom||'';$('empLeaveTo').value=e.leaveTo||'';$('empLeaveReason').value=e.leaveReason||''}function clearEmp(){$('empId').value='';$('empName').value='';$('empRole').value='';$('empPhone').value='';$('empLeaveFrom').value='';$('empLeaveTo').value='';$('empLeaveReason').value=''}function toggleEmp(id){let e=E.find(x=>x.id===id);e.active=e.active===false;save();render()}async function delEmp(id){let used=J.some(j=>(j.employeeIds||[]).includes(id));let msg=used?'Ο τεχνικός συμμετέχει σε εργασίες. Θα αφαιρεθεί από αυτές. Να διαγραφεί οριστικά;':'Να διαγραφεί ο τεχνικός;';if(!(await askConfirm(msg)))return;E=E.filter(x=>x.id!==id);J.forEach(j=>{if(j.employeeIds)j.employeeIds=j.employeeIds.filter(x=>x!==id)});save();render()}
function saveVeh(){let id=$('vehId').value,p=$('vehPlate').value.trim();if(!p)return alert('Συμπλήρωσε πινακίδα.');if(!id&&V.some(v=>v.plate.toLowerCase()===p.toLowerCase()))return alert('Υπάρχει ήδη όχημα με αυτή την πινακίδα.');let out=$('vehCondition').value==='out',problem=$('vehProblem').value.trim();if(out&&!problem)return alert('Γράψε ποιο πρόβλημα έχει το όχημα πριν το δηλώσεις Ακίνητο / Εκτός λειτουργίας.');let d={plate:p,model:$('vehModel').value.trim(),outOfService:out,problem:problem};if(id)Object.assign(V.find(x=>x.id===id),d);else V.push({id:uid('VEH'),active:true,...d});clearVeh();save();render();renderBoard()}function editVeh(id){let v=V.find(x=>x.id===id);$('vehId').value=id;$('vehPlate').value=v.plate;$('vehModel').value=v.model||'';$('vehCondition').value=v.outOfService?'out':'ok';$('vehProblem').value=v.problem||''}function clearVeh(){$('vehId').value='';$('vehPlate').value='';$('vehModel').value='';$('vehCondition').value='ok';$('vehProblem').value=''}function toggleVeh(id){let v=V.find(x=>x.id===id);v.active=v.active===false;save();render()}
function renderEmpStats(){if(!$('empStats'))return;let from=$('efFrom')?.value||'',to=$('efTo')?.value||'';let rows=E.map(e=>{let list=J.filter(j=>(j.employeeIds||[]).includes(e.id)&&(!from||(j.date&&j.date>=from))&&(!to||(j.date&&j.date<=to)));let inc=list.reduce((s,j)=>s+Number(j.income||0)/Math.max(1,(j.employeeIds||[]).length),0),exp=list.reduce((s,j)=>s+Number(j.expense||0)/Math.max(1,(j.employeeIds||[]).length),0);return{name:e.name,count:list.length,inc,exp}}).sort((a,b)=>b.count-a.count);$('empStats').innerHTML=rows.length?rows.map(r=>`<tr><td>${esc(r.name)}</td><td>${r.count}</td><td>${eur(r.inc)}</td><td>${eur(r.exp)}</td><td>${eur(r.inc-r.exp)}</td></tr>`).join(''):'<tr><td colspan="5">Δεν υπάρχουν τεχνικοί.</td></tr>'}
function allClientNames(){let map=new Map();C.forEach(c=>map.set(clientKey(c.name),{...c}));[...J].sort((a,b)=>(a.date||'').localeCompare(b.date||'')).forEach(j=>{let n=(j.client||'').trim();if(!n)return;let k=clientKey(n);if(!map.has(k))map.set(k,{id:null,name:n,phone:j.phone||'',address:j.address||'',notes:''})});return[...map.values()]}
function clientStats(name){let k=clientKey(name),list=J.filter(j=>clientKey(j.client)===k),inc=list.reduce((s,j)=>s+Number(j.income||0),0),exp=list.reduce((s,j)=>s+Number(j.expense||0),0),last=list.reduce((m,j)=>j.date&&j.date>m?j.date:m,'');return{count:list.length,income:inc,expense:exp,net:inc-exp,last}}
function refreshClientList(){let dl=$('clientNames');if(dl)dl.innerHTML=allClientNames().map(c=>`<option value="${esc(c.name)}">`).join('')}
function autofillClient(){let name=$('jClient').value.trim();if(!name)return;let m=allClientNames().find(c=>clientKey(c.name)===clientKey(name));if(m){if(!$('jPhone').value&&m.phone)$('jPhone').value=m.phone;if(!$('jAddress').value&&m.address)$('jAddress').value=m.address}}
function renderClients(){let q=($('cliSearch')?.value||'').toLowerCase(),list=allClientNames().filter(c=>!q||c.name.toLowerCase().includes(q)||(c.phone||'').includes(q));list.sort((a,b)=>a.name.localeCompare(b.name,'el'));window.__clientsCache=list;$('clientsBody').innerHTML=list.length?list.map((c,i)=>{let st=clientStats(c.name);return `<tr><td><b>${esc(c.name)}</b></td><td>${esc(c.phone||'—')}</td><td>${esc(c.address||'—')}</td><td>${st.count}</td><td>${eur(st.income)}</td><td>${eur(st.expense)}</td><td>${eur(st.net)}</td><td>${st.last||'—'}</td><td><div class="actions"><button class="btn light" onclick="editClientAt(${i})">✏️</button><button class="btn light" onclick="openClientHistAt(${i})">📜</button>${c.id?`<button class="btn danger" onclick="delClient('${c.id}')">🗑️</button>`:''}</div></td></tr>`}).join(''):'<tr><td colspan="9">Δεν υπάρχουν πελάτες.</td></tr>'}
function editClientAt(i){let c=window.__clientsCache[i];$('cliId').value=c.id||'';$('cliName').value=c.name||'';$('cliPhone').value=c.phone||'';$('cliAddress').value=c.address||'';$('cliNotes').value=c.notes||'';document.querySelector('[data-tab="clients"]').scrollIntoView&&window.scrollTo(0,0)}
function openClientHistAt(i){openClientHist(window.__clientsCache[i].name)}
function openClientHist(name){let k=clientKey(name),list=J.filter(j=>clientKey(j.client)===k).sort((a,b)=>(b.date||'').localeCompare(a.date||''));$('clientHistTitle').textContent='Ιστορικό: '+name;$('clientHistBody').innerHTML=list.length?list.map(j=>`<tr><td>${esc(j.code||'')}</td><td>${j.date||'Ουρά'}</td><td>${esc(j.type||j.task||'—')}</td><td><span class="badge ${statusClass(j.status)}">${esc(j.status)}</span></td><td>${eur(j.income)}</td><td>${eur(j.expense)}</td></tr>`).join(''):'<tr><td colspan="6">Καμία εργασία.</td></tr>';$('clientHistModal').classList.add('open')}
function closeClientHist(){$('clientHistModal').classList.remove('open')}
function saveClient(){let id=$('cliId').value,name=$('cliName').value.trim();if(!name)return alert('Συμπλήρωσε όνομα επαφής.');let d={name,phone:$('cliPhone').value.trim(),address:$('cliAddress').value.trim(),notes:$('cliNotes').value.trim()};if(id){Object.assign(C.find(x=>x.id===id),d)}else{let existing=C.find(x=>clientKey(x.name)===clientKey(name));if(existing)Object.assign(existing,d);else C.push({id:uid('CLI'),...d})}clearClient();save();render()}
function clearClient(){$('cliId').value='';$('cliName').value='';$('cliPhone').value='';$('cliAddress').value='';$('cliNotes').value=''}
async function delClient(id){if(!(await askConfirm('Να διαγραφεί ο πελάτης; Οι υπάρχουσες εργασίες του παραμένουν ως έχουν.')))return;C=C.filter(x=>x.id!==id);save();render()}
function downloadClientTemplate(){let csv='Όνομα,Τηλέφωνο,Διεύθυνση,Σημειώσεις\r\n'+[csvField('LIDL ΚΑΛΛΙΚΡΑΤΕΙΑΣ'),csvField('2310123456'),csvField('Καλλικρατείας 67, Θεσσαλονίκη'),csvField('Παράδειγμα εγγραφής')].join(',')+'\r\n';let b=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'}),u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download='CrewFlow_Clients_Template.csv';a.click();URL.revokeObjectURL(u)}
function detectDelim(text){let head=(text.split(/\r?\n/)[0]||'');return head.split(';').length>head.split(',').length?';':','}
function parseCSV(text,delim){text=text.replace(/^\uFEFF/,'');let rows=[],row=[],field='',inQ=false;for(let i=0;i<text.length;i++){let c=text[i];if(inQ){if(c==='"'){if(text[i+1]==='"'){field+='"';i++}else inQ=false}else field+=c}else{if(c==='"')inQ=true;else if(c===delim){row.push(field);field=''}else if(c==='\r'){}else if(c==='\n'){row.push(field);rows.push(row);row=[];field=''}else field+=c}}if(field.length||row.length){row.push(field);rows.push(row)}return rows.filter(r=>!(r.length===1&&r[0].trim()===''))}
async function importClientsCSV(){let f=$('cliFileIn').files[0];if(!f)return alert('Επίλεξε αρχείο CSV.');let fname=(f.name||'').toLowerCase();if(fname.endsWith('.xlsx')||fname.endsWith('.xls'))return alert('Αυτό είναι αρχείο Excel (.xlsx), όχι CSV κειμένου.\n\nΆνοιξέ το στο Excel και κάνε: Αρχείο → Αποθήκευση ως → CSV UTF-8 (Οριοθετημένο με κόμμα). Μετά ανέβασε το νέο .csv αρχείο που θα δημιουργηθεί.');let text=await f.text();let badChars=(text.match(/\uFFFD/g)||[]).length;if(badChars>5)return alert('Το αρχείο δεν μοιάζει με έγκυρο κείμενο CSV (μοιάζει με δυαδικό αρχείο Excel). Σιγουρέψου ότι έκανες "Αποθήκευση ως → CSV UTF-8" στο Excel πριν το ανεβάσεις.');let delim=detectDelim(text),rows=parseCSV(text,delim);if(!rows.length)return alert('Το αρχείο είναι κενό.');let header=rows[0].map(h=>h.trim().toLowerCase()),idx={name:header.findIndex(h=>/ονομα|name/.test(h)),phone:header.findIndex(h=>/τηλεφ|phone/.test(h)),address:header.findIndex(h=>/διευθυν|address/.test(h)),notes:header.findIndex(h=>/σημειω|notes/.test(h))};let dataRows=rows.slice(1);if(idx.name<0){idx={name:0,phone:1,address:2,notes:3};dataRows=rows}let added=0,updated=0;dataRows.forEach(r=>{let name=(r[idx.name]||'').trim();if(!name)return;let phone=idx.phone>=0?(r[idx.phone]||'').trim():'',address=idx.address>=0?(r[idx.address]||'').trim():'',notes=idx.notes>=0?(r[idx.notes]||'').trim():'';let existing=C.find(x=>clientKey(x.name)===clientKey(name));if(existing){if(phone)existing.phone=phone;if(address)existing.address=address;if(notes)existing.notes=notes;updated++}else{C.push({id:uid('CLI'),name,phone,address,notes});added++}});save();render();$('cliFileIn').value='';alert(`Η εισαγωγή ολοκληρώθηκε: ${added} νέοι πελάτες, ${updated} ενημερώθηκαν.`)}
async function clearAllClients(){if(!(await askConfirm('Να διαγραφούν ΟΛΟΙ οι καταχωρημένοι πελάτες; (Οι εργασίες σου ΔΕΝ επηρεάζονται.)','Διαγραφή όλων')))return;C=[];save();render()}
async function delVeh(id){let used=J.some(j=>j.vehicleId===id);let msg=used?'Το όχημα χρησιμοποιείται σε εργασίες. Θα αφαιρεθεί από αυτές. Να διαγραφεί οριστικά;':'Να διαγραφεί το όχημα;';if(!(await askConfirm(msg)))return;V=V.filter(x=>x.id!==id);J.forEach(j=>{if(j.vehicleId===id)j.vehicleId=''});save();render()}
function fillRes(ids=[],vid=''){let d=$('jDate').value,s=timeGet('jStart'),e=timeGet('jEnd'),ignore=$('jobId').value,valid=d&&s&&e&&mins(e)>mins(s),EE=E.filter(x=>x.active!==false||ids.includes(x.id)).map(x=>({...x,onLeave:!!(d&&empOnLeave(x,d)),busy:valid&&busyEmp(x.id,d,s,e,ignore)})).sort((a,b)=>a.onLeave-b.onLeave||a.busy-b.busy),VV=V.filter(x=>x.active!==false||x.id===vid).map(x=>({...x,busy:valid&&busyVeh(x.id,d,s,e,ignore)})).sort((a,b)=>(a.outOfService?1:0)-(b.outOfService?1:0)||a.busy-b.busy);$('checks').innerHTML=EE.length?EE.map(x=>`<label class="pick ${x.onLeave?'leave':x.busy?'busy':''}"><input type="checkbox" value="${x.id}" ${ids.includes(x.id)?'checked':''} ${x.onLeave&&!ids.includes(x.id)?'disabled':''}><span><b>${esc(x.name)}</b><br><span class="small">${x.onLeave?'ΣΕ '+esc((x.leaveReason||'ΑΔΕΙΑ').toUpperCase())+' — δεν είναι διαθέσιμος':!valid?'Όρισε πρώτα ημερομηνία και ώρες':(x.busy?'Απασχολημένος στην επιλεγμένη ώρα':'Διαθέσιμος')}</span></span></label>`).join(''):'Πρόσθεσε τεχνικούς.';$('jVeh').innerHTML='<option value="">Χωρίς όχημα</option>'+VV.map(x=>`<option value="${x.id}" ${x.id===vid?'selected':''} ${x.outOfService?'disabled':''}>${x.outOfService?'[ΑΚΙΝΗΤΟ] ':x.busy?'[ΑΠΑΣΧΟΛΗΜΕΝΟ] ':''}${esc(x.plate+' '+(x.model||''))}${x.outOfService?' — '+esc(x.problem||'Χωρίς περιγραφή προβλήματος'):''}</option>`).join('');let availableEE=EE.filter(x=>!x.onLeave),noEmp=valid&&availableEE.length>0&&availableEE.every(x=>x.busy),allLeave=valid&&EE.length>0&&availableEE.length===0,usableVV=VV.filter(x=>!x.outOfService),noVeh=valid&&usableVV.length>0&&usableVV.every(x=>x.busy),noUsableVeh=valid&&VV.length>0&&usableVV.length===0,currentBroken=VV.find(x=>x.id===vid&&x.outOfService);$('empWarn').className='alert err'+((noEmp||allLeave)?' show':'');$('empWarn').textContent=allLeave?'⚠️ Όλοι οι ενεργοί τεχνικοί έχουν άδεια ή άλλη απουσία στην επιλεγμένη ημερομηνία.':noEmp?'⚠️ Δεν υπάρχει κανένας διαθέσιμος τεχνικός σε αυτό το χρονικό διάστημα.':'';$('vehWarn').className='alert err'+((currentBroken||noVeh||noUsableVeh)?' show':'');$('vehWarn').textContent=currentBroken?'🔴 Το επιλεγμένο όχημα είναι ΑΚΙΝΗΤΟ / ΕΚΤΟΣ ΛΕΙΤΟΥΡΓΙΑΣ: '+(currentBroken.problem||'Χωρίς περιγραφή προβλήματος'):noUsableVeh?'⚠️ Δεν υπάρχει κανένα όχημα σε λειτουργία.':noVeh?'⚠️ Δεν υπάρχει κανένα διαθέσιμο όχημα σε αυτό το χρονικό διάστημα.':''}
function cloneJob(id){let src=J.find(x=>x.id===id);if(!src)return;openJob();$('jClient').value=src.client||'';$('jPhone').value=src.phone||'';$('jAssignmentNo').value=src.assignmentNo||'';$('jStoreNo').value=src.storeNo||'';$('jCity').value=src.city||'';$('jAssignmentSender').value=src.assignmentSender||'';$('jAssignmentTarget').value=src.assignmentTarget||'internal';$('jContractorName').value=src.contractorName||'';$('jContractorPhone').value=src.contractorPhone||'';$('jAssignmentNotes').value=src.assignmentNotes||'';toggleAssignmentTarget();$('jAddress').value=src.address||'';$('jType').value=src.type||'Συντήρηση κλιματιστικού';$('jEquip').value=src.equip||'';$('jTask').value=src.task||'';$('jPriority').value=src.priority||'Κανονική';let xExp=expOf(src);$('jExpFuel').value=xExp.fuel||0;$('jExpParts').value=xExp.parts||0;$('jExpOther').value=xExp.other||0;updExpTotal();$('jIncome').value=src.income||0;$('jobTitle').textContent='Νέα εργασία (αντιγραφή από '+(src.code||'')+')';fillRes(src.employeeIds||[],src.vehicleId||'')}
let recognition=null,recognizing=false;
function initRecognition(){let SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR)return null;let r=new SR();r.lang='el-GR';r.continuous=true;r.interimResults=true;r.onresult=e=>{let t='';for(let i=0;i<e.results.length;i++)t+=e.results[i][0].transcript;$('voiceText').value=t};r.onend=()=>{recognizing=false;$('voiceBtn').textContent='🎤 Εκκίνηση'};r.onerror=()=>{recognizing=false;$('voiceBtn').textContent='🎤 Εκκίνηση'};return r}
function toggleVoice(){if(!recognition)recognition=initRecognition();if(!recognition)return alert('Η αναγνώριση φωνής δεν υποστηρίζεται σε αυτόν τον browser. Δοκίμασε Chrome ή Edge.');if(recognizing){recognition.stop();recognizing=false;$('voiceBtn').textContent='🎤 Εκκίνηση'}else{$('voiceText').value='';try{recognition.start();recognizing=true;$('voiceBtn').textContent='⏹ Διακοπή'}catch(e){}}}
function stripAccents(s){return s.normalize('NFD').replace(/[\u0300-\u036f]/g,'')}
function parseVoiceText(){let raw=$('voiceText').value.trim();if(!raw)return alert('Δεν υπάρχει κείμενο για ανάλυση. Μίλησε ή γράψε κάτι πρώτα.');let t=stripAccents(raw.toLowerCase()),d=null;
if(t.includes('σημερα'))d=new Date();else if(t.includes('αυριο')&&!t.includes('μεθαυριο')){d=new Date();d.setDate(d.getDate()+1)}else if(t.includes('μεθαυριο')){d=new Date();d.setDate(d.getDate()+2)}else{let wd=['κυριακη','δευτερα','τριτη','τεταρτη','πεμπτη','παρασκευη','σαββατο'];for(let i=0;i<7;i++){if(t.includes(wd[i])){d=new Date();let diff=(i-d.getDay()+7)%7;if(diff===0)diff=7;d.setDate(d.getDate()+diff);break}}}
if(!d){let dm=t.match(/(\d{1,2})[\/.\-](\d{1,2})/);if(dm){let day=+dm[1],mon=+dm[2],y=new Date().getFullYear();d=new Date(y,mon-1,day);if(d<new Date(new Date().setHours(0,0,0,0)))d=new Date(y+1,mon-1,day)}}
if(d)$('jDate').value=fmtDate(d);
let hour=null,minute=0,tm=t.match(/(\d{1,2})[:.](\d{2})/);if(tm){hour=+tm[1];minute=+tm[2]}else{let tm2=t.match(/στις\s+(\d{1,2})/);if(tm2)hour=+tm2[1]}
if(hour!=null){if((t.includes('απογευμα')||t.includes('βραδυ'))&&hour<8)hour+=12;timeSet('jStart',String(hour).padStart(2,'0')+':'+String(minute).padStart(2,'0'));let endH=Math.min(hour+1,23);timeSet('jEnd',String(endH).padStart(2,'0')+':'+String(minute).padStart(2,'0'))}
let matchedClient=allClientNames().find(c=>t.includes(stripAccents(c.name.toLowerCase())));if(matchedClient){$('jClient').value=matchedClient.name;autofillClient()}
let types=['Συντήρηση κλιματιστικού','Εγκατάσταση κλιματιστικού','Επισκευή βλάβης','Καθαρισμός','Έλεγχος διαρροής','Πλήρωση ψυκτικού υγρού','Συντήρηση καυστήρα','Εργασία λέβητα','Αντλία θερμότητας','Αυτοψία / Προσφορά'];let mt=types.find(ty=>t.includes(stripAccents(ty.toLowerCase())));if(mt)$('jType').value=mt;
let ph=raw.match(/\b\d{10}\b/);if(ph)$('jPhone').value=ph[0];
if(!$('jTask').value)$('jTask').value=raw;
let matchedTechs=E.filter(e=>{let fn=stripAccents((e.name||'').toLowerCase().split(' ')[0]);return fn&&t.includes(fn)});
fillRes(matchedTechs.map(x=>x.id),$('jVeh').value);
alert('Έγινε αυτόματη συμπλήρωση από την υπαγόρευση — έλεγξε τα πεδία πριν πατήσεις Αποθήκευση.')}
function toggleAssignmentTarget(){let ext=$('jAssignmentTarget')&&$('jAssignmentTarget').value==='external';document.querySelectorAll('.assignment-external').forEach(x=>x.style.display=ext?'block':'none')}function refreshResources(){let ids=[...document.querySelectorAll('#checks input:checked')].map(x=>x.value);fillRes(ids,$('jVeh').value)}function toggleRem(){$('remWrap').style.display=$('jRemMode').value==='date'?'block':'none'}function openJob(){$('modal').classList.add('open');$('jobTitle').textContent='Νέα εργασία';$('jobId').value='';$('jDate').value=today();timeSet('jStart','08:00');timeSet('jEnd','09:00');$('jStatus').value='Προγραμματισμένη';$('jRemMode').value='none';$('jReminder').value='';toggleRem();$('jPriority').value='Κανονική';$('jAssignmentTarget').value='internal';toggleAssignmentTarget();['jClient','jPhone','jEmail','jPylonRef','jAssignmentNo','jStoreNo','jCity','jAssignmentSender','jContractorName','jContractorPhone','jAssignmentNotes','jAddress','jTask','jEquip','jNotes','jPartsUsed','jSignature'].forEach(x=>$(x).value='');$('jDeadline').value='';$('jPhotoList').innerHTML='';$('jPhotos').value='';$('jIncome').value=0;$('jExpFuel').value=0;$('jExpParts').value=0;$('jExpOther').value=0;updExpTotal();$('alert').className='alert';fillRes()}
function openQueueJob(){openJob();$('jDate').value='';timeSet('jStart','');timeSet('jEnd','');$('jStatus').value='Σε αναμονή';fillRes()}
function scheduleJob(id){editJob(id);if(!$('jDate').value)$('jDate').value=today();if(!timeGet('jStart'))timeSet('jStart','08:00');if(!timeGet('jEnd'))timeSet('jEnd','09:00');refreshResources();setTimeout(()=>$('jDate').focus(),60)}
function closeJob(){$('modal').classList.remove('open')}
function editJob(id){let j=J.find(x=>x.id===id);$('modal').classList.add('open');$('jobTitle').textContent='Επεξεργασία εργασίας';$('jobId').value=id;$('jDate').value=j.date;timeSet('jStart',j.start);timeSet('jEnd',j.end);$('jStatus').value=j.status;$('jPriority').value=j.priority||'Κανονική';$('jClient').value=j.client||'';$('jPhone').value=j.phone||'';$('jEmail').value=j.email||'';$('jPylonRef').value=j.pylonRef||'';$('jAssignmentNo').value=j.assignmentNo||'';$('jStoreNo').value=j.storeNo||'';$('jCity').value=j.city||'';$('jAssignmentSender').value=j.assignmentSender||'';$('jAssignmentTarget').value=j.assignmentTarget||'internal';$('jContractorName').value=j.contractorName||'';$('jContractorPhone').value=j.contractorPhone||'';$('jAssignmentNotes').value=j.assignmentNotes||'';toggleAssignmentTarget();$('jAddress').value=j.address||'';$('jTask').value=j.task||'';$('jType').value=j.type||'Συντήρηση κλιματιστικού';$('jEquip').value=j.equip||'';$('jIncome').value=j.income||0;let jx=j.expenses||{fuel:0,parts:0,other:j.expense||0};$('jExpFuel').value=jx.fuel||0;$('jExpParts').value=jx.parts||0;$('jExpOther').value=jx.other||0;updExpTotal();$('jNotes').value=j.notes||'';$('jDeadline').value=j.deadline||'';$('jPartsUsed').value=j.partsUsed||'';$('jSignature').value=j.signature||'';$('jPhotoList').innerHTML=(j.photos||[]).map(x=>'<span class="photo-chip">📷 '+esc(x)+'</span>').join('');$('jRemMode').value=j.reminder?'date':'none';$('jReminder').value=j.reminder||'';toggleRem();$('alert').className='alert';fillRes(j.employeeIds||[],j.vehicleId||'')}
function reminder(){let m=$('jRemMode').value;if(m==='none')return '';if(m==='date')return $('jReminder').value;let base=$('jDate').value||today(),d=new Date(base+'T00:00:00');d.setMonth(d.getMonth()+(m==='6m'?6:12));return d.toISOString().slice(0,10)}function conflicts(d){return J.filter(j=>overlap(j,d.date,d.start,d.end,d.id)).flatMap(j=>{let a=[];d.employeeIds.filter(id=>(j.employeeIds||[]).includes(id)).forEach(id=>a.push('Ο τεχνικός '+(E.find(e=>e.id===id)?.name||id)+' είναι ήδη απασχολημένος ('+j.start+'–'+j.end+').'));if(d.vehicleId&&d.vehicleId===j.vehicleId)a.push('Το όχημα '+veh(d.vehicleId)+' χρησιμοποιείται ήδη ('+j.start+'–'+j.end+').');return a})}
function nextCode(){let max=J.reduce((m,j)=>{let n=parseInt((j.code||'').replace(/\D/g,''))||0;return Math.max(m,n)},0);return 'ΕΡΓ-'+String(max+1).padStart(5,'0')}

function currentModalJobText(){let parts=[];addViberField(parts,$('jPylonRef').value,'Pylon','🧾 ');addViberField(parts,$('jClient').value,'Πελάτης','👤 ');addViberField(parts,$('jPhone').value,'Τηλέφωνο','📞 ');addViberField(parts,$('jAddress').value,'Διεύθυνση','📍 ');let ds=$('jDate').value,st=timeGet('jStart'),en=timeGet('jEnd');if(ds)addViberField(parts,ds+(st&&en?' '+st+'–'+en:''),'Ημερομηνία','📅 ');addViberField(parts,$('jType').value,'Εργασία','🔧 ');addViberField(parts,$('jTask').value,'Περιγραφή','📝 ');let ids=[...document.querySelectorAll('#checks input:checked')].map(x=>x.value);if(ids.length)addViberField(parts,names(ids),'Τεχνικοί','👷 ');if($('jVeh').value)addViberField(parts,veh($('jVeh').value),'VAN','🚐 ');return parts.join('\n')}
function modalViber(){viberSend(currentModalJobText(),$('jClient').value||'Εργασία ROMVOS')}
function modalMaps(){let a=$('jAddress').value.trim();if(!a)return alert('Δεν έχει συμπληρωθεί διεύθυνση.');window.open('https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(a),'_blank')}
function modalEmail(){let email=$('jEmail').value.trim(),sub='Εργασία ROMVOS - '+($('jClient').value||''),body=currentModalJobText();window.location.href='mailto:'+encodeURIComponent(email)+'?subject='+encodeURIComponent(sub)+'&body='+encodeURIComponent(body)}

function saveJob(force){let id=$('jobId').value,dateVal=$('jDate').value,startVal=timeGet('jStart'),endVal=timeGet('jEnd');if(dateVal&&(!startVal||!endVal||mins(endVal)<=mins(startVal))){let a=$('alert');a.className='alert err show';a.textContent='Η λήξη πρέπει να είναι μετά την έναρξη.';return}if(!dateVal){startVal='';endVal=''}let d={id:id||uid('JOB'),code:id?(J.find(j=>j.id===id)?.code):nextCode(),date:dateVal,start:startVal,end:endVal,status:$('jStatus').value,reminder:reminder(),priority:$('jPriority').value,client:$('jClient').value.trim(),phone:$('jPhone').value.trim(),email:$('jEmail').value.trim(),pylonRef:$('jPylonRef').value.trim(),assignmentNo:$('jAssignmentNo').value.trim(),storeNo:$('jStoreNo').value.trim(),city:$('jCity').value.trim(),assignmentSender:$('jAssignmentSender').value.trim(),assignmentTarget:$('jAssignmentTarget').value,contractorName:$('jContractorName').value.trim(),contractorPhone:$('jContractorPhone').value.trim(),assignmentNotes:$('jAssignmentNotes').value.trim(),address:$('jAddress').value.trim(),type:$('jType').value,equip:$('jEquip').value.trim(),task:$('jTask').value.trim(),employeeIds:[...document.querySelectorAll('#checks input:checked')].map(x=>x.value),vehicleId:$('jVeh').value,income:Number($('jIncome').value||0),expenses:{fuel:Number($('jExpFuel').value||0),parts:Number($('jExpParts').value||0),other:Number($('jExpOther').value||0)},expense:Number($('jExpFuel').value||0)+Number($('jExpParts').value||0)+Number($('jExpOther').value||0),notes:$('jNotes').value.trim(),deadline:$('jDeadline').value,partsUsed:$('jPartsUsed').value.trim(),signature:$('jSignature').value.trim(),photos:[...(J.find(x=>x.id===id)?.photos||[]),...[...$('jPhotos').files].map(f=>f.name)]};let stoppedVehicle=d.vehicleId?V.find(v=>v.id===d.vehicleId):null;if(stoppedVehicle&&stoppedVehicle.outOfService){let a=$('alert');a.className='alert err show';a.textContent='Το όχημα '+([stoppedVehicle.model,stoppedVehicle.plate].filter(Boolean).join(' • ')||'VAN')+' είναι ΑΚΙΝΗΤΟ / ΕΚΤΟΣ ΛΕΙΤΟΥΡΓΙΑΣ και δεν μπορεί να ανατεθεί. Πρόβλημα: '+(stoppedVehicle.problem||'Χωρίς περιγραφή προβλήματος');return}let c=dateVal?conflicts(d):[];if(c.length&&!force){let a=$('alert');a.className='alert warn show';a.innerHTML='<b>Βρέθηκαν συγκρούσεις:</b><br>'+c.map(x=>'• '+esc(x)).join('<br>')+'<br><button class="btn primary" onclick="saveJob(true)" style="margin-top:6px">Καταχώριση παρά την προειδοποίηση</button>';return}if(id)J[J.findIndex(j=>j.id===id)]=d;else J.push(d);save();closeJob();render()}async function delJob(id){if(await askConfirm('Να διαγραφεί η εργασία;')){J=J.filter(j=>j.id!==id);save();render()}}
function expOf(j){return j.expenses||{fuel:0,parts:0,other:j.expense||0}}
function moneyFiltered(){let f=$('mfFrom')?.value||'',t=$('mfTo')?.value||'';return J.filter(j=>(!f||j.date>=f)&&(!t||j.date<=t))}
function renderMoney(){let M=moneyFiltered(),i=M.reduce((s,j)=>s+Number(j.income||0),0),e=M.reduce((s,j)=>s+Number(j.expense||0),0);$('fi').textContent=eur(i);$('fe').textContent=eur(e);$('fn').textContent=eur(i-e);$('fj').textContent=M.length;
let cat={fuel:0,parts:0,other:0};M.forEach(j=>{let x=expOf(j);cat.fuel+=Number(x.fuel||0);cat.parts+=Number(x.parts||0);cat.other+=Number(x.other||0)});$('expCat').innerHTML=`<tr><td>Καύσιμα</td><td>${eur(cat.fuel)}</td></tr><tr><td>Ανταλλακτικά</td><td>${eur(cat.parts)}</td></tr><tr><td>Λοιπά</td><td>${eur(cat.other)}</td></tr>`;
let byMonth={};M.forEach(j=>{let m=(j.date||'').slice(0,7)||'—';byMonth[m]=byMonth[m]||{n:0,i:0,e:0};byMonth[m].n++;byMonth[m].i+=Number(j.income||0);byMonth[m].e+=Number(j.expense||0)});
let months=Object.keys(byMonth).sort().reverse();
$('moneyMonthly').innerHTML=months.length?months.map(m=>`<tr><td>${m}</td><td>${byMonth[m].n}</td><td>${eur(byMonth[m].i)}</td><td>${eur(byMonth[m].e)}</td><td>${eur(byMonth[m].i-byMonth[m].e)}</td></tr>`).join(''):'<tr><td colspan="5">Δεν υπάρχουν δεδομένα.</td></tr>';
let byClient={};M.forEach(j=>{let c=j.client||'—';byClient[c]=byClient[c]||{n:0,net:0};byClient[c].n++;byClient[c].net+=Number(j.income||0)-Number(j.expense||0)});
let clients=Object.keys(byClient).sort((a,b)=>byClient[b].net-byClient[a].net).slice(0,10);
$('moneyClients').innerHTML=clients.length?clients.map(c=>`<tr><td>${esc(c)}</td><td>${byClient[c].n}</td><td>${eur(byClient[c].net)}</td></tr>`).join(''):'<tr><td colspan="3">Δεν υπάρχουν δεδομένα.</td></tr>'}
function csvField(v){let s=String(v??'');return /[",\n\r]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s}
function exportCSV(){let rows=[['Κωδικός','Ημερομηνία','Έναρξη','Λήξη','Πελάτης','Τηλέφωνο','Διεύθυνση','Είδος εργασίας','Εξοπλισμός','Τεχνικοί','Όχημα','Κατάσταση','Έσοδα','Έξοδα Καύσιμα','Έξοδα Ανταλλακτικά','Έξοδα Λοιπά','Σύνολο Εξόδων','Σημειώσεις']];J.forEach(j=>{let x=expOf(j);rows.push([j.code,j.date,j.start,j.end,j.client,j.phone,j.address,j.type,j.equip,names(j.employeeIds),veh(j.vehicleId),j.status,j.income||0,x.fuel||0,x.parts||0,x.other||0,j.expense||0,(j.notes||'').replace(/\n/g,' ')])});let csv=rows.map(r=>r.map(csvField).join(',')).join('\r\n');let b=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'}),u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download='ROMVOS_Service_Jobs_'+today()+'.csv';a.click();URL.revokeObjectURL(u)}
function exportListPDF(){let empSel=$('jfEmp'),curEmp=empSel?empSel.value:'',q=($('search')?.value||'').toLowerCase(),st=$('jfStatus')?.value||'',emp=curEmp,from=$('jfFrom')?.value||'',to=$('jfTo')?.value||'',fq=$('jfQueue')?.value||'';let A=J.filter(j=>{if(q&&!([j.client,j.phone,j.address,j.type,j.task,j.code].join(' ').toLowerCase().includes(q)))return false;if(st&&!workStateMatches(j,st))return false;if(emp&&!(j.employeeIds||[]).includes(emp))return false;if(fq==='dated'&&!j.date)return false;if(fq==='queue'&&j.date)return false;if(from&&(!j.date||j.date<from))return false;if(to&&(!j.date||j.date>to))return false;return true});let cmp={code:(a,b)=>(a.code||'').localeCompare(b.code||''),date:(a,b)=>((a.date||'')+(a.start||'')).localeCompare((b.date||'')+(b.start||'')),client:(a,b)=>(a.client||'').localeCompare(b.client||''),status:(a,b)=>(a.status||'').localeCompare(b.status||'')};A.sort((a,b)=>(cmp[jobSort.key]?cmp[jobSort.key](a,b):0)*jobSort.dir);let i=A.reduce((s,j)=>s+Number(j.income||0),0),e=A.reduce((s,j)=>s+Number(j.expense||0),0);$('printArea').innerHTML=`<div class="sheet"><h2>Λίστα εργασιών ROMVOS Service</h2><div class="small">Εκτύπωση: ${new Date().toLocaleDateString('el-GR')} • ${A.length} εργασίες • Έσοδα ${eur(i)} • Έξοδα ${eur(e)} • Καθαρό ${eur(i-e)}</div><table><thead><tr><th>Κωδικός</th><th>Ημ/νία</th><th>Ώρα</th><th>Πελάτης</th><th>Τεχνικοί</th><th>Όχημα</th><th>Κατάσταση</th><th>Έσοδα</th><th>Έξοδα</th></tr></thead><tbody>${A.map(j=>`<tr><td>${esc(j.code||'')}</td><td>${j.date||'Ουρά'}</td><td>${j.date?j.start+'–'+j.end:'—'}</td><td>${esc(j.client||'—')}</td><td>${esc(names(j.employeeIds))}</td><td>${esc(veh(j.vehicleId))}</td><td>${esc(workState(j).label.replace(/^[^ ]+ /,''))}</td><td>${eur(j.income)}</td><td>${eur(j.expense)}</td></tr>`).join('')}</tbody></table></div>`;document.body.classList.add('printing');setTimeout(()=>window.print(),50)}

function parseDelimitedCSV(text,delimiter=';'){
 let rows=[],row=[],field='',quoted=false;
 text=String(text||'').replace(/^\uFEFF/,'');
 for(let i=0;i<text.length;i++){
  let ch=text[i];
  if(quoted){
   if(ch==='"'&&text[i+1]==='"'){field+='"';i++}
   else if(ch==='"')quoted=false;
   else field+=ch;
  }else{
   if(ch==='"')quoted=true;
   else if(ch===delimiter){row.push(field);field=''}
   else if(ch==='\n'){row.push(field);rows.push(row);row=[];field=''}
   else if(ch!=='\r')field+=ch;
  }
 }
 row.push(field);if(row.some(x=>String(x).trim()!==''))rows.push(row);
 return rows;
}
function normHeader(s){return String(s||'').replace(/^\uFEFF/,'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ')}
function pylonBool(v){let x=normHeader(v);return ['ναι','yes','true','1'].includes(x)}
function parsePylonDateTime(v){
 let x=String(v||'').trim();if(!x)return null;
 let m=x.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::\d{2})?\s*(πμ|μμ|π\.μ\.|μ\.μ\.)?)?/i);
 if(!m)return null;
 let day=+m[1],month=+m[2],year=+m[3],hour=+(m[4]||0),minute=+(m[5]||0),ap=normHeader(m[6]||'').replace(/\./g,'');
 if(ap==='μμ'&&hour<12)hour+=12;if(ap==='πμ'&&hour===12)hour=0;
 return {date:`${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`,time:`${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}`};
}
function addMinutes(t,n){let total=mins(t)+Math.max(0,Number(n)||0);total=Math.min(total,1439);return `${String(Math.floor(total/60)).padStart(2,'0')}:${String(total%60).padStart(2,'0')}`}
function mapPylonType(desc,sub){
 let x=normHeader((sub||'')+' '+(desc||''));
 if(x.includes('συντηρηση'))return 'Συντήρηση κλιματιστικού';
 if(x.includes('εγκατασταση'))return 'Εγκατάσταση κλιματιστικού';
 if(x.includes('καθαρισ'))return 'Καθαρισμός';
 if(x.includes('διαρρο'))return 'Έλεγχος διαρροής';
 if(x.includes('ψυκτικ'))return 'Πλήρωση ψυκτικού υγρού';
 if(x.includes('αντλια θερμοτητας'))return 'Αντλία θερμότητας';
 if(x.includes('αυτοψ')||x.includes('προσφορ'))return 'Αυτοψία / Προσφορά';
 if(x.includes('βλαβ')||x.includes('επισκευ'))return 'Επισκευή βλάβης';
 return 'Άλλη εργασία';
}
function pylonAddress(r,get){return [get(r,'Όνομα Διεύθυνσης'),[get(r,'Οδός'),get(r,'Αριθμός')].filter(Boolean).join(' '),get(r,'Πόλη'),get(r,'Τ.Κ.')].filter(Boolean).join(', ')}
async function importPylonCSV(){
 let file=$('pylonFile').files[0],result=$('pylonResult');
 if(!file){result.className='alert err show';result.textContent='Επίλεξε πρώτα το CSV του Pylon.';return}
 try{
  let text=await file.text(),rows=parseDelimitedCSV(text,';');
  if(rows.length<2)throw new Error('Το αρχείο δεν περιέχει εργασίες.');
  let headers=rows[0].map(normHeader),idx={};headers.forEach((h,i)=>idx[h]=i);
  let get=(r,name)=>String(r[idx[normHeader(name)]]??'').trim();
  if(idx[normHeader('Κωδικός')]===undefined||idx[normHeader('Ημερομηνία')]===undefined)throw new Error('Δεν αναγνωρίστηκαν οι στήλες «Κωδικός» και «Ημερομηνία».');
  let onlyActive=$('pylonOnlyActive').checked,skipClosed=$('pylonSkipClosed').checked,updateExisting=$('pylonUpdateExisting').checked,createClients=$('pylonCreateClients').checked;
  let added=0,updated=0,skipped=0,invalid=0,clientsAdded=0;
  for(let n=1;n<rows.length;n++){
   let r=rows[n],ref=get(r,'Κωδικός');if(!ref){invalid++;continue}
   if(onlyActive&&!pylonBool(get(r,'Ενεργό'))){skipped++;continue}
   if(skipClosed&&pylonBool(get(r,'Κλειστό'))){skipped++;continue}
   let dt=parsePylonDateTime(get(r,'Ημερομηνία'));if(!dt){invalid++;continue}
   let duration=Math.max(0,Number(String(get(r,'Διάρκεια')).replace(',','.'))||0),allDay=pylonBool(get(r,'Ολοήμερο'));
   let start=allDay?'':dt.time,end=allDay?'':addMinutes(dt.time,duration||60);
   let client=get(r,'Όνομα'),address=pylonAddress(r,get),desc=get(r,'Ενέργεια - Περιγραφή'),sub=get(r,'Υποκατηγορία');
   let existing=J.find(j=>String(j.pylonRef||'').trim()===ref||String(j.code||'').trim()===ref);
   if(existing){
    if(!updateExisting){skipped++;continue}
    Object.assign(existing,{date:dt.date,start,end,client:client||existing.client,address:address||existing.address,type:mapPylonType(desc,sub),task:desc||existing.task,pylonRef:ref,status:pylonBool(get(r,'Κλειστό'))?'Ολοκληρώθηκε':(existing.status||'Προγραμματισμένη')});
    existing.pylonResource=get(r,'Όνομα - Πόρος');existing.pylonSubmitted=get(r,'Ημ/νία Υποβολής');updated++;
   }else{
    J.push({id:uid('JOB'),code:nextCode(),date:dt.date,start,end,status:pylonBool(get(r,'Κλειστό'))?'Ολοκληρώθηκε':'Προγραμματισμένη',reminder:'',priority:'Κανονική',client,phone:'',email:'',pylonRef:ref,address,type:mapPylonType(desc,sub),equip:'',task:desc,employeeIds:[],vehicleId:'',income:0,expenses:{fuel:0,parts:0,other:0},expense:0,notes:'Εισαγωγή από Pylon'+(get(r,'Όνομα - Πόρος')?' • '+get(r,'Όνομα - Πόρος'):''),deadline:'',partsUsed:'',signature:'',photos:[],pylonResource:get(r,'Όνομα - Πόρος'),pylonSubmitted:get(r,'Ημ/νία Υποβολής')});added++;
   }
   if(createClients&&client&&!C.some(c=>clientKey(c.name)===clientKey(client))){C.push({id:uid('CLI'),name:client,phone:'',address,notes:'Εισαγωγή από Pylon'});clientsAdded++}
  }
  save();render();renderBoard();
  result.className='alert show goodmsg';result.innerHTML=`<b>Η εισαγωγή ολοκληρώθηκε.</b><br>✅ Νέες εργασίες: ${added}<br>🔄 Ενημερώθηκαν: ${updated}<br>⏭️ Παραλείφθηκαν: ${skipped}<br>⚠️ Μη έγκυρες γραμμές: ${invalid}<br>🧑‍💼 Νέοι πελάτες: ${clientsAdded}`;
 }catch(err){result.className='alert show badmsg';result.textContent='Σφάλμα εισαγωγής: '+(err.message||err)}
}

function printJob(id){let j=J.find(x=>x.id===id);if(!j)return;let x=expOf(j);$('printArea').innerHTML=`<div class="sheet"><h2>Δελτίο εργασίας ${esc(j.code||'')}</h2><div class="small">Εκτύπωση: ${new Date().toLocaleDateString('el-GR')}</div><table><tr><th>Πελάτης</th><td>${esc(j.client||'—')}</td><th>Τηλέφωνο</th><td>${esc(j.phone||'—')}</td></tr><tr><th>Διεύθυνση</th><td colspan="3">${esc(j.address||'—')}</td></tr><tr><th>Ημερομηνία</th><td>${j.date}</td><th>Ώρα</th><td>${j.start}–${j.end}</td></tr><tr><th>Είδος εργασίας</th><td>${esc(j.type||'—')}</td><th>Εξοπλισμός</th><td>${esc(j.equip||'—')}</td></tr><tr><th>Τεχνικοί</th><td colspan="3">${esc(names(j.employeeIds))}</td></tr><tr><th>Όχημα</th><td colspan="3">${esc(veh(j.vehicleId))}</td></tr><tr><th>Κατάσταση</th><td>${esc(j.status)}</td><th>Προτεραιότητα</th><td>${esc(j.priority||'—')}</td></tr><tr><th>Περιγραφή</th><td colspan="3">${esc(j.task||'—')}</td></tr><tr><th>Σημειώσεις</th><td colspan="3">${esc(j.notes||'—')}</td></tr><tr><th>Προθεσμία</th><td>${esc(j.deadline||'—')}</td><th>Υπογραφή</th><td>${esc(j.signature||'—')}</td></tr><tr><th>Ανταλλακτικά</th><td colspan="3">${esc(j.partsUsed||'—')}</td></tr><tr><th>Φωτογραφίες</th><td colspan="3">${esc((j.photos||[]).join(', ')||'—')}</td></tr><tr><th>Έσοδα</th><td>${eur(j.income)}</td><th>Σύνολο εξόδων</th><td>${eur(j.expense)}</td></tr><tr><th>Έξοδα ανάλυση</th><td colspan="3">Καύσιμα ${eur(x.fuel)} • Ανταλλακτικά ${eur(x.parts)} • Λοιπά ${eur(x.other)}</td></tr></table></div>`;document.body.classList.add('printing');setTimeout(()=>window.print(),50)}
window.onafterprint=()=>document.body.classList.remove('printing');
$('modal').addEventListener('click',e=>{if(e.target.id==='modal')closeJob()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if($('confirmModal').classList.contains('open'))confirmResolve(false);else if($('clientHistModal').classList.contains('open'))closeClientHist();else if($('modal').classList.contains('open'))closeJob()}});
function exportData(){let b=new Blob([JSON.stringify({app:'ROMVOS Service',version:'6.0',employees:E,vehicles:V,jobs:J,clients:C,board:B},null,2)],{type:'application/json'}),u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download='ROMVOS_Service_Backup_'+today()+'.json';a.click();URL.revokeObjectURL(u)}function importData(){let f=$('fileIn').files[0];if(!f)return alert('Επίλεξε αρχείο.');let r=new FileReader;r.onload=async()=>{try{let d=JSON.parse(r.result);if(!Array.isArray(d.employees)||!Array.isArray(d.vehicles)||!Array.isArray(d.jobs))throw 0;if(!(await askConfirm('Να αντικατασταθούν τα τρέχοντα δεδομένα;','Επαναφορά')))return;E=d.employees;V=d.vehicles;J=d.jobs;C=Array.isArray(d.clients)?d.clients:C;B=d.board&&typeof d.board==='object'?d.board:B;save();render();alert('Η επαναφορά ολοκληρώθηκε.')}catch(e){alert('Μη έγκυρο αρχείο backup.')}};r.readAsText(f)}
let boardStart=(function(){let d=new Date();let day=(d.getDay()+6)%7;d.setDate(d.getDate()-day);return d.toISOString().slice(0,10)})(),boardSelectedDate=today();
function addDays(ds,n){let d=new Date(ds+'T12:00:00');d.setDate(d.getDate()+n);return d.toISOString().slice(0,10)}
function boardToday(){let d=new Date(),day=(d.getDay()+6)%7;d.setDate(d.getDate()-day);boardStart=d.toISOString().slice(0,10);boardSelectedDate=today();renderBoard()}
function boardPrevWeek(){boardStart=addDays(boardStart,-7);boardSelectedDate=boardStart;renderBoard()}function boardNextWeek(){boardStart=addDays(boardStart,7);boardSelectedDate=boardStart;renderBoard()}

/* v34 — Πλήρης οθόνη προγραμματισμού: διατηρεί Υποψήφιες + Τεχνικούς + VAN + εβδομάδα, με 4 συνεργεία και ενεργό drag & drop. */
async function openBoardPlannerFullscreen(){
  document.body.classList.add('board-planning-fullscreen');
  renderBoard();
  try{
    if(!document.fullscreenElement&&document.documentElement.requestFullscreen){
      await document.documentElement.requestFullscreen();
    }
  }catch(e){/* CSS fullscreen fallback */}
}
async function closeBoardPlannerFullscreen(){
  document.body.classList.remove('board-planning-fullscreen');
  renderBoard();
  try{
    if(document.fullscreenElement&&document.exitFullscreen)await document.exitFullscreen();
  }catch(e){}
}
document.addEventListener('fullscreenchange',()=>{
  if(!document.fullscreenElement&&document.body.classList.contains('board-planning-fullscreen')){
    document.body.classList.remove('board-planning-fullscreen');
    renderBoard();
  }
});

let deadlineAudioCtx=null,deadlinePopupQueue=[];
function activeTabId(){let a=document.querySelector('.section.active');return a?a.id:''}
function activeDeadlineJobs(){
 let t=today();
 return J.filter(j=>j.deadline&&j.status!=='Ολοκληρώθηκε'&&j.status!=='Ακυρώθηκε'&&j.deadline<=t)
  .sort((a,b)=>a.deadline.localeCompare(b.deadline)||(a.client||'').localeCompare(b.client||''));
}
function deadlineKind(j){return j.deadline<today()?'overdue':'today'}
function deadlineDaysLate(j){
 let a=new Date(j.deadline+'T12:00:00'),b=new Date(today()+'T12:00:00');
 return Math.max(0,Math.round((b-a)/86400000));
}
function renderAlerts(){
 let A=activeDeadlineJobs(),tod=A.filter(j=>deadlineKind(j)==='today'),over=A.filter(j=>deadlineKind(j)==='overdue');
 let n=$('alertNavCount');if(n){n.textContent=A.length;n.style.display=A.length?'inline-flex':'none'}
 if($('dueTodayCount'))$('dueTodayCount').textContent=tod.length;
 if($('overdueCount'))$('overdueCount').textContent=over.length;
 if(!$('deadlineAlertsList'))return;
 $('deadlineAlertsList').innerHTML=A.length?A.map(j=>{
   let over=deadlineKind(j)==='overdue',late=deadlineDaysLate(j);
   return `<div class="deadline-row ${over?'is-overdue':'is-today'}"><div class="deadline-icon">${over?'⛔':'⏰'}</div><div class="deadline-info"><b>${esc(j.client||j.type||'Χωρίς πελάτη')}</b><span>${over?`Εκπρόθεσμη κατά ${late} ${late===1?'ημέρα':'ημέρες'}`:'Η προθεσμία λήγει σήμερα'} • ${esc(j.deadline)}</span>${j.task?`<small>${esc(j.task)}</small>`:''}</div><div class="actions"><button class="btn light" onclick="editJob('${j.id}')">Άνοιγμα</button><button class="btn good" onclick="markDone('${j.id}');renderAlerts()">✓ Ολοκλήρωση</button></div></div>`
 }).join(''):'<div class="program-empty">Δεν υπάρχουν εργασίες που λήγουν σήμερα ή είναι εκπρόθεσμες.</div>';
}
function playDeadlineSound(){
 try{
   deadlineAudioCtx=deadlineAudioCtx||new (window.AudioContext||window.webkitAudioContext)();
   if(deadlineAudioCtx.state==='suspended')deadlineAudioCtx.resume();
   let now=deadlineAudioCtx.currentTime;
   [0,0.22,0.44].forEach((delay,i)=>{
     let osc=deadlineAudioCtx.createOscillator(),gain=deadlineAudioCtx.createGain();
     osc.type='sine';osc.frequency.value=i===1?880:660;
     gain.gain.setValueAtTime(0.0001,now+delay);
     gain.gain.exponentialRampToValueAtTime(0.18,now+delay+0.02);
     gain.gain.exponentialRampToValueAtTime(0.0001,now+delay+0.17);
     osc.connect(gain);gain.connect(deadlineAudioCtx.destination);
     osc.start(now+delay);osc.stop(now+delay+0.18);
   });
 }catch(e){}
}
function testAlertSound(){playDeadlineSound()}
function deadlineAlertKey(j){return `${today()}|${j.id}|${j.deadline}|${deadlineKind(j)}`}
function checkDeadlineAlerts(forcePopup=false){
 renderAlerts();
 if(activeTabId()==='board')return;
 let A=activeDeadlineJobs();
 if(!A.length)return;
 let seen={};try{seen=JSON.parse(localStorage.getItem('romvos_deadline_alerts')||'{}')}catch(e){}
 let fresh=A.filter(j=>!seen[deadlineAlertKey(j)]);
 if(!fresh.length&&!forcePopup)return;
 let show=fresh.length?fresh:A;
 if(fresh.length){
   fresh.forEach(j=>seen[deadlineAlertKey(j)]=Date.now());
   try{localStorage.setItem('romvos_deadline_alerts',JSON.stringify(seen))}catch(e){}
   playDeadlineSound();
 }
 showDeadlinePopup(show);
}
function showDeadlinePopup(items){
 if(activeTabId()==='board'||!items.length)return;
 let over=items.filter(j=>deadlineKind(j)==='overdue').length,tod=items.length-over;
 $('deadlinePopupTitle').textContent=over?`🔔 ${over} εκπρόθεσμη${over===1?' εργασία':' εργασίες'}`:`🔔 ${tod} ${tod===1?'εργασία λήγει':'εργασίες λήγουν'} σήμερα`;
 $('deadlinePopupBody').innerHTML=items.slice(0,4).map(j=>`<button type="button" class="popup-job" onclick="closeDeadlinePopup();editJob('${j.id}')"><b>${esc(j.client||j.type||'Χωρίς πελάτη')}</b><span>${deadlineKind(j)==='overdue'?`Εκπρόθεσμη ${deadlineDaysLate(j)} ${deadlineDaysLate(j)===1?'ημέρα':'ημέρες'}`:'Λήγει σήμερα'} • ${esc(j.deadline)}</span></button>`).join('')+(items.length>4?`<div class="small" style="margin-top:7px">και ακόμη ${items.length-4} εργασίες…</div>`:'');
 $('deadlinePopup').classList.add('show');
}
function closeDeadlinePopup(){$('deadlinePopup').classList.remove('show')}
function openAlertsSection(){
 closeDeadlinePopup();
 let btn=document.querySelector('nav button[data-tab="alerts"]');
 if(btn)btn.click();
}

function boardKey(date,slot){return date+'#'+slot}function boardEntry(key){if(!B[key])B[key]={jobs:[],drafts:[],emps:[],vehs:[]};if(!B[key].drafts)B[key].drafts=[];return B[key]}
function dragStart(ev,kind,id,from=''){ev.dataTransfer.setData('text/plain',JSON.stringify({kind,id,from}))}
function allowDrop(ev){ev.preventDefault();ev.currentTarget.classList.add('dragover')}function leaveDrop(ev){ev.currentTarget.classList.remove('dragover')}
function dropBoard(ev,key){ev.preventDefault();ev.currentTarget.classList.remove('dragover');let d;try{d=JSON.parse(ev.dataTransfer.getData('text/plain'))}catch{return}moveBoardItem(d,key)}
function dropPool(ev){ev.preventDefault();ev.currentTarget.classList.remove('dragover');let d;try{d=JSON.parse(ev.dataTransfer.getData('text/plain'))}catch{return}moveBoardItem(d,'')}
function dropCandidatePool(ev){
 ev.preventDefault();ev.currentTarget.classList.remove('dragover');
 let d;try{d=JSON.parse(ev.dataTransfer.getData('text/plain'))}catch{return}
 if(d.kind!=='draft')return;
 returnDraftToCandidates(d.id,d.from||'');
}
function removeFromAll(kind,id){Object.values(B).forEach(x=>{let a=kind==='draft'?(x.drafts||[]):kind==='job'?x.jobs:kind==='emp'?x.emps:x.vehs;x[kind==='draft'?'drafts':kind==='job'?'jobs':kind==='emp'?'emps':'vehs']=a.filter(v=>v!==id)})}
function removeFromEntry(key,kind,id){if(!key||!B[key])return;let p=kind==='draft'?'drafts':kind==='job'?'jobs':kind==='emp'?'emps':'vehs';B[key][p]=(B[key][p]||[]).filter(v=>v!==id)}
function boardResourceConflict(kind,id,targetKey,sourceKey=''){
 if(!targetKey||(kind!=='emp'&&kind!=='veh'))return '';
 const targetDate=targetKey.split('#')[0];
 for(const [k,x] of Object.entries(B)){
   const p=k.split('#'),slot=parseInt(p[1],10);
   if(p[0]!==targetDate||slot>BOARD_CREW_COUNT||k===targetKey||k===sourceKey)continue;
   const arr=kind==='emp'?(x.emps||[]):(x.vehs||[]);
   if(arr.includes(id))return k;
 }
 return '';
}
function moveBoardItem(d,key){
 if(d.kind==='candidate'){
   if(!key)return;
   const c=CAND.find(x=>x.id===d.id);
   if(!c)return;
   const draft={id:uid('DRF'),title:c.title,richTitle:c.richTitle||'',clientId:c.clientId||'',client:c.client||'',type:c.type||'',createdAt:new Date().toISOString(),candidateOrigin:true,candidateDate:c.date||key.split('#')[0],candidatePriority:c.priority||'Κανονική'};
   D.push(draft);
   const target=boardEntry(key);
   if(!target.drafts.includes(draft.id))target.drafts.push(draft.id);
   CAND=CAND.filter(x=>x.id!==d.id);
   save();renderBoard();render();return;
 }
 if(key&&d.kind==='veh'){
   const stopped=V.find(x=>x.id===d.id);
   if(stopped&&stopped.outOfService){
     const vehicleText=[stopped.model,stopped.plate].filter(Boolean).join(' • ')||'VAN';
     return alert('Το VAN '+vehicleText+' είναι ΑΚΙΝΗΤΟ / ΕΚΤΟΣ ΛΕΙΤΟΥΡΓΙΑΣ και δεν μπορεί να ανατεθεί σε συνεργείο.\nΠρόβλημα: '+(stopped.problem||'Χωρίς περιγραφή προβλήματος'));
   }
 }
 if(key&&(d.kind==='emp'||d.kind==='veh')){
   const conflictKey=boardResourceConflict(d.kind,d.id,key,d.from||'');
   if(conflictKey){
     const slot=conflictKey.split('#')[1];
     const date=key.split('#')[0];
     const dateText=new Date(date+'T12:00:00').toLocaleDateString('el-GR');
     if(d.kind==='emp'){
       const e=E.find(x=>x.id===d.id);
       return alert('Ο τεχνικός '+(e?e.name:'')+' είναι ήδη στο Συνεργείο '+slot+' στις '+dateText+'. Δεν μπορεί να εμφανίζεται σε δύο συνεργεία την ίδια ημέρα.');
     }
     const v=V.find(x=>x.id===d.id);
     const vehicleText=v?([v.model,v.plate].filter(Boolean).join(' • ')||'VAN'):'VAN';
     return alert('Το VAN '+vehicleText+' είναι ήδη στο Συνεργείο '+slot+' στις '+dateText+'. Δεν μπορεί να εμφανίζεται σε δύο συνεργεία την ίδια ημέρα.');
   }
 }
 if(key&&d.kind==='emp'){let e=E.find(x=>x.id===d.id),date=key.split('#')[0],li=empLeaveInfo(e,date);if(li)return alert('Ο τεχνικός '+(e?e.name:'')+' έχει '+li.reason+' και δεν μπορεί να ανατεθεί εκείνη την ημέρα.')}
 if(d.kind==='job'||d.kind==='draft')removeFromAll(d.kind,d.id);
 else if(d.from)removeFromEntry(d.from,d.kind,d.id);
 if(key){
   let x=boardEntry(key),arr=d.kind==='draft'?x.drafts:d.kind==='job'?x.jobs:d.kind==='emp'?x.emps:x.vehs;
   if(!arr.includes(d.id))arr.push(d.id);
   if(d.kind==='job'){
     let j=J.find(x=>x.id===d.id);
     if(j){j.date=key.split('#')[0];if(!j.start)j.start='08:00';if(!j.end)j.end='09:00'}
   }
 }
 save();renderBoard();render()
}
function removeBoardItem(key,kind,id){removeFromEntry(key,kind,id);save();renderBoard()}

function richRedLike(v){
 v=String(v||'').toLowerCase().replace(/\s+/g,'');
 return v==='red'||v==='#dc2626'||v==='rgb(220,38,38)'||v==='rgb(220, 38, 38)';
}
function richWeightBold(v){
 v=String(v||'').trim().toLowerCase();
 if(v==='bold'||v==='bolder')return true;
 const n=parseInt(v,10);return Number.isFinite(n)&&n>=600;
}
function richTokensFromHTML(html){
 const root=document.createElement('div');root.innerHTML=String(html||'');
 const out=[];
 const pushBreak=()=>{if(out.length&&out[out.length-1].break)return;out.push({break:true})};
 const pushText=(text,style)=>{
   const raw=String(text||'').replace(/\r\n/g,'\n').replace(/\r/g,'\n');
   const parts=raw.split('\n');
   parts.forEach((part,i)=>{
     if(part)out.push({text:part,bold:!!style.bold,red:!!style.red});
     if(i<parts.length-1)pushBreak();
   });
 };
 function walk(n,style={bold:false,red:false}){
   if(n.nodeType===Node.TEXT_NODE){pushText(n.nodeValue||'',style);return;}
   if(n.nodeType!==Node.ELEMENT_NODE)return;
   const tag=n.tagName.toUpperCase();
   if(tag==='BR'){pushBreak();return;}
   const st={...style};
   if(tag==='B'||tag==='STRONG')st.bold=true;
   if(tag==='FONT'&&n.hasAttribute('color'))st.red=richRedLike(n.getAttribute('color'));
   const css=String(n.getAttribute('style')||'');
   const color=css.match(/(?:^|;)\s*color\s*:\s*([^;]+)/i);
   const weight=css.match(/(?:^|;)\s*font-weight\s*:\s*([^;]+)/i);
   const cls=String(n.getAttribute('class')||'').split(/\s+/);
   if(cls.includes('rt-red'))st.red=true;if(color)st.red=richRedLike(color[1]);
   if(weight&&richWeightBold(weight[1]))st.bold=true;
   const block=tag==='DIV'||tag==='P';
   if(block&&out.length&&!out[out.length-1].break)pushBreak();
   [...n.childNodes].forEach(ch=>walk(ch,st));
   if(block&&out.length&&!out[out.length-1].break)pushBreak();
 }
 [...root.childNodes].forEach(ch=>walk(ch,{bold:false,red:false}));
 while(out.length&&out[0].break)out.shift();
 while(out.length&&out[out.length-1].break)out.pop();
 return out;
}
function sanitizeRichHTML(html){
 const tokens=richTokensFromHTML(html),parts=[];
 tokens.forEach(t=>{
   if(t.break){parts.push('<br>');return;}
   let x=esc(t.text||'');
   if(t.red)x='<span class="rt-red">'+x+'</span>';
   if(t.bold)x='<strong>'+x+'</strong>';
   parts.push(x);
 });
 return parts.join('');
}
function richToPlain(html){
 const tokens=richTokensFromHTML(html);
 return tokens.map(t=>t.break?'\n':t.text||'').join('').replace(/\n{3,}/g,'\n\n').trim();
}
function plainToRich(s){return esc(String(s||'')).replace(/\r?\n/g,'<br>')}
function richBoardTitle(obj,fallback=''){
 const rich=sanitizeRichHTML(obj&&obj.richTitle||'');
 return rich||plainToRich(obj&&obj.title||fallback);
}
function setRichEditor(el,obj){
 if(!el)return;
 el.innerHTML=sanitizeRichHTML(obj&&obj.richTitle||'')||plainToRich(obj&&obj.title||'');
}
function placeCaretEnd(el){
 if(!el)return;el.focus();
 const r=document.createRange();r.selectNodeContents(el);r.collapse(false);
 const s=window.getSelection();s.removeAllRanges();s.addRange(r);
}
function formatRichText(id,cmd){
 const el=$(id);if(!el)return;
 el.focus();
 if(cmd==='bold')document.execCommand('bold',false,null);
 if(cmd==='red')document.execCommand('foreColor',false,'#dc2626');
  if(cmd==='black')document.execCommand('foreColor',false,'#111827');
}
function returnDraftToCandidates(id,from=''){
 const d=D.find(x=>x.id===id);if(!d)return;
 const fromDate=(from||'').split('#')[0]||'';
 const c={
   id:uid('CAN'),
   title:d.title||'',
   richTitle:d.richTitle||'',
   clientId:d.clientId||'',
   client:d.client||'',
   type:d.type||'',
   date:d.candidateDate||fromDate||nextWorkday(today()),
   priority:d.candidatePriority||'Κανονική',
   createdAt:new Date().toISOString(),
   returnedFromDraft:d.id
 };
 CAND.push(c);
 removeFromAll('draft',id);
 D=D.filter(x=>x.id!==id);
 save();renderBoard();render();
}
function returnDraftToCandidatesFromMenu(){
 const id=draftMenuTarget.id,from=draftMenuTarget.key;
 closeDraftMenu();
 if(id)returnDraftToCandidates(id,from);
}
function openBoardNewJob(date){
 openJob();
 setTimeout(()=>{if($('jDate')){$('jDate').value=date;refreshResources()}},0)
}
function deadlineState(j){if(!j.deadline||j.status==='Ολοκληρώθηκε'||j.status==='Ακυρώθηκε')return '';let d=Math.round((new Date(j.deadline+'T12:00:00')-new Date(today()+'T12:00:00'))/86400000);return d<0?'dead-over':d===0?'dead-today':d<=3?'dead-soon':''}
function jobTypeClass(j){let t=(j.type||'').toLowerCase();if(j.status==='Σε αναμονή')return 'type-wait';if(t.includes('συντήρ')||t.includes('καθαρισ'))return 'type-maint';if(t.includes('εγκατάστ'))return 'type-install';if(t.includes('βλάβ')||t.includes('επισκευ'))return 'type-fault';return ''}
function plannedWorkCardHtml(obj,icon,titleClass,fallback){
 const client=String(obj&&obj.client||'').trim(),type=String(obj&&obj.type||'').trim();
 if(!client&&!type)return `<div class="${titleClass} rich-board-title">${icon} ${richBoardTitle(obj,fallback)}</div>`;
 return `<div class="${titleClass}">${icon} ${esc(client||'Χωρίς πελάτη')}</div>${type?`<span class="candidate-work-type">${esc(type)}</span>`:''}<div class="candidate-work-description rich-board-title">${richBoardTitle(obj,'Χωρίς περιγραφή')}</div>`;
}
function plannedWorkDailyHtml(obj){
 const client=String(obj&&obj.client||'').trim(),type=String(obj&&obj.type||'').trim();
 if(!client&&!type)return `<div class="daily-task-title rich-board-title">${richBoardTitle(obj,'Πρόχειρη εργασία')}</div>`;
 return `<div class="daily-task-title">${esc(client||'Χωρίς πελάτη')}</div>${type?`<span class="candidate-work-type">${esc(type)}</span>`:''}<div class="daily-task-detail rich-board-title">${richBoardTitle(obj,'Χωρίς περιγραφή')}</div>`;
}
function card(kind,id,key=''){
 let obj=kind==='candidate'?CAND.find(x=>x.id===id):kind==='draft'?D.find(x=>x.id===id):kind==='job'?J.find(x=>x.id===id):kind==='emp'?E.find(x=>x.id===id):V.find(x=>x.id===id);if(!obj)return '';
 if(kind==='candidate'){
   const p=obj.priority||'Κανονική',pc=p==='Επείγουσα'?'urgent':p==='Υψηλή'?'high':'';
   const ds=candidateDateLabel(obj.date);
   return `<div class="board-card job candidate-card" draggable="true" title="Σύρε σε ημέρα και συνεργείο" ondblclick="event.stopPropagation();editCandidateJob('${id}')" ondragstart="dragStart(event,'candidate','${id}','')"><button class="x" onclick="event.stopPropagation();deleteCandidateJob('${id}')" title="Διαγραφή">×</button><button class="candidate-edit-btn" onclick="event.stopPropagation();editCandidateJob('${id}')" title="Επεξεργασία">✎</button>${plannedWorkCardHtml(obj,'🟪','candidate-title','Υποψήφια εργασία')}<div class="candidate-meta"><span>📅 ${esc(ds)}</span>${p!=='Κανονική'?`<span class="candidate-priority ${pc}">${esc(p)}</span>`:''}</div></div>`;
 }
 if(kind==='draft')return `<div class="board-card job draft-card" draggable="true" title="${key?'Σύρε στις Υποψήφιες για να την ξαναβγάλεις από το συνεργείο':'Σύρε στο σωστό πλαίσιο συνεργείου'}" ondblclick="event.stopPropagation();editDraftJob('${id}')" oncontextmenu="openDraftMenu(event,'${id}','${key}')" ondragstart="dragStart(event,'draft','${id}','${key}')"><button class="x" onclick="event.stopPropagation();deleteDraftJob('${id}')">×</button>${plannedWorkCardHtml(obj,'🟨','job-title','Πρόχειρη εργασία')}</div>`;
 if(kind==='job'){let title=obj.client||obj.code||'Χωρίς επωνυμία';return `<div class="board-card job ${deadlineState(obj)} ${jobTypeClass(obj)}" draggable="true" onclick="event.stopPropagation();editJob('${id}')" ondragstart="dragStart(event,'job','${id}','${key}')"><button class="x" onclick="event.stopPropagation();${key?`removeBoardItem('${key}','job','${id}')`:`void 0`}">${key?'×':''}</button><b class="job-title">${esc(title)}</b>${jobDetailsHtml(obj,'job-card-detail')}</div>`}
 if(kind==='veh'){let title=[obj.model,obj.plate].filter(Boolean).join(' • ')||'Χωρίς στοιχεία οχήματος';if(obj.outOfService){let problem=String(obj.problem||'Χωρίς περιγραφή προβλήματος').trim();return `<div class="board-card veh vehicle-out-card" draggable="false" onclick="event.stopPropagation()" title="ΑΚΙΝΗΤΟ — ${esc(problem)}"><b>🔴 ${esc(title)} — ΑΚΙΝΗΤΟ</b><div class="vehicle-problem-card">⚠️ ${esc(problem)}</div></div>`}return `<div class="board-card veh" draggable="true" onclick="event.stopPropagation()" ondragstart="dragStart(event,'veh','${id}','${key}')"><b>${esc(title)}</b></div>`}let title=obj.name;return `<div class="board-card ${kind}" draggable="true" onclick="event.stopPropagation()" ondragstart="dragStart(event,'${kind}','${id}','${key}')"><b>${esc(title)}</b></div>`
}


function nextWorkday(base=today()){
  const d=new Date((base||today())+'T12:00:00');
  do{d.setDate(d.getDate()+1)}while(d.getDay()===0||d.getDay()===6);
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}
function candidateDateLabel(ds){
  if(!ds)return 'Χωρίς ημέρα';
  const d=new Date(ds+'T12:00:00');
  const n=nextWorkday(today());
  if(ds===n)return 'Επόμενη εργάσιμη • '+d.toLocaleDateString('el-GR',{day:'2-digit',month:'2-digit'});
  if(ds===today())return 'Σήμερα • '+d.toLocaleDateString('el-GR',{day:'2-digit',month:'2-digit'});
  return d.toLocaleDateString('el-GR',{weekday:'short',day:'2-digit',month:'2-digit'});
}
let candidateEditorTargetKind='candidate';
let candidateContactPickerResults=[];
function addCandidateJob(){openCandidateEditor('','candidate')}
function editCandidateJob(id){openCandidateEditor(id,'candidate')}
function candidateContactInactive(c){return c?.active===false||c?.active===0||String(c?.active??'').trim().toLowerCase()==='false'}
function candidateContactChain(c){const s=String((c?.category||'')+' '+(c?.name||'')).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();if(s.includes('lidl'))return'lidl';if(s.includes('μασουτ')||s.includes('masout'))return'masoutis';if(s.includes('electra')||s.includes('ηλεκτρα'))return'electra';return'other'}
function candidateContactChainLabel(c){return({lidl:'Lidl',masoutis:'Μασούτης',electra:'Electra',other:String(c?.category||'Λοιπή επαφή').trim()||'Λοιπή επαφή'})[candidateContactChain(c)]}
function candidateContacts(){
 const seen=new Set(),rank={lidl:0,masoutis:1,electra:2,other:3};
 return (Array.isArray(C)?C:[]).filter(c=>c&&c.id&&String(c.name||'').trim()&&!candidateContactInactive(c)).filter(c=>{const key=String(c.id);if(seen.has(key))return false;seen.add(key);return true}).sort((a,b)=>(rank[candidateContactChain(a)]??3)-(rank[candidateContactChain(b)]??3)||String(a.regionCode||'').localeCompare(String(b.regionCode||''),undefined,{numeric:true})||String(a.name).localeCompare(String(b.name),'el'));
}
function candidateContactById(id){return candidateContacts().find(c=>String(c.id)===String(id||''))||null}
function candidateContactForEntry(entry){const contacts=candidateContacts();return contacts.find(c=>String(c.id)===String(entry?.clientId??''))||contacts.find(c=>clientKey(c.name)===clientKey(entry?.client))||null}
function candidateContactMeta(c){return[candidateContactChainLabel(c),c?.storeNo,c?.city,c?.regionCode&&('WH '+c.regionCode)].filter(Boolean).join(' • ')}
function candidateContactSearchText(c){return[c?.name,c?.category,c?.storeNo,c?.city,c?.address,c?.phone,c?.region,c?.regionCode,c?.facilityManager,c?.facilityAssistant,c?.maintenanceOwner].filter(Boolean).join(' ').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()}
function setCandidateEditorContact(contact){
 const input=$('candidateEditorClient'),button=$('candidateEditorClientButton'),label=$('candidateEditorClientLabel'),meta=$('candidateEditorClientMeta');
 if(input)input.value=contact?.id||'';
 if(label)label.textContent=contact?.name||'— Επιλογή από τις Επαφές εφαρμογής —';
 if(meta)meta.textContent=contact?candidateContactMeta(contact):'Lidl, Μασούτης, Electra και λοιπές επαφές';
 if(button)button.classList.toggle('selected',!!contact);
}
function openCandidateContactPicker(){
 const modal=$('candidateContactPickerModal'),search=$('candidateContactSearch');if(!modal)return;
 if(search)search.value='';renderCandidateContactPicker();modal.classList.add('open');setTimeout(()=>search?.focus(),30);
}
function closeCandidateContactPicker(){const modal=$('candidateContactPickerModal');if(modal)modal.classList.remove('open')}
function renderCandidateContactPicker(){
 const list=$('candidateContactPickerList');if(!list)return;
 const q=String($('candidateContactSearch')?.value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
 candidateContactPickerResults=candidateContacts().filter(c=>!q||candidateContactSearchText(c).includes(q));
 list.innerHTML=candidateContactPickerResults.length?candidateContactPickerResults.map((c,i)=>`<button class="candidate-contact-option" type="button" onclick="selectCandidateContactAt(${i})"><b>${esc(c.name)}</b><span>${esc(candidateContactMeta(c)||'Επαφή εφαρμογής')}</span></button>`).join(''):'<div class="candidate-contact-picker-empty">Δεν βρέθηκε ενεργή επαφή με αυτά τα στοιχεία.</div>';
}
function selectCandidateContactAt(index){const contact=candidateContactPickerResults[index];if(!contact)return;setCandidateEditorContact(contact);closeCandidateContactPicker();$('candidateEditorClientButton')?.focus()}
function openCandidateEditor(id='',targetKind='candidate'){
  const modal=$('candidateEditorModal'),text=$('candidateEditorText'),hidden=$('candidateEditorId'),client=$('candidateEditorClient'),type=$('candidateEditorType'),date=$('candidateEditorDate'),priority=$('candidateEditorPriority'),title=$('candidateEditorTitle'),subtitle=$('candidateEditorSubtitle'),hint=$('candidateEditorHint');
  if(!modal||!text||!hidden||!client||!type||!date||!priority)return;
  candidateEditorTargetKind=targetKind==='draft'?'draft':'candidate';
  const c=id?(candidateEditorTargetKind==='draft'?D.find(x=>x.id===id):CAND.find(x=>x.id===id)):null;
  const selectedContact=c?candidateContactForEntry(c):null;
  hidden.value=c?c.id:'';
  setCandidateEditorContact(selectedContact);
  type.value=c?(c.type||'Βλάβη'):'Βλάβη';
  setRichEditor(text,c||{title:''});
  date.value=c?((candidateEditorTargetKind==='draft'?c.candidateDate:c.date)||nextWorkday(today())):nextWorkday(today());
  priority.value=c?((candidateEditorTargetKind==='draft'?c.candidatePriority:c.priority)||'Κανονική'):'Κανονική';
  if(title)title.textContent=candidateEditorTargetKind==='draft'?'Επεξεργασία εργασίας συνεργείου':c?'Επεξεργασία εργασίας':'Νέα εργασία';
  if(subtitle)subtitle.textContent=candidateEditorTargetKind==='draft'?'Άλλαξε τα στοιχεία της εργασίας που βρίσκεται ήδη στο πρόγραμμα.':'Καταχώρισέ την τώρα· το συνεργείο θα το αποφασίσεις αργότερα.';
  if(hint)hint.textContent=candidateEditorTargetKind==='draft'?'📌 Η ημέρα και το συνεργείο αλλάζουν μετακινώντας την κάρτα στον πίνακα.':'📌 Στο τέλος της ημέρας σύρε την κάρτα στο συνεργείο και στην ημέρα που αποφάσισες. Τότε γίνεται κανονική πρόχειρη εργασία του προγράμματος.';
  modal.classList.add('open');
  setTimeout(()=>{if(c)placeCaretEnd(text);else $('candidateEditorClientButton')?.focus()},40);
}
function closeCandidateEditor(){
  const modal=$('candidateEditorModal');
  if(modal)modal.classList.remove('open');
  closeCandidateContactPicker();
  candidateEditorTargetKind='candidate';
}
function saveCandidateEditor(){
  const text=$('candidateEditorText'),hidden=$('candidateEditorId'),client=$('candidateEditorClient'),type=$('candidateEditorType'),date=$('candidateEditorDate'),priority=$('candidateEditorPriority');
  if(!text||!hidden||!client||!type||!date||!priority)return;
  const contact=candidateContactById(client.value);
  if(!contact){alert('Επίλεξε πελάτη από τις Επαφές της εφαρμογής.');openCandidateContactPicker();return;}
  const workType=type.value;
  if(!['Βλάβη','Συντήρηση','Εγκατάσταση','Άλλο'].includes(workType)){alert('Επίλεξε είδος εργασίας.');type.focus();return;}
  const rich=sanitizeRichHTML(text.innerHTML||'');
  const value=richToPlain(rich);
  if(!value){alert('Γράψε την περιγραφή της εργασίας πριν την αποθήκευση.');text.focus();return;}
  const id=hidden.value;
  if(id){
    const c=candidateEditorTargetKind==='draft'?D.find(x=>x.id===id):CAND.find(x=>x.id===id);
    if(!c)return closeCandidateEditor();
    c.title=value;c.richTitle=rich;c.clientId=contact.id;c.client=contact.name;c.type=workType;c.updatedAt=new Date().toISOString();
    if(candidateEditorTargetKind==='draft'){c.candidateDate=date.value||nextWorkday(today());c.candidatePriority=priority.value||'Κανονική'}
    else{c.date=date.value||nextWorkday(today());c.priority=priority.value||'Κανονική'}
  }else{
    CAND.push({id:uid('CAN'),title:value,richTitle:rich,clientId:contact.id,client:contact.name,type:workType,date:date.value||nextWorkday(today()),priority:priority.value||'Κανονική',createdAt:new Date().toISOString()});
  }
  save();renderBoard();closeCandidateEditor();
}
async function deleteCandidateJob(id){
  const c=CAND.find(x=>x.id===id);if(!c)return;
  if(!(await askConfirm('Να διαγραφεί η υποψήφια εργασία «'+(c.title||'')+'»;')))return;
  CAND=CAND.filter(x=>x.id!==id);save();renderBoard();
}

let draftEditorTargetKey='';
function addDraftJob(key=''){openDraftEditor('',key)}
function editDraftJob(id){const d=D.find(x=>x.id===id);if(d&&(d.candidateOrigin||d.clientId||d.client||d.type))return openCandidateEditor(id,'draft');openDraftEditor(id,'')}
function openDraftEditor(id='',targetKey=''){
  const modal=$('draftEditorModal'),text=$('draftEditorText'),hidden=$('draftEditorId'),title=$('draftEditorTitle');
  if(!modal||!text||!hidden)return;
  const d=id?D.find(x=>x.id===id):null;
  draftEditorTargetKey=id?'':targetKey;
  hidden.value=d?d.id:'';
  setRichEditor(text,d||{title:''});
  if(title)title.textContent=d?'Επεξεργασία πρόχειρης εργασίας':'Γράψε την πρόχειρη εργασία';
  modal.classList.add('open');
  setTimeout(()=>placeCaretEnd(text),40);
}
function closeDraftEditor(){
  const modal=$('draftEditorModal');
  if(modal)modal.classList.remove('open');
  draftEditorTargetKey='';
}
function saveDraftEditor(){
  const text=$('draftEditorText'),hidden=$('draftEditorId');
  if(!text||!hidden)return;
  const rich=sanitizeRichHTML(text.innerHTML||'');
  const value=richToPlain(rich);
  if(!value){alert('Γράψε την πρόχειρη εργασία πριν την αποθήκευση.');text.focus();return;}
  const id=hidden.value;
  if(id){
    const d=D.find(x=>x.id===id);
    if(!d)return closeDraftEditor();
    d.title=value;d.richTitle=rich;
  }else{
    const draft={id:uid('DRF'),title:value,richTitle:rich,createdAt:new Date().toISOString()};
    D.push(draft);
    if(draftEditorTargetKey){
      const target=boardEntry(draftEditorTargetKey);
      if(!target.drafts.includes(draft.id))target.drafts.push(draft.id);
    }
  }
  save();renderBoard();closeDraftEditor();
}
async function deleteDraftJob(id){let d=D.find(x=>x.id===id);if(!d)return;if(!(await askConfirm('Να διαγραφεί η πρόχειρη εργασία «'+(d.title||'')+'»;')))return;D=D.filter(x=>x.id!==id);removeFromAll('draft',id);save();renderBoard()}

let draftMenuTarget={id:'',key:''};

function openDraftMenu(ev,id,key=''){
  ev.preventDefault();
  ev.stopPropagation();
  draftMenuTarget={id,key};
  const m=$('draftContextMenu');
  if(!m)return;
  m.style.left=Math.min(ev.clientX,window.innerWidth-240)+'px';
  m.style.top=Math.min(ev.clientY,window.innerHeight-120)+'px';
  m.classList.add('show');
}

function closeDraftMenu(){
  const m=$('draftContextMenu');
  if(m)m.classList.remove('show');
}

function editDraftFromMenu(){
  const id=draftMenuTarget.id;
  closeDraftMenu();
  if(id)editDraftJob(id);
}

function openDraftCopyDays(){
  closeDraftMenu();
  const d=D.find(x=>x.id===draftMenuTarget.id);
  if(!d)return;
  if(!draftMenuTarget.key){
    alert('Η πρόχειρη εργασία πρέπει πρώτα να τοποθετηθεί σε συνεργείο.');
    return;
  }
  const sourceDate=draftMenuTarget.key.split('#')[0];
  const slot=draftMenuTarget.key.split('#')[1];
  const base=new Date(sourceDate+'T12:00:00');
  const year=base.getFullYear(),month=base.getMonth();
  const lastDay=new Date(year,month+1,0).getDate();
  const names=['Κυριακή','Δευτέρα','Τρίτη','Τετάρτη','Πέμπτη','Παρασκευή','Σάββατο'];
  const dates=[];
  for(let day=1;day<=lastDay;day++){
    const dt=new Date(year,month,day,12,0,0);
    const ds=dt.getFullYear()+'-'+String(dt.getMonth()+1).padStart(2,'0')+'-'+String(dt.getDate()).padStart(2,'0');
    dates.push({date:ds,name:names[dt.getDay()],weekend:dt.getDay()===0||dt.getDay()===6});
  }

  $('draftCopyTitle').textContent='«'+(d.title||'Πρόχειρη εργασία')+'» • Συνεργείο '+slot+' • '+base.toLocaleDateString('el-GR',{month:'long',year:'numeric'});
  $('draftCopyDaysList').innerHTML=dates.map(item=>{
    const disabled=item.date===sourceDate;
    return `<label class="copy-day-option" style="${disabled?'opacity:.5':item.weekend?'background:#f8fafc':''}">
      <input type="checkbox" class="draft-copy-day" value="${item.date}" ${disabled?'disabled':''}>
      <span><b>${item.name}</b><br><span class="small">${new Date(item.date+'T12:00:00').toLocaleDateString('el-GR')}${disabled?' — αρχική ημέρα':''}</span></span>
    </label>`;
  }).join('');
  $('draftCopyModal').classList.add('open');
}

function closeDraftCopyModal(){
  $('draftCopyModal').classList.remove('open');
}

function confirmDraftCopyDays(){
  const source=D.find(x=>x.id===draftMenuTarget.id);
  if(!source)return closeDraftCopyModal();
  const slot=(draftMenuTarget.key||'').split('#')[1];
  if(!slot)return closeDraftCopyModal();

  const dates=[...document.querySelectorAll('.draft-copy-day:checked')].map(x=>x.value);
  if(!dates.length){
    alert('Επίλεξε τουλάχιστον μία ημέρα.');
    return;
  }

  dates.forEach(date=>{
    const copy={
      ...source,
      id:uid('DRF'),
      createdAt:new Date().toISOString(),
      copiedFrom:source.id
    };
    D.push(copy);
    const target=boardEntry(boardKey(date,slot));
    target.drafts.push(copy.id);
  });

  save();
  closeDraftCopyModal();
  renderBoard();
}

document.addEventListener('keydown',ev=>{
  const modal=$('draftEditorModal');
  if(!modal||!modal.classList.contains('open'))return;
  if(ev.key==='Escape'){ev.preventDefault();closeDraftEditor();return;}
  if((ev.ctrlKey||ev.metaKey)&&ev.key==='Enter'){ev.preventDefault();saveDraftEditor();}
});
document.addEventListener('keydown',ev=>{
  const modal=$('candidateEditorModal');
  if(!modal||!modal.classList.contains('open'))return;
  const picker=$('candidateContactPickerModal');
  if(picker?.classList.contains('open')){
    if(ev.key==='Escape'){ev.preventDefault();ev.stopImmediatePropagation();closeCandidateContactPicker();}
    else if((ev.ctrlKey||ev.metaKey)&&ev.key==='Enter'){ev.preventDefault();ev.stopImmediatePropagation();}
    return;
  }
  if(ev.key==='Escape'){ev.preventDefault();closeCandidateEditor();return;}
  if((ev.ctrlKey||ev.metaKey)&&ev.key==='Enter'){ev.preventDefault();saveCandidateEditor();}
});
document.addEventListener('click',ev=>{
  const m=$('draftContextMenu');
  if(m&&!m.contains(ev.target))closeDraftMenu();
});
document.addEventListener('keydown',ev=>{
  if(ev.key==='Escape'){if($('orderViewModal'))closeOrderView();if($('returnViewModal'))closeReturnView();
    closeDraftMenu();
    closeDraftCopyModal();
    closeCandidateEditor();
  }
});



function boardCellHeightKey(key){return 'romvos_cell_height_'+key}
function applySavedCellHeight(el,key){
  let h=localStorage.getItem(boardCellHeightKey(key));
  if(h){el.style.height=h+'px';el.classList.add('resized')}
}
function saveBoardCellHeight(el,key){
  let h=Math.round(el.getBoundingClientRect().height);
  localStorage.setItem(boardCellHeightKey(key),String(h));
  el.classList.add('resized')
}

function selectBoardDate(ds){boardSelectedDate=ds;renderBoard()}
function renderAvailability(dates){
 if(!dates.includes(boardSelectedDate))boardSelectedDate=dates[0];
 let assignedEmp=new Set(),assignedVeh=new Set(),jobCount=0;
 Object.entries(B).forEach(([key,x])=>{
   const parts=key.split('#');
   if(parts[0]!==boardSelectedDate||parseInt(parts[1],10)>BOARD_CREW_COUNT)return;
   (x.emps||[]).forEach(id=>assignedEmp.add(id));
   (x.vehs||[]).forEach(id=>assignedVeh.add(id));
   jobCount+=(x.drafts||[]).length+(x.jobs||[]).length;
 });
 let leaveE=E.filter(e=>e.active!==false&&empOnLeave(e,boardSelectedDate));
 let freeE=E.filter(e=>e.active!==false&&!empOnLeave(e,boardSelectedDate)&&!assignedEmp.has(e.id));
 let activeV=V.filter(v=>v.active!==false),outV=activeV.filter(v=>v.outOfService),freeV=activeV.filter(v=>!v.outOfService&&!assignedVeh.has(v.id));
 let d=new Date(boardSelectedDate+'T12:00:00');
 $('avDay').textContent=d.toLocaleDateString('el-GR',{weekday:'long',day:'2-digit',month:'2-digit'});
 $('avEmpCount').textContent=freeE.length;$('avLeaveCount').textContent=leaveE.length;
 $('avVehCount').textContent=freeV.length;
 $('avJobCount').textContent=jobCount;
 $('avEmpList').innerHTML=freeE.length?freeE.map(e=>`<span class="av-chip">${esc(e.name)}</span>`).join(''):'<span class="av-chip none">Κανένας διαθέσιμος</span>';$('avLeaveList').innerHTML=leaveE.length?leaveE.map(e=>`<span class="av-chip leave">${esc(e.name)} — ${esc(e.leaveReason||'Άδεια')}</span>`).join(''):'<span class="av-chip none">Κανείς</span>';
 let healthyHtml=freeV.map(v=>`<span class="av-chip">${esc([v.model,v.plate].filter(Boolean).join(' • ')||'Χωρίς στοιχεία')}</span>`).join('');
 let outHtml=outV.map(v=>`<span class="av-chip vehicle-out-av" title="${esc(v.problem||'Χωρίς περιγραφή προβλήματος')}">🔴 ${esc([v.model,v.plate].filter(Boolean).join(' • ')||'VAN')} — ΑΚΙΝΗΤΟ: ${esc(v.problem||'Χωρίς περιγραφή προβλήματος')}</span>`).join('');
 $('avVehList').innerHTML=(healthyHtml+outHtml)||'<span class="av-chip none">Κανένα διαθέσιμο</span>';renderDeadlineStrip();
}
function renderDeadlineStrip(){if(!$('deadlineStrip'))return;let active=J.filter(j=>j.deadline&&j.status!=='Ολοκληρώθηκε'&&j.status!=='Ακυρώθηκε'),diff=j=>Math.round((new Date(j.deadline+'T12:00:00')-new Date(today()+'T12:00:00'))/86400000),over=active.filter(j=>diff(j)<0),due=active.filter(j=>diff(j)===0),tomorrow=active.filter(j=>diff(j)===1);$('deadlineStrip').innerHTML=`<span class="deadline-alert over" onclick="showDeadlineJobs('over')">🔴 Ληξιπρόθεσμες: ${over.length}</span><span class="deadline-alert today" onclick="showDeadlineJobs('today')">🟠 Λήγουν σήμερα: ${due.length}</span><span class="deadline-alert soon" onclick="showDeadlineJobs('tomorrow')">🟡 Λήγουν αύριο: ${tomorrow.length}</span>`}
function showDeadlineJobs(mode){let diff=j=>Math.round((new Date(j.deadline+'T12:00:00')-new Date(today()+'T12:00:00'))/86400000),a=J.filter(j=>j.deadline&&j.status!=='Ολοκληρώθηκε'&&j.status!=='Ακυρώθηκε'&&(mode==='over'?diff(j)<0:mode==='today'?diff(j)===0:diff(j)===1));if(!a.length)return alert('Δεν υπάρχουν εργασίες σε αυτή την κατηγορία.');alert(a.map(j=>(j.client||j.type||j.code)+' — '+j.deadline).join('\n'))}



function closeDailyBoardView(){
 const modal=$('dailyBoardViewModal');
 if(modal)modal.classList.remove('open');
}
function openDailyBoardView(){
 const modal=$('dailyBoardViewModal'),body=$('dailyBoardViewBody'),dateEl=$('dailyBoardViewDate'),titleEl=$('dailyBoardViewTitle');
 if(!modal||!body)return;
 if(titleEl)titleEl.textContent='👁 Εργασίες ημέρας';
 const date=boardSelectedDate||boardStart||today();
 const dt=new Date(date+'T12:00:00');
 if(dateEl)dateEl.textContent=dt.toLocaleDateString('el-GR',{weekday:'long',day:'2-digit',month:'2-digit',year:'numeric'});
 let total=0,html='';
 for(let slot=1;slot<=BOARD_CREW_COUNT;slot++){
   const entry=B[boardKey(date,slot)]||{};
   const drafts=(entry.drafts||[]).map(id=>D.find(x=>x.id===id)).filter(Boolean);
   const jobs=(entry.jobs||[]).map(id=>J.find(x=>x.id===id)).filter(Boolean);
   if(!drafts.length&&!jobs.length)continue;
   const empNames=(entry.emps||[]).map(id=>E.find(x=>x.id===id)).filter(Boolean).map(x=>x.name);
   const vehicles=(entry.vehs||[]).map(id=>V.find(x=>x.id===id)).filter(Boolean).map(x=>[x.model,x.plate].filter(Boolean).join(' • '));
   const resourceHtml=(empNames.length?empNames.map(n=>`<span class="daily-resource">👷 ${esc(n)}</span>`).join(''):'<span class="daily-resource">👷 Χωρίς τεχνικό</span>')+
     (vehicles.length?vehicles.map(n=>`<span class="daily-resource veh">🚐 ${esc(n)}</span>`).join(''):'<span class="daily-resource veh">🚐 Χωρίς VAN</span>');
   let taskNo=0,tasks='';
   drafts.forEach(d=>{
     total++;taskNo++;
     tasks+=`<div class="daily-task" onclick="closeDailyBoardView();editDraftJob('${d.id}')"><div class="daily-task-num">${taskNo}</div><div>${plannedWorkDailyHtml(d)}</div><span class="daily-task-kind">ΠΡΟΧΕΙΡΗ</span></div>`;
   });
   jobs.forEach(j=>{
     total++;taskNo++;
     const title=j.client||j.code||j.type||'Εργασία';
     const detail=[j.task,j.notes&&'Σημειώσεις: '+j.notes,j.address].filter(Boolean).join('\n');
     tasks+=`<div class="daily-task" onclick="closeDailyBoardView();editJob('${j.id}')"><div class="daily-task-num">${taskNo}</div><div><div class="daily-task-title">${esc(title)}</div>${detail?`<div class="daily-task-detail">${esc(detail)}</div>`:''}</div><span class="daily-task-kind crm">ΕΡΓΑΣΙΑ</span></div>`;
   });
   html+=`<section class="daily-crew"><div class="daily-crew-head"><b>Συνεργείο ${slot}</b>${resourceHtml}</div>${tasks}</section>`;
 }
 body.innerHTML=html||'<div class="daily-empty">Δεν υπάρχουν εργασίες στην επιλεγμένη ημέρα.</div>';
 if(dateEl)dateEl.textContent+=' • '+total+' '+(total===1?'εργασία':'εργασίες');
 modal.classList.add('open');
}

function selectedBoardCrewSlot(){
 const n=parseInt($('boardCrewSelect')?.value||'1',10);
 return Math.min(BOARD_CREW_COUNT,Math.max(1,Number.isFinite(n)?n:1));
}
function openCrewBoardView(){
 const slot=selectedBoardCrewSlot();
 const modal=$('dailyBoardViewModal'),body=$('dailyBoardViewBody'),dateEl=$('dailyBoardViewDate'),titleEl=$('dailyBoardViewTitle');
 if(!modal||!body)return;
 const date=boardSelectedDate||boardStart||today(),entry=B[boardKey(date,slot)]||{};
 const dt=new Date(date+'T12:00:00');
 const drafts=(entry.drafts||[]).map(id=>D.find(x=>x.id===id)).filter(Boolean);
 const jobs=(entry.jobs||[]).map(id=>J.find(x=>x.id===id)).filter(Boolean);
 const empNames=(entry.emps||[]).map(id=>E.find(x=>x.id===id)).filter(Boolean).map(x=>x.name);
 const vehicles=(entry.vehs||[]).map(id=>V.find(x=>x.id===id)).filter(Boolean).map(x=>[x.model,x.plate].filter(Boolean).join(' • '));
 const resourceHtml=(empNames.length?empNames.map(n=>`<span class="daily-resource">👷 ${esc(n)}</span>`).join(''):'<span class="daily-resource">👷 Χωρίς τεχνικό</span>')+
   (vehicles.length?vehicles.map(n=>`<span class="daily-resource veh">🚐 ${esc(n)}</span>`).join(''):'<span class="daily-resource veh">🚐 Χωρίς VAN</span>');
 let no=0,tasks='';
 drafts.forEach(d=>{no++;tasks+=`<div class="daily-task" onclick="closeDailyBoardView();editDraftJob('${d.id}')"><div class="daily-task-num">${no}</div><div>${plannedWorkDailyHtml(d)}</div><span class="daily-task-kind">ΠΡΟΧΕΙΡΗ</span></div>`});
 jobs.forEach(j=>{no++;const title=j.client||j.code||j.type||'Εργασία',detail=[j.task,j.notes&&'Σημειώσεις: '+j.notes,j.address].filter(Boolean).join('\n');tasks+=`<div class="daily-task" onclick="closeDailyBoardView();editJob('${j.id}')"><div class="daily-task-num">${no}</div><div><div class="daily-task-title">${esc(title)}</div>${detail?`<div class="daily-task-detail">${esc(detail)}</div>`:''}</div><span class="daily-task-kind crm">ΕΡΓΑΣΙΑ</span></div>`});
 if(titleEl)titleEl.textContent='👁 Συνεργείο '+slot;
 if(dateEl)dateEl.textContent=dt.toLocaleDateString('el-GR',{weekday:'long',day:'2-digit',month:'2-digit',year:'numeric'})+' • '+no+' '+(no===1?'εργασία':'εργασίες');
 body.innerHTML=`<section class="daily-crew"><div class="daily-crew-head"><b>Συνεργείο ${slot}</b>${resourceHtml}</div>${tasks||'<div class="daily-empty">Δεν υπάρχουν εργασίες στο συγκεκριμένο συνεργείο για την επιλεγμένη ημέρα.</div>'}</section>`;
 modal.classList.add('open');
}

document.addEventListener('keydown',ev=>{
 if(ev.key==='Escape'&&$('dailyBoardViewModal')?.classList.contains('open'))closeDailyBoardView();
});

function renderBoard(){
 if(!$('boardGrid'))return;
 let dates=[0,1,2,3,4].map(i=>addDays(boardStart,i)),days=['Δευτέρα','Τρίτη','Τετάρτη','Πέμπτη','Παρασκευή'];
 $('boardDates').innerHTML=dates.map((d,i)=>`<div class="board-date ${d===boardSelectedDate?'selected':''}" onclick="selectBoardDate('${d}')">${days[i]}<br>${new Date(d+'T12:00:00').toLocaleDateString('el-GR')}</div>`).join('');renderAvailability(dates);
 let html='';
 for(let slot=1;slot<=BOARD_CREW_COUNT;slot++)for(let i=0;i<5;i++){
   let key=boardKey(dates[i],slot),x=boardEntry(key);
   let hasWork=((x.drafts||[]).length>0)||((x.jobs||[]).length>0);
   let empChips=x.emps.map(id=>{let e=E.find(z=>z.id===id);return e?`<span class="crew-chip emp" draggable="true" ondragstart="dragStart(event,'emp','${id}','${key}')" title="Σύρε για μετακίνηση">👷 ${esc(e.name)}</span>`:''}).join('');let vehChips=x.vehs.map(id=>{let v=V.find(z=>z.id===id);if(!v)return '';let vehicleText=[v.model,v.plate].filter(Boolean).join(' • ')||'Χωρίς στοιχεία οχήματος',out=!!v.outOfService,problem=String(v.problem||'Χωρίς περιγραφή προβλήματος').trim();return `<span class="crew-chip veh crew-vehicle-line ${out?'vehicle-out-chip':''}" draggable="true" ondragstart="dragStart(event,'veh','${id}','${key}')" title="${out?'ΑΚΙΝΗΤΟ — '+esc(problem)+' • Σύρε πίσω στα VAN για αφαίρεση':'Σύρε για μετακίνηση'}">🚐 ${esc(vehicleText)}${out?`<span class="vehicle-problem-mini">🔴 ΑΚΙΝΗΤΟ — ${esc(problem)}</span>`:''}</span>`}).join('');html+=`<div class="board-cell ${hasWork?'has-work':''}" data-board-key="${key}" onmouseup="saveBoardCellHeight(this,'${key}')" onclick="if(event.target===this||event.target.classList.contains('crew-title')||event.target.classList.contains('job-stack'))addDraftJob('${key}')" ondragover="allowDrop(event)" ondragleave="leaveDrop(event)" ondrop="dropBoard(event,'${key}')"><div class="crew-head"><span class="crew-title">Συνεργείο ${slot}</span><button type="button" class="crew-viber-btn" onclick="event.stopPropagation();exportCrewImage('${dates[i]}',${slot})" title="Αντιγραφή εικόνας αυτού του συνεργείου για επικόλληση στο Viber">📋 Viber</button><div class="crew-employees">${empChips||'<span class="crew-chip empty">+ τεχνικός</span>'}</div><div class="crew-vehicles">${vehChips||'<span class="crew-chip empty">+ VAN</span>'}</div></div><div class="job-stack">${(x.drafts||[]).map(id=>card('draft',id,key)).join('')}${(x.jobs||[]).map(id=>card('job',id,key)).join('')}</div></div>`
 }
 $('boardGrid').innerHTML=html;
 document.querySelectorAll('.board-cell[data-board-key]').forEach(el=>applySavedCellHeight(el,el.dataset.boardKey));
 document.querySelectorAll('.board-cell.has-work .job-stack').forEach(el=>{el.scrollTop=0});
 let usedD=new Set(Object.values(B).flatMap(x=>x.drafts||[]));
 const orphanDrafts=D.filter(d=>!usedD.has(d.id));
 const priorityRank={'Επείγουσα':0,'Υψηλή':1,'Κανονική':2};
 const sortedCandidates=[...CAND].sort((a,b)=>(a.date||'9999-12-31').localeCompare(b.date||'9999-12-31') || (priorityRank[a.priority]??2)-(priorityRank[b.priority]??2) || String(a.createdAt||'').localeCompare(String(b.createdAt||'')));
 const orphanHtml=orphanDrafts.length?`<div class="candidate-group-label orphan">🟨 Πρόχειρες χωρίς συνεργείο — σύρε τες στο σωστό πλαίσιο</div>${orphanDrafts.map(d=>card('draft',d.id)).join('')}`:'';
 const candidateHtml=sortedCandidates.length?`${orphanDrafts.length?'<div class="candidate-group-label">🟪 Υποψήφιες εργασίες</div>':''}${sortedCandidates.map(c=>card('candidate',c.id)).join('')}`:'';
 $('poolCandidates').innerHTML=(orphanHtml+candidateHtml)||'<span class="candidate-empty">Δεν έχεις υποψήφιες. Πάτησε <b>+ Νέα</b> και μάζεψε εδώ τις δουλειές που σκέφτεσαι για τις επόμενες ημέρες.</span>';
 if($('candidatePoolTitle'))$('candidatePoolTitle').textContent=orphanDrafts.length?'Υποψήφιες / πρόχειρες χωρίς συνεργείο':'Υποψήφιες εργασίες επόμενων ημερών';
 $('poolJobs').innerHTML=orphanDrafts.map(d=>card('draft',d.id)).join('')||'<span class="small">Δεν υπάρχουν πρόχειρες εργασίες.</span>';
 let assignedEmp=new Set(),assignedVeh=new Set();Object.entries(B).forEach(([k,x])=>{const p=k.split('#');if(p[0]===boardSelectedDate&&parseInt(p[1],10)<=BOARD_CREW_COUNT){(x.emps||[]).forEach(id=>assignedEmp.add(id));(x.vehs||[]).forEach(id=>assignedVeh.add(id))}});$('poolEmps').innerHTML=E.filter(e=>e.active!==false&&!empOnLeave(e,boardSelectedDate)&&!assignedEmp.has(e.id)).map(e=>card('emp',e.id)).join('')||'<span class="small">Κανένας διαθέσιμος.</span>';$('poolVehs').innerHTML=V.filter(v=>v.active!==false&&!assignedVeh.has(v.id)).map(v=>card('veh',v.id)).join('')||'<span class="small">Κανένα διαθέσιμο.</span>';
 ['poolJobs','poolEmps','poolVehs'].forEach(id=>{let el=$(id);el.ondragover=allowDrop;el.ondragleave=leaveDrop;el.ondrop=dropPool});
 const candidatePool=$('poolCandidates');if(candidatePool){candidatePool.ondragover=allowDrop;candidatePool.ondragleave=leaveDrop;candidatePool.ondrop=dropCandidatePool}
}

buildTimeSelects();render();renderBoard();


// v5.0.13 — Εκτύπωση / Αποθήκευση PDF δελτίου εργασίας
function printEsc(v){
  return String(v ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}
function printField(id){ const el=document.getElementById(id); return el ? (el.value || '') : ''; }
function selectedTechniciansForPrint(){
  const box=document.getElementById('checks');
  if(!box) return '';
  const names=[];
  box.querySelectorAll('input[type="checkbox"]:checked').forEach(cb=>{
    const label=cb.closest('label') || cb.parentElement;
    const text=(label ? label.textContent : '').replace(/\s+/g,' ').trim();
    if(text) names.push(text);
  });
  return names.join(', ');
}
function selectedVehicleForPrint(){
  const el=document.getElementById('jVeh');
  if(!el) return '';
  const opt=el.options[el.selectedIndex];
  return opt ? opt.textContent.trim() : '';
}
function currentJobCodeForPrint(){
  const id=printField('jobId');
  try{
    if(id && typeof jobs!=='undefined'){
      const j=jobs.find(x=>String(x.id)===String(id));
      if(j && j.code) return j.code;
    }
  }catch(e){}
  return printField('jPylonRef') || id || '—';
}
function printCurrentJob(){
  const client=printField('jClient').trim();
  if(!client){ alert('Συμπλήρωσε πρώτα τον πελάτη.'); return; }
  const date=printField('jDate');
  const sh=printField('jStartH'), sm=printField('jStartM'), eh=printField('jEndH'), em=printField('jEndM');
  const time=(sh||sm||eh||em) ? `${sh||'--'}:${sm||'--'} – ${eh||'--'}:${em||'--'}` : '—';
  const html=`<div class="print-sheet">
    <div class="print-head">
      <div class="print-brand">ROMVOS Service<small>Δελτίο τεχνικής εργασίας</small></div>
      <div class="print-doc-title"><h2>ΔΕΛΤΙΟ ΕΡΓΑΣΙΑΣ</h2><div>Αρ. ${printEsc(currentJobCodeForPrint())}</div></div>
    </div>
    <div class="print-grid">
      <div class="print-box"><div class="print-label">Πελάτης</div><div class="print-value">${printEsc(client)}</div></div>
      <div class="print-box"><div class="print-label">Τηλέφωνο</div><div class="print-value">${printEsc(printField('jPhone')||'—')}</div></div>
      <div class="print-box full"><div class="print-label">Διεύθυνση</div><div class="print-value">${printEsc(printField('jAddress')||'—')}</div></div>
      <div class="print-box"><div class="print-label">Ημερομηνία</div><div class="print-value">${printEsc(date||'—')}</div></div>
      <div class="print-box"><div class="print-label">Ώρα</div><div class="print-value">${printEsc(time)}</div></div>
      <div class="print-box"><div class="print-label">Είδος εργασίας</div><div class="print-value">${printEsc(printField('jType')||'—')}</div></div>
      <div class="print-box"><div class="print-label">Μάρκα / Μοντέλο</div><div class="print-value">${printEsc(printField('jEquip')||'—')}</div></div>
      <div class="print-box full"><div class="print-label">Περιγραφή εργασίας</div><div class="print-value">${printEsc(printField('jTask')||'—')}</div></div>
      <div class="print-box"><div class="print-label">Τεχνικοί</div><div class="print-value">${printEsc(selectedTechniciansForPrint()||'—')}</div></div>
      <div class="print-box"><div class="print-label">Όχημα</div><div class="print-value">${printEsc(selectedVehicleForPrint()||'—')}</div></div>
      <div class="print-box full"><div class="print-label">Παρατηρήσεις / Υλικά</div><div class="print-value">\n\n\n</div></div>
    </div>
    <div class="print-lines"><div class="print-sign">Υπογραφή τεχνικού</div><div class="print-sign">Υπογραφή πελάτη</div></div>
    <div class="print-note">Για αποθήκευση σε PDF: στο παράθυρο εκτύπωσης επίλεξε «Αποθήκευση ως PDF».</div>
  </div>`;
  const area=document.getElementById('printArea');
  if(!area) return;
  area.innerHTML=html;
  setTimeout(()=>window.print(),50);
}

/* v6.0 — Πελάτες, εγκαταστάσεις και σύνδεση εργασιών */
function parseClientSites(text){return String(text||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean).map((line,i)=>{let p=line.split('|').map(x=>x.trim());return{id:'SITE-'+(i+1),storeNo:p[0]||'',name:p[1]||'',city:p[2]||'',address:p[3]||'',phone:p[4]||'',contact:p[5]||''}})}
function sitesToText(sites){return (sites||[]).map(x=>[x.storeNo,x.name,x.city,x.address,x.phone,x.contact].join(' | ')).join('\n')}
function currentClientRecord(){let n=($('jClient')?.value||'').trim();return C.find(c=>clientKey(c.name)===clientKey(n))||null}
function refreshJobSites(selected){let sel=$('jSite');if(!sel)return;let c=currentClientRecord(),sites=c&&Array.isArray(c.sites)?c.sites:[];sel.innerHTML='<option value="">— Επιλογή εγκατάστασης —</option>'+sites.map((x,i)=>`<option value="${i}">${esc([x.storeNo&&'Κατ. '+x.storeNo,x.name,x.city].filter(Boolean).join(' • '))}</option>`).join('');if(selected!==undefined&&selected!==null&&selected!=='')sel.value=String(selected)}
function autofillSite(){let c=currentClientRecord(),i=Number($('jSite')?.value);if(!c||!Array.isArray(c.sites)||!Number.isInteger(i)||!c.sites[i])return;let x=c.sites[i];$('jStoreNo').value=x.storeNo||'';$('jCity').value=x.city||'';$('jAddress').value=x.address||'';if(x.phone)$('jPhone').value=x.phone}
const _oldAutofillClient=autofillClient;
autofillClient=function(){_oldAutofillClient();let c=currentClientRecord();if(c){if(!$('jPhone').value&&c.phone)$('jPhone').value=c.phone;if(!$('jEmail').value&&c.email)$('jEmail').value=c.email;if(!$('jCity').value&&c.city)$('jCity').value=c.city}refreshJobSites();}
const _oldOpenJob=openJob;
openJob=function(){_oldOpenJob();refreshJobSites();}
const _oldEditJob=editJob;
editJob=function(id){_oldEditJob(id);let j=J.find(x=>x.id===id);refreshJobSites(j?.siteIndex);}
const _oldSaveJob=saveJob;
saveJob=function(force){let id=$('jobId').value,siteIndex=$('jSite')?.value||'';_oldSaveJob(force);if(!force&&$('modal').classList.contains('open'))return;let target=id?J.find(j=>j.id===id):J[J.length-1];if(target){target.siteIndex=siteIndex;let c=currentClientRecord();target.clientId=c?.id||'';save();}}
renderClients=function(){let q=($('cliSearch')?.value||'').toLowerCase(),list=allClientNames().filter(c=>{let sites=(c.sites||[]).map(x=>[x.storeNo,x.name,x.city,x.address,x.phone,x.contact].join(' ')).join(' ');return !q||[c.name,c.phone,c.email,c.city,c.category,c.contact,sites].join(' ').toLowerCase().includes(q)});list.sort((a,b)=>a.name.localeCompare(b.name,'el'));window.__clientsCache=list;$('clientsBody').innerHTML=list.length?list.map((c,i)=>{let st=clientStats(c.name),sites=(c.sites||[]);return `<tr><td><b>${esc(c.name)}</b>${c.active===false?'<div class="small bad">Ανενεργός</div>':''}</td><td>${esc(c.category||'—')}</td><td>${esc(c.phone||'—')}</td><td>${esc(c.city||'—')}<div class="small">${sites.length} εγκατάσταση/εις</div></td><td>${st.count}</td><td>${eur(st.income)}</td><td>${eur(st.expense)}</td><td>${eur(st.net)}</td><td>${st.last||'—'}</td><td><div class="actions"><button class="btn light" onclick="editClientAt(${i})">✏️</button><button class="btn light" onclick="openClientHistAt(${i})">📜</button>${c.id?`<button class="btn danger" onclick="delClient('${c.id}')">🗑️</button>`:''}</div></td></tr>`}).join(''):'<tr><td colspan="10">Δεν υπάρχουν πελάτες.</td></tr>'}
editClientAt=function(i){let c=window.__clientsCache[i];$('cliId').value=c.id||'';$('cliName').value=c.name||'';$('cliCategory').value=c.category||'';$('cliPhone').value=c.phone||'';$('cliEmail').value=c.email||'';$('cliVat').value=c.vat||'';$('cliTaxOffice').value=c.taxOffice||'';$('cliContact').value=c.contact||'';$('cliCity').value=c.city||'';$('cliAddress').value=c.address||'';$('cliActive').value=String(c.active!==false);$('cliSites').value=sitesToText(c.sites);$('cliNotes').value=c.notes||'';window.scrollTo(0,0)}
clearClient=function(){['cliId','cliName','cliPhone','cliEmail','cliVat','cliTaxOffice','cliContact','cliCity','cliAddress','cliSites','cliNotes'].forEach(id=>$(id).value='');$('cliCategory').value='';$('cliActive').value='true'}
saveClient=function(){let id=$('cliId').value,name=$('cliName').value.trim();if(!name)return alert('Συμπλήρωσε όνομα επαφής.');let d={name,category:$('cliCategory').value,phone:$('cliPhone').value.trim(),email:$('cliEmail').value.trim(),vat:$('cliVat').value.trim(),taxOffice:$('cliTaxOffice').value.trim(),contact:$('cliContact').value.trim(),city:$('cliCity').value.trim(),address:$('cliAddress').value.trim(),active:$('cliActive').value!=='false',sites:parseClientSites($('cliSites').value),notes:$('cliNotes').value.trim()};if(id){let x=C.find(x=>x.id===id);if(x)Object.assign(x,d)}else{let existing=C.find(x=>clientKey(x.name)===clientKey(name));if(existing)Object.assign(existing,d);else C.push({id:uid('CLI'),...d})}clearClient();save();render()}
const _oldRender=render;
render=function(){_oldRender();let dl=$('clientNames');if(dl)dl.innerHTML=C.filter(c=>c.active!==false).map(c=>`<option value="${esc(c.name)}"></option>`).join('')}


/* v6.0.1 — Απλές ανεξάρτητες υπενθυμίσεις */

let SIMPLE_REMINDERS=[];
/* v6.5.15 — ΑΜΕΣΗ ΜΕΤΑΦΟΡΑ ΠΑΛΙΩΝ ΥΠΕΝΘΥΜΙΣΕΩΝ, χωρίς import/backup.
   Στην πρώτη εκκίνηση αυτής της έκδοσης συγχωνεύονται οι 8 ανακτημένες υπενθυμίσεις
   με τυχόν υπάρχουσες. Μετά η εφαρμογή συνεχίζει κανονικά από το localStorage. */
(function directReminderMigrationV6515(){
  const recovered=[{"id":"REM-ms7bjxaulpw","text":"ΑΝΑΜΕΝΕΤΑΙ Η ΜΟΝΑΔΑ ΓΙΑ ΤΡΑΠΕΖΑ ΕΛΛΑΔΟΣ","date":"2026-09-15","time":"09:00","done":false,"notified":false,"createdAt":"2026-07-30T09:36:24.150Z"},{"id":"REM-msctow92k66","text":"ΚΑΛΥΒΑΣ ΠΑΥΛΟΣ ΔΕΝ ΕΧΩ ΔΕΛΤΙΟ ΑΠΟ ΕΝΡΓ-00007849","date":"2026-08-15","time":"19:44","done":false,"notified":false,"createdAt":"2026-08-03T06:03:00.038Z","snoozeUntil":""},{"id":"REM-msctqajq8i7","text":"ΚΑΛΥΒΑΣ ΠΑΥΛΟΣ ΠΟΤΕ ΘΑ ΣΥΝΕΧΙΣΕΙ ΣΥΝΤΗΡΗΣΗ ΣΤΟ PALACE;;;","date":"2026-08-15","time":"09:00","done":false,"notified":false,"createdAt":"2026-08-03T06:04:05.222Z","snoozeUntil":""},{"id":"REM-msefrn05uwr","text":"ΤΣΑΛΟΥΜΗΣ ΣΥΝΤΗΡΗΣΗ ΜΑΣΟΥΤΗΣ","date":"2026-08-15","time":"11:17","done":false,"notified":false,"createdAt":"2026-08-04T09:08:45.750Z","snoozeUntil":""},{"id":"REM-msfpwo342cu","text":"ELECTRA PALACE ΔΙΚΤΥΟ ΕΞΑΕΡΙΣΜΟΥ ΧΩΡΟΥ ΚΑΒΑΣ ΑΝ ΕΧΕΙ ΟΛΟΚΛΗΡΩΣΕΙ Ο ΚΑΛΥΒΑΣ ΝΑ ΤΙΜΟΛΟΓΗΣΟΥΜΕ","date":"2026-08-15","time":"09:00","done":false,"notified":false,"createdAt":"2026-08-05T06:40:22.768Z","snoozeUntil":""},{"id":"REM-mspp1f4d74g","text":"ΚΟΚΚΙΝΟΥ -ΠΛΙΑΤΣΙΚΑΣ ΕΝΗΜΕΡΩΣΗ","date":"2026-08-17","time":"09:00","done":false,"notified":false,"createdAt":"2026-08-12T06:13:46.573Z"},{"id":"REM-msq1xbs0k67","text":"ΤΣΑΓΚΑΛΙΔΗΣ ΧΡΗΜΑΤΑ ΓΙΑ ΕΠΙΣΚΕΥΗ ΠΛΑΚΕΤΩΝ 100 ΕΥΡΩ","date":"2026-08-25","time":"09:00","done":false,"notified":false,"createdAt":"2026-08-12T12:14:30.624Z"},{"id":"REM-msrdoke3i90","text":"ΕΣΤΕΙΛΑ 14/8 ΠΛΑΚΕΤΑ MAIN ΣΤΟΝ ΓΚΑΓΚΑ.ΠΕΡΙΜΕΝΩ ΤΑ 200 ΕΥΡΩ ΑΡ.ΑΠΟΣΤΟΛΗΣ 5824741473","date":"2026-08-19","time":"09:00","done":false,"notified":false,"createdAt":"2026-08-13T10:31:23.451Z"}];
  const migrationKey='romvos_direct_reminder_migration_v6515';
  try{
    let stored=[];
    try{stored=JSON.parse(localStorage.getItem('romvos_simple_reminders')||'[]')}catch(e){stored=[]}
    if(!Array.isArray(stored))stored=[];
    if(localStorage.getItem(migrationKey)!=='1'){
      const map=new Map();
      recovered.forEach((r,i)=>map.set(String(r.id||('rec_'+i)),Object.assign({},r)));
      stored.forEach((r,i)=>map.set(String(r.id||('cur_'+i)),r));
      SIMPLE_REMINDERS=Array.from(map.values());
      localStorage.setItem('romvos_simple_reminders',JSON.stringify(SIMPLE_REMINDERS));
      localStorage.setItem(migrationKey,'1');
    }else{
      SIMPLE_REMINDERS=stored;
    }
  }catch(e){
    // Ακόμα κι αν ο browser μπλοκάρει localStorage, η λίστα λειτουργεί στη μνήμη.
    SIMPLE_REMINDERS=recovered.map(r=>Object.assign({},r));
  }
  // Τελική ασφάλεια στην ΠΡΩΤΗ εκκίνηση: ποτέ κενή λίστα λόγω σφάλματος storage.
  if(!Array.isArray(SIMPLE_REMINDERS) || SIMPLE_REMINDERS.length===0){
    SIMPLE_REMINDERS=recovered.map(r=>Object.assign({},r));
  }
})();
function saveSimpleReminders(){try{localStorage.setItem('romvos_simple_reminders',JSON.stringify(SIMPLE_REMINDERS))}catch(e){};setTimeout(updateReminderDueBanner,0)}
function importRemindersOnlyFromBackup(input){
  const file=input&&input.files&&input.files[0];
  if(!file)return;
  const reader=new FileReader();
  reader.onload=function(){
    try{
      const payload=JSON.parse(reader.result);
      let incoming=null;
      // Νεότερο πλήρες ROMVOS backup: όλες οι τιμές localStorage είναι μέσα στο storage.
      if(payload&&payload.storage&&typeof payload.storage==='object'){
        const raw=payload.storage['romvos_simple_reminders'];
        if(typeof raw==='string')incoming=JSON.parse(raw||'[]');
        else if(Array.isArray(raw))incoming=raw;
      }
      // Παλαιότερα ROMVOS backup/export.
      if(!incoming&&payload&&Array.isArray(payload.simpleReminders))incoming=payload.simpleReminders;
      // Επιτρέπουμε και αρχείο που περιέχει απευθείας array υπενθυμίσεων.
      if(!incoming&&Array.isArray(payload))incoming=payload;
      if(!Array.isArray(incoming))throw new Error('Δεν βρέθηκαν υπενθυμίσεις στο αρχείο.');
      const current=Array.isArray(SIMPLE_REMINDERS)?SIMPLE_REMINDERS:[];
      const map=new Map();
      current.forEach((r,i)=>map.set(String(r.id||('cur_'+i)),r));
      incoming.forEach((r,i)=>{
        if(!r||typeof r!=='object')return;
        const key=String(r.id||('old_'+i+'_'+(r.date||'')+'_'+(r.text||'')));
        const old=map.get(key);
        map.set(key,old?{...old,...r}:r);
      });
      SIMPLE_REMINDERS=Array.from(map.values());
      localStorage.setItem('romvos_simple_reminders',JSON.stringify(SIMPLE_REMINDERS));
      renderSimpleReminders();
      try{updateReminderDueBanner()}catch(e){}
      try{window.romvosCheckDeadlineNotices?.()}catch(e){}
      alert('Ανακτήθηκαν '+incoming.length+' υπενθυμίσεις.\n\nΣύνολο τώρα: '+SIMPLE_REMINDERS.length+'.\n\nΤα υπόλοιπα δεδομένα της εφαρμογής δεν άλλαξαν.');
    }catch(e){
      alert('Η ανάκτηση υπενθυμίσεων δεν έγινε.\n'+e.message);
    }
    input.value='';
  };
  reader.onerror=function(){alert('Δεν ήταν δυνατή η ανάγνωση του backup.');input.value=''};
  reader.readAsText(file);
}

function simpleReminderMoment(r){return new Date((r.date||today())+'T'+(r.time||'09:00')+':00')}
function clearSimpleReminder(){if($('simpleRemId'))$('simpleRemId').value='';if($('simpleRemText'))$('simpleRemText').value='';if($('simpleRemDate'))$('simpleRemDate').value=today();if($('simpleRemTime'))$('simpleRemTime').value='09:00'}
function saveSimpleReminder(){let id=$('simpleRemId').value,text=$('simpleRemText').value.trim(),date=$('simpleRemDate').value,time=$('simpleRemTime').value||'09:00';if(!text)return alert('Γράψε τη σημείωση της υπενθύμισης.');if(!date)return alert('Διάλεξε ημερομηνία.');let old=SIMPLE_REMINDERS.find(r=>r.id===id),d={id:id||uid('REM'),text,date,time,done:old?.done||false,notified:false,createdAt:old?.createdAt||new Date().toISOString()};if(id){let i=SIMPLE_REMINDERS.findIndex(r=>r.id===id);if(i>=0)SIMPLE_REMINDERS[i]=d}else SIMPLE_REMINDERS.push(d);saveSimpleReminders();clearSimpleReminder();renderSimpleReminders();checkSimpleReminders(true)}
function editSimpleReminder(id){let r=SIMPLE_REMINDERS.find(x=>x.id===id);if(!r)return;$('simpleRemId').value=r.id;$('simpleRemText').value=r.text;$('simpleRemDate').value=r.date;$('simpleRemTime').value=r.time||'09:00';window.scrollTo(0,0)}
async function deleteSimpleReminder(id){if(await askConfirm('Να διαγραφεί η υπενθύμιση;')){SIMPLE_REMINDERS=SIMPLE_REMINDERS.filter(r=>r.id!==id);saveSimpleReminders();renderSimpleReminders()}}
function toggleSimpleReminder(id){let r=SIMPLE_REMINDERS.find(x=>x.id===id);if(!r)return;r.done=!r.done;r.notified=r.done?true:false;saveSimpleReminders();renderSimpleReminders()}
function renderSimpleReminders(){if(!$('simpleReminderList'))return;let now=new Date(),list=[...SIMPLE_REMINDERS].sort((a,b)=>simpleReminderMoment(a)-simpleReminderMoment(b));$('simpleReminderList').innerHTML=list.length?list.map(r=>{let due=!r.done&&simpleReminderMoment(r)<=now;return `<div class="reminder-row ${due?'due':''} ${r.done?'done':''}"><div class="reminder-icon">${r.done?'✅':due?'🔔':'🕒'}</div><div class="reminder-text"><b>${esc(r.text)}</b><small>${due?'Η υπενθύμιση έχει φτάσει':'Προγραμματισμένη'}</small></div><div class="reminder-when"><b>${new Date(r.date+'T12:00:00').toLocaleDateString('el-GR')}</b> • ${esc(r.time||'09:00')}</div><div class="actions"><button class="btn ${r.done?'light':'good'}" onclick="toggleSimpleReminder('${r.id}')">${r.done?'↩ Επαναφορά':'✓ Έγινε'}</button><button class="btn light" onclick="editSimpleReminder('${r.id}')">✏️</button><button class="btn danger" onclick="deleteSimpleReminder('${r.id}')">🗑️</button></div></div>`}).join(''):'<div class="small">Δεν υπάρχουν υπενθυμίσεις.</div>';let dueCount=SIMPLE_REMINDERS.filter(r=>!r.done&&simpleReminderMoment(r)<=now).length;if($('reminderNavCount')){$('reminderNavCount').textContent=dueCount;$('reminderNavCount').style.display=dueCount?'inline-flex':'none'};if($('remNow'))$('remNow').innerHTML=dueCount?`<button class="btn light" onclick="openSimpleReminders()">🔔 ${dueCount} υπενθύμιση${dueCount===1?'':'εις'}</button>`:'<span class="small">Καμία εκκρεμής υπενθύμιση</span>'}
let SHOWN_REMINDER_IDS=[];
function updateReminderDueBanner(){
  let now=new Date(),due=SIMPLE_REMINDERS.filter(r=>!r.done&&simpleReminderMoment(r)<=now&&(!r.snoozeUntil||new Date(r.snoozeUntil)<=now));
  let b=$('reminderDueBanner');if(b)b.classList.toggle('show',due.length>0);
}
function showSimpleReminderAlert(items,testMode){
  if(!items||!items.length)return;
  SHOWN_REMINDER_IDS=testMode?[]:items.map(r=>r.id);
  let body=$('simpleReminderPopupBody');
  if(body)body.innerHTML=items.map(r=>`<div style="padding:14px 4px;border-bottom:1px solid #e5e7eb"><b>${esc(r.text)}</b><div class="small" style="margin-top:6px">${new Date((r.date||today())+'T12:00:00').toLocaleDateString('el-GR')} • ${esc(r.time||'09:00')}</div></div>`).join('');
  $('simpleReminderPopup')?.classList.add('show');
  try{playDeadlineSound()}catch(e){}
  if('Notification'in window&&Notification.permission==='granted')items.forEach(r=>{try{new Notification('ROMVOS Service — Υπενθύμιση',{body:r.text,requireInteraction:true})}catch(e){}});
}
function checkSimpleReminders(force){
  let now=new Date();
  let due=SIMPLE_REMINDERS.filter(r=>!r.done&&simpleReminderMoment(r)<=now&&(!r.snoozeUntil||new Date(r.snoozeUntil)<=now));
  renderSimpleReminders();updateReminderDueBanner();
  if(!due.length)return;
  let popupOpen=$('simpleReminderPopup')?.classList.contains('show');
  let last=Number(localStorage.getItem('romvos_last_reminder_popup')||0);
  if(force||!popupOpen||Date.now()-last>60000){showSimpleReminderAlert(due,false);localStorage.setItem('romvos_last_reminder_popup',String(Date.now()))}
}
function testSimpleReminder(){showSimpleReminderAlert([{id:'TEST',text:'Η ειδοποίηση λειτουργεί κανονικά.',date:today(),time:new Date().toTimeString().slice(0,5)}],true)}
function closeSimpleReminderPopup(){$('simpleReminderPopup')?.classList.remove('show');updateReminderDueBanner()}
function completeShownReminders(){SHOWN_REMINDER_IDS.forEach(id=>{let r=SIMPLE_REMINDERS.find(x=>x.id===id);if(r)r.done=true});saveSimpleReminders();SHOWN_REMINDER_IDS=[];closeSimpleReminderPopup();renderSimpleReminders()}
function snoozeShownReminders(){let t=new Date(Date.now()+60*60000).toISOString();SHOWN_REMINDER_IDS.forEach(id=>{let r=SIMPLE_REMINDERS.find(x=>x.id===id);if(r)r.snoozeUntil=t});saveSimpleReminders();SHOWN_REMINDER_IDS=[];closeSimpleReminderPopup();renderSimpleReminders();updateReminderDueBanner()}
function snoozeShownRemindersNextDay(){let ids=[...SHOWN_REMINDER_IDS];ids.forEach(id=>{let r=SIMPLE_REMINDERS.find(x=>x.id===id);if(!r)return;let base=new Date((r.date||today())+'T12:00:00');base.setDate(base.getDate()+1);r.date=base.getFullYear()+'-'+String(base.getMonth()+1).padStart(2,'0')+'-'+String(base.getDate()).padStart(2,'0');r.snoozeUntil=''});saveSimpleReminders();SHOWN_REMINDER_IDS=[];closeSimpleReminderPopup();renderSimpleReminders();updateReminderDueBanner()}
function openSimpleReminders(){closeSimpleReminderPopup();document.querySelector('nav button[data-tab="reminders"]')?.click()}
function requestReminderPermission(){if(!('Notification'in window))return alert('Ο browser δεν υποστηρίζει ειδοποιήσεις Windows.');Notification.requestPermission().then(p=>alert(p==='granted'?'Οι ειδοποιήσεις Windows ενεργοποιήθηκαν.':'Δεν δόθηκε άδεια. Οι ειδοποιήσεις μέσα στην εφαρμογή θα λειτουργούν κανονικά.'))}

/* v6.0.4 — Βάση καταστημάτων LIDL και γρήγορη αναζήτηση */
const LIDL_CLIENT_SEED=[{"id":"LIDL-310-001","name":"LIDL GR0001 - Σέρρες-Σιδ. Σταθμός","category":"LIDL","storeNo":"GR0001","region":"Σίνδου","regionCode":"310","city":"Σέρρες-Σιδ. Σταθμός","address":"1ο χλμ Ε.Ο Σερρών-Νιγρίτας","phone":"6937014412","facilityManager":"ΖΗΣΟΠΟΥΛΟΣ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΣΟΠΙΑΔΟΥ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΡΟΜΒΟΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-310-002","name":"LIDL GR0002 - Κομοτηνή- Μεραρχίας","category":"LIDL","storeNo":"GR0002","region":"Σίνδου","regionCode":"310","city":"Κομοτηνή- Μεραρχίας","address":"Μεραρχίας-Σερρών","phone":"6937014419","facilityManager":"ΖΗΣΟΠΟΥΛΟΣ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΣΟΠΙΑΔΟΥ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΡΟΜΒΟΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-310-004","name":"LIDL GR0004 - Θεσ/Πυλαία","category":"LIDL","storeNo":"GR0004","region":"Σίνδου","regionCode":"310","city":"Θεσ/Πυλαία","address":"1ο χλμ Δ.Ο.Χαριλάου-Θέρμης","phone":"6937014428","facilityManager":"ΝΙΚΟΠΟΥΛΟΣ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΟΥΤΣΙΟΥ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΡΟΜΒΟΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-310-005","name":"LIDL GR0005 - Ξάνθη-28ης Οκτωβρίου","category":"LIDL","storeNo":"GR0005","region":"Σίνδου","regionCode":"310","city":"Ξάνθη-28ης Οκτωβρίου","address":"Τέρμα 28ης Οκτωβρίου","phone":"6937014433","facilityManager":"ΖΗΣΟΠΟΥΛΟΣ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΣΟΠΙΑΔΟΥ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΡΟΜΒΟΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-310-007","name":"LIDL GR0007 - Δράμα-Ξηροποτάμου","category":"LIDL","storeNo":"GR0007","region":"Σίνδου","regionCode":"310","city":"Δράμα-Ξηροποτάμου","address":"3ο χλμ.Ε.Ο.Δράμας-Σερρών","phone":"6937014435","facilityManager":"ΖΗΣΟΠΟΥΛΟΣ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΣΟΠΙΑΔΟΥ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΡΟΜΒΟΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-310-008","name":"LIDL GR0008 - Σκύδρα Πέλλας","category":"LIDL","storeNo":"GR0008","region":"Σίνδου","regionCode":"310","city":"Σκύδρα Πέλλας","address":"2ο χλμ.Ε.Ο.Σκύδρας-Εδεσσας","phone":"6937014448","facilityManager":"ΝΙΚΟΠΟΥΛΟΣ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΟΥΤΣΙΟΥ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΡΟΜΒΟΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-310-009","name":"LIDL GR0009 - Γιαννιτσά","category":"LIDL","storeNo":"GR0009","region":"Σίνδου","regionCode":"310","city":"Γιαννιτσά","address":"1ο χλμ.Ε.Ο.Γιαννιτσών-Εδέσσης","phone":"6937014453","facilityManager":"ΝΙΚΟΠΟΥΛΟΣ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΟΥΤΣΙΟΥ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΡΟΜΒΟΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-310-014","name":"LIDL GR0014 - Αλεξανδρούπολη-Ν. Χιλή","category":"LIDL","storeNo":"GR0014","region":"Σίνδου","regionCode":"310","city":"Αλεξανδρούπολη-Ν. Χιλή","address":"2ο χλμ Αλεξανδρούπολης-Κομοτηνής","phone":"6937014488","facilityManager":"ΖΗΣΟΠΟΥΛΟΣ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΣΟΠΙΑΔΟΥ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΤΟΠΑΛΟΥΔΗΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-310-015","name":"LIDL GR0015 - Λαγκαδάς","category":"LIDL","storeNo":"GR0015","region":"Σίνδου","regionCode":"310","city":"Λαγκαδάς","address":"1ο χλμ.επαρχ.οδού Λαγκαδά-Θεσ/νίκης","phone":"6937014498","facilityManager":"ΖΗΣΟΠΟΥΛΟΣ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΣΟΠΙΑΔΟΥ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΡΟΜΒΟΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-310-026","name":"LIDL GR0026 - Αλεξάνδρεια","category":"LIDL","storeNo":"GR0026","region":"Σίνδου","regionCode":"310","city":"Αλεξάνδρεια","address":"1ο χλμ.Π.Ε.Ο Αλεξάνδρειας-Βέροιας","phone":"6937014520","facilityManager":"ΝΙΚΟΠΟΥΛΟΣ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΟΥΤΣΙΟΥ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΡΟΜΒΟΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-310-028","name":"LIDL GR0028 - Σέρρες-Λευκώνας","category":"LIDL","storeNo":"GR0028","region":"Σίνδου","regionCode":"310","city":"Σέρρες-Λευκώνας","address":"2ο χλμ.Ε.Ο Σερρών-Θεσσαλονίκης","phone":"6937014535","facilityManager":"ΖΗΣΟΠΟΥΛΟΣ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΣΟΠΙΑΔΟΥ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΡΟΜΒΟΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-310-030","name":"LIDL GR0030 - Ξάνθη-Δημοκρίτου","category":"LIDL","storeNo":"GR0030","region":"Σίνδου","regionCode":"310","city":"Ξάνθη-Δημοκρίτου","address":"Τέρμα Δημοκρίτου","phone":"6937014539","facilityManager":"ΖΗΣΟΠΟΥΛΟΣ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΣΟΠΙΑΔΟΥ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΡΟΜΒΟΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-310-032","name":"LIDL GR0032 - Ορεστιάδα","category":"LIDL","storeNo":"GR0032","region":"Σίνδου","regionCode":"310","city":"Ορεστιάδα","address":"1ο χλμ.Ορεστιάδας-Πύργου","phone":"6937014548","facilityManager":"ΖΗΣΟΠΟΥΛΟΣ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΣΟΠΙΑΔΟΥ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΤΟΠΑΛΟΥΔΗΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-310-033","name":"LIDL GR0033 - Διδυμότειχο","category":"LIDL","storeNo":"GR0033","region":"Σίνδου","regionCode":"310","city":"Διδυμότειχο","address":"1ο χλμ.Διδυμότειχο-Ορεστιάδας","phone":"6937014550","facilityManager":"ΖΗΣΟΠΟΥΛΟΣ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΣΟΠΙΑΔΟΥ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΤΟΠΑΛΟΥΔΗΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-310-037","name":"LIDL GR0037 - Θεσ / Ωραιόκαστρο","category":"LIDL","storeNo":"GR0037","region":"Σίνδου","regionCode":"310","city":"Θεσ / Ωραιόκαστρο","address":"4ο χλμ.Ωραιοκάστρου-Θεσσαλονίκης","phone":"6937014554","facilityManager":"ΝΙΚΟΠΟΥΛΟΣ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΟΥΤΣΙΟΥ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΡΟΜΒΟΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-310-040","name":"LIDL GR0040 - Καβάλα-ΔΕΠΟΣ","category":"LIDL","storeNo":"GR0040","region":"Σίνδου","regionCode":"310","city":"Καβάλα-ΔΕΠΟΣ","address":"Παφλαγωνίας 1 και Αν.Ρωμυλίας","phone":"6937014562","facilityManager":"ΖΗΣΟΠΟΥΛΟΣ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΣΟΠΙΑΔΟΥ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΡΟΜΒΟΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-310-041","name":"LIDL GR0041 - Αριδαία Πέλλας","category":"LIDL","storeNo":"GR0041","region":"Σίνδου","regionCode":"310","city":"Αριδαία Πέλλας","address":"1ο χλμ.Αριδαίας-Εξαπλατάνου","phone":"6937014565","facilityManager":"ΝΙΚΟΠΟΥΛΟΣ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΟΥΤΣΙΟΥ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΡΟΜΒΟΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-310-047","name":"LIDL GR0047 - Χρυσούπολη","category":"LIDL","storeNo":"GR0047","region":"Σίνδου","regionCode":"310","city":"Χρυσούπολη","address":"Μαραθώνος-Περιμετρική οδός","phone":"6937014609","facilityManager":"ΖΗΣΟΠΟΥΛΟΣ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΣΟΠΙΑΔΟΥ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΡΟΜΒΟΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-310-052","name":"LIDL GR0052 - Ελευθερούπολη","category":"LIDL","storeNo":"GR0052","region":"Σίνδου","regionCode":"310","city":"Ελευθερούπολη","address":"Εναντι εργατικών κατοικιών","phone":"6937014635","facilityManager":"ΖΗΣΟΠΟΥΛΟΣ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΣΟΠΙΑΔΟΥ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΡΟΜΒΟΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-310-059","name":"LIDL GR0059 - Πολύκαστρο","category":"LIDL","storeNo":"GR0059","region":"Σίνδου","regionCode":"310","city":"Πολύκαστρο","address":"2ο χλμ.Πολυκάστρου-Κιλκις","phone":"6937014655","facilityManager":"ΝΙΚΟΠΟΥΛΟΣ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΟΥΤΣΙΟΥ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΡΟΜΒΟΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-310-063","name":"LIDL GR0063 - Ασπροβάλτα-Ν.Βρασνά","category":"LIDL","storeNo":"GR0063","region":"Σίνδου","regionCode":"310","city":"Ασπροβάλτα-Ν.Βρασνά","address":"76ο χλμ.Καβάλας-Θεσσαλονίκης","phone":"6937014663","facilityManager":"ΖΗΣΟΠΟΥΛΟΣ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΣΟΠΙΑΔΟΥ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΡΟΜΒΟΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-310-064","name":"LIDL GR0064 - Νικήτη Χαλκιδική","category":"LIDL","storeNo":"GR0064","region":"Σίνδου","regionCode":"310","city":"Νικήτη Χαλκιδική","address":"1ο χλμ.Νικήτης-Μαρμαρά","phone":"6937014664","facilityManager":"ΝΙΚΟΠΟΥΛΟΣ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΟΥΤΣΙΟΥ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΡΟΜΒΟΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-310-067","name":"LIDL GR0067 - Καλλικράτεια Χαλκιδική","category":"LIDL","storeNo":"GR0067","region":"Σίνδου","regionCode":"310","city":"Καλλικράτεια Χαλκιδική","address":"1ο χλμ.Καλλικράτειας-Ν.Μουδανιών","phone":"6937014685","facilityManager":"ΝΙΚΟΠΟΥΛΟΣ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΟΥΤΣΙΟΥ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΡΟΜΒΟΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-310-069","name":"LIDL GR0069 - Σιδηρόκαστρο","category":"LIDL","storeNo":"GR0069","region":"Σίνδου","regionCode":"310","city":"Σιδηρόκαστρο","address":"1ο χλμ.Σιδηροκάστρου-Σερρών","phone":"6937014690","facilityManager":"ΖΗΣΟΠΟΥΛΟΣ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΣΟΠΙΑΔΟΥ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΡΟΜΒΟΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-310-071","name":"LIDL GR0071 - Θεσ / Σταυρούπολη-Λαγκαδά","category":"LIDL","storeNo":"GR0071","region":"Σίνδου","regionCode":"310","city":"Θεσ / Σταυρούπολη-Λαγκαδά","address":"Λαγκαδά 345","phone":"6937014696","facilityManager":"ΝΙΚΟΠΟΥΛΟΣ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΟΥΤΣΙΟΥ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΡΟΜΒΟΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-310-074","name":"LIDL GR0074 - Θεσ / Καλαμαριά-Μίκρας","category":"LIDL","storeNo":"GR0074","region":"Σίνδου","regionCode":"310","city":"Θεσ / Καλαμαριά-Μίκρας","address":"Πόντου-Γεννηματά","phone":"6937014716","facilityManager":"ΝΙΚΟΠΟΥΛΟΣ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΟΥΤΣΙΟΥ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΡΟΜΒΟΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-310-077","name":"LIDL GR0077 - Θεσ / Ρετζίκι","category":"LIDL","storeNo":"GR0077","region":"Σίνδου","regionCode":"310","city":"Θεσ / Ρετζίκι","address":"Γ.Παπανικολάου-Αρετής","phone":"6937014722","facilityManager":"ΝΙΚΟΠΟΥΛΟΣ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΟΥΤΣΙΟΥ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΡΟΜΒΟΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-310-082","name":"LIDL GR0082 - Κουφάλια","category":"LIDL","storeNo":"GR0082","region":"Σίνδου","regionCode":"310","city":"Κουφάλια","address":"1ο χλμ.Κουφαλίων-Χαλκηδόνας","phone":"6937014732","facilityManager":"ΝΙΚΟΠΟΥΛΟΣ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΟΥΤΣΙΟΥ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΡΟΜΒΟΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-310-084","name":"LIDL GR0084 - Βέροια- Μακροχώρι","category":"LIDL","storeNo":"GR0084","region":"Σίνδου","regionCode":"310","city":"Βέροια- Μακροχώρι","address":"1ο χλμ.Βεροίας-Αλεξανδρείας","phone":"6937014739","facilityManager":"ΖΗΣΟΠΟΥΛΟΣ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΣΟΠΙΑΔΟΥ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΡΟΜΒΟΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-310-086","name":"LIDL GR0086 - Πολύγυρος Χαλκιδική","category":"LIDL","storeNo":"GR0086","region":"Σίνδου","regionCode":"310","city":"Πολύγυρος Χαλκιδική","address":"1ο χλμ.Πολυγύρου-Γερακινής","phone":"6937014756","facilityManager":"ΝΙΚΟΠΟΥΛΟΣ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΟΥΤΣΙΟΥ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΡΟΜΒΟΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-310-087","name":"LIDL GR0087 - ΘΕΣ/ΧΑΡΙΛΑΟΥ","category":"LIDL","storeNo":"GR0087","region":"Σίνδου","regionCode":"310","city":"ΘΕΣ/ΧΑΡΙΛΑΟΥ","address":"Αλεξάνδρου Παπαναστασίου 102","phone":"6937014761","facilityManager":"ΝΙΚΟΠΟΥΛΟΣ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΟΥΤΣΙΟΥ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΡΟΜΒΟΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-310-093","name":"LIDL GR0093 - Θεσ / Πυλαία-Μαλακοπή","category":"LIDL","storeNo":"GR0093","region":"Σίνδου","regionCode":"310","city":"Θεσ / Πυλαία-Μαλακοπή","address":"Τερψιθέας 11","phone":"6937014778","facilityManager":"ΝΙΚΟΠΟΥΛΟΣ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΟΥΤΣΙΟΥ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΡΟΜΒΟΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-310-096","name":"LIDL GR0096 - Κομοτηνή-Σισμανόγλου","category":"LIDL","storeNo":"GR0096","region":"Σίνδου","regionCode":"310","city":"Κομοτηνή-Σισμανόγλου","address":"Σισμανόγλου 66","phone":"6937014782","facilityManager":"ΖΗΣΟΠΟΥΛΟΣ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΣΟΠΙΑΔΟΥ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΡΟΜΒΟΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-310-099","name":"LIDL GR0099 - Σίνδος","category":"LIDL","storeNo":"GR0099","region":"Σίνδου","regionCode":"310","city":"Σίνδος","address":"1ο χλμ.Σίνδου-Χαλάστρας","phone":"6937014784","facilityManager":"ΝΙΚΟΠΟΥΛΟΣ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΟΥΤΣΙΟΥ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΡΟΜΒΟΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-310-108","name":"LIDL GR0108 - Επανομή","category":"LIDL","storeNo":"GR0108","region":"Σίνδου","regionCode":"310","city":"Επανομή","address":"1ο χλμ.Επανομής-Θεσσαλονίκης","phone":"6937014790","facilityManager":"ΝΙΚΟΠΟΥΛΟΣ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΟΥΤΣΙΟΥ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΡΟΜΒΟΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-310-116","name":"LIDL GR0116 - Θεσ / Ολυμπιάδος","category":"LIDL","storeNo":"GR0116","region":"Σίνδου","regionCode":"310","city":"Θεσ / Ολυμπιάδος","address":"Ολυμπιάδος 56","phone":"6937014798","facilityManager":"ΝΙΚΟΠΟΥΛΟΣ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΟΥΤΣΙΟΥ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΡΟΜΒΟΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-310-120","name":"LIDL GR0120 - Θεσ / Εύοσμος-Καρ.Δημ.","category":"LIDL","storeNo":"GR0120","region":"Σίνδου","regionCode":"310","city":"Θεσ / Εύοσμος-Καρ.Δημ.","address":"Καραολή Δημητρίου 149","phone":"6937014799","facilityManager":"ΝΙΚΟΠΟΥΛΟΣ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΟΥΤΣΙΟΥ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΡΟΜΒΟΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-310-124","name":"LIDL GR0124 - Θεσ / Καλαμαριά-Βρυούλων","category":"LIDL","storeNo":"GR0124","region":"Σίνδου","regionCode":"310","city":"Θεσ / Καλαμαριά-Βρυούλων","address":"Βρυούλων 33","phone":"6932472369","facilityManager":"ΝΙΚΟΠΟΥΛΟΣ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΟΥΤΣΙΟΥ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΡΟΜΒΟΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-310-125","name":"LIDL GR0125 - Νάουσα","category":"LIDL","storeNo":"GR0125","region":"Σίνδου","regionCode":"310","city":"Νάουσα","address":"3ο χλμ.Επαρχ. Οδού Νάουσας-Σιδ.σταθμού","phone":"6937014537","facilityManager":"ΖΗΣΟΠΟΥΛΟΣ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΣΟΠΙΑΔΟΥ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΡΟΜΒΟΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-310-127","name":"LIDL GR0127 - Θεσ / Σταυρούπολη-Τερψιθέα","category":"LIDL","storeNo":"GR0127","region":"Σίνδου","regionCode":"310","city":"Θεσ / Σταυρούπολη-Τερψιθέα","address":"Ιατρού Γωγούση 37","phone":"6932472395","facilityManager":"ΝΙΚΟΠΟΥΛΟΣ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΟΥΤΣΙΟΥ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΡΟΜΒΟΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-310-128","name":"LIDL GR0128 - Θεσ / Θέρμη","category":"LIDL","storeNo":"GR0128","region":"Σίνδου","regionCode":"310","city":"Θεσ / Θέρμη","address":"Προέκταση Παπάγου","phone":"6932472391","facilityManager":"ΝΙΚΟΠΟΥΛΟΣ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΟΥΤΣΙΟΥ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΡΟΜΒΟΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-310-129","name":"LIDL GR0129 - Θεσ / Πυλαία Γεωργ. Σχολής","category":"LIDL","storeNo":"GR0129","region":"Σίνδου","regionCode":"310","city":"Θεσ / Πυλαία Γεωργ. Σχολής","address":"Γεωργικής σχολής 88","phone":"6937014737","facilityManager":"ΝΙΚΟΠΟΥΛΟΣ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΟΥΤΣΙΟΥ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΡΟΜΒΟΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-310-088","name":"LIDL GR0088 - ΚΑΒΑΛΑ ΝΈΟ","category":"LIDL","storeNo":"GR0088","region":"Σίνδου","regionCode":"310","city":"ΚΑΒΑΛΑ ΝΈΟ","address":"Εναντι παλιών εργατικών κατοικιών","phone":"6937014764","facilityManager":"ΖΗΣΟΠΟΥΛΟΣ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΣΟΠΙΑΔΟΥ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΡΟΜΒΟΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-310-126","name":"LIDL GR0126 - ΚΙΛΚΙΣ","category":"LIDL","storeNo":"GR0126","region":"Σίνδου","regionCode":"310","city":"ΚΙΛΚΙΣ","address":"Δυτική περιφερειακή οδός","phone":"6937014425","facilityManager":"ΝΙΚΟΠΟΥΛΟΣ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΟΥΤΣΙΟΥ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΡΟΜΒΟΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-310-080","name":"LIDL GR0080 - Βότση","category":"LIDL","storeNo":"GR0080","region":"Σίνδου","regionCode":"310","city":"Βότση","address":"εθνικής αντιστάσεως","phone":"6937014728","facilityManager":"ΝΙΚΟΠΟΥΛΟΣ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΟΥΤΣΙΟΥ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΡΟΜΒΟΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-310-081","name":"LIDL GR0081 - ΑΛΕΞΑΝΔΡΟΥΠΟΛΗ-ΜΑΊΣΤΡΟΣ","category":"LIDL","storeNo":"GR0081","region":"Σίνδου","regionCode":"310","city":"ΑΛΕΞΑΝΔΡΟΥΠΟΛΗ-ΜΑΊΣΤΡΟΣ","address":"4ο χιλ.Αλεξανδρούπολης-Φερών","phone":"6937014730","facilityManager":"ΖΗΣΟΠΟΥΛΟΣ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΣΟΠΙΑΔΟΥ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΤΟΠΑΛΟΥΔΗΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-310-101","name":"LIDL GR0101 - ΝΕΑ ΗΡΑΚΛΕΙΤΣΑ","category":"LIDL","storeNo":"GR0101","region":"Σίνδου","regionCode":"310","city":"ΝΕΑ ΗΡΑΚΛΕΙΤΣΑ","address":"Μακεδονίας","phone":"6937014787","facilityManager":"ΖΗΣΟΠΟΥΛΟΣ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΣΟΠΙΑΔΟΥ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΡΟΜΒΟΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-310-138","name":"LIDL GR0138 - Δράμα-Καλλίφυτος","category":"LIDL","storeNo":"GR0138","region":"Σίνδου","regionCode":"310","city":"Δράμα-Καλλίφυτος","address":"2 χλμ.Ε.Ο.Δράμας-Καβάλας","phone":"6937014553","facilityManager":"ΖΗΣΟΠΟΥΛΟΣ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΣΟΠΙΑΔΟΥ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΡΟΜΒΟΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-310-073","name":"LIDL GR0073 - ΜΕΝΕΜΕΝΗ","category":"LIDL","storeNo":"GR0073","region":"Σίνδου","regionCode":"310","city":"ΜΕΝΕΜΕΝΗ","address":"ΜΟΝΑΣΤΗΡΙΟΥ","phone":"6937014698","facilityManager":"ΝΙΚΟΠΟΥΛΟΣ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΟΥΤΣΙΟΥ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΡΟΜΒΟΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-350-010","name":"LIDL GR0010 - Λάρισα/Άγιος Γεώργιος","category":"LIDL","storeNo":"GR0010","region":"Τρικάλων","regionCode":"350","city":"Λάρισα/Άγιος Γεώργιος","address":"Φιλαδέλφειας και Τριπόλεως και Βόλου 36α","phone":"6937014455","facilityManager":"ΑΝΑΣΤΑΣΙΑΔΗΣ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΑΝΤΙΜΙΣΑΡΗΣ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΡΟΜΒΟΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-350-017","name":"LIDL GR0017 - Βόλος/Νέα Ιωνία","category":"LIDL","storeNo":"GR0017","region":"Τρικάλων","regionCode":"350","city":"Βόλος/Νέα Ιωνία","address":"Φυτόκου 14 & Νίτσας Κολιού","phone":"6937014500","facilityManager":"ΑΝΑΣΤΑΣΙΑΔΗΣ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΑΝΤΙΜΙΣΑΡΗΣ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΠΕΤΡΟΥ","active":true,"notes":"","sites":[]},{"id":"LIDL-350-019","name":"LIDL GR0019 - Βόλος/Φερρών","category":"LIDL","storeNo":"GR0019","region":"Τρικάλων","regionCode":"350","city":"Βόλος/Φερρών","address":"Φερρών & Παγασών","phone":"6937014502","facilityManager":"ΑΝΑΣΤΑΣΙΑΔΗΣ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΑΝΤΙΜΙΣΑΡΗΣ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΠΕΤΡΟΥ","active":true,"notes":"","sites":[]},{"id":"LIDL-350-020","name":"LIDL GR0020 - Κατερίνη/Άγιος Αθανάσιος","category":"LIDL","storeNo":"GR0020","region":"Τρικάλων","regionCode":"350","city":"Κατερίνη/Άγιος Αθανάσιος","address":"1ο χλμ.Π.Ε.Ο Κατερίνης-Θεσσαλονίκης","phone":"6937014503","facilityManager":"ΖΗΣΟΠΟΥΛΟΣ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΑΝΤΙΜΙΣΑΡΗΣ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΡΟΜΒΟΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-350-023","name":"LIDL GR0023 - Καρδίτσα/Δημοκρατίας","category":"LIDL","storeNo":"GR0023","region":"Τρικάλων","regionCode":"350","city":"Καρδίτσα/Δημοκρατίας","address":"Λεωφόρος Δημοκρατίας 156","phone":"6937014514","facilityManager":"ΑΝΑΣΤΑΣΙΑΔΗΣ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΑΝΤΙΜΙΣΑΡΗΣ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΡΟΜΒΟΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-350-027","name":"LIDL GR0027 - Πτολεμαΐδα","category":"LIDL","storeNo":"GR0027","region":"Τρικάλων","regionCode":"350","city":"Πτολεμαΐδα","address":"1ο χλμ.Ε.Ο. Πτολεμαΐδας-Φλώρινας","phone":"6937014534","facilityManager":"ΖΗΣΟΠΟΥΛΟΣ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΠΑΛΑΣΚΑ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΡΟΜΒΟΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-350-031","name":"LIDL GR0031 - Φάρσαλα","category":"LIDL","storeNo":"GR0031","region":"Τρικάλων","regionCode":"350","city":"Φάρσαλα","address":"2ο χλμ.Ε.Ο.Φαρσάλων-Λάρισας","phone":"6937014542","facilityManager":"ΑΝΑΣΤΑΣΙΑΔΗΣ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΑΝΤΙΜΙΣΑΡΗΣ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΡΟΜΒΟΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-350-038","name":"LIDL GR0038 - Ελασσόνα","category":"LIDL","storeNo":"GR0038","region":"Τρικάλων","regionCode":"350","city":"Ελασσόνα","address":"Δημητρίου Ελάσσονα 2-4","phone":"6937014557","facilityManager":"ΑΝΑΣΤΑΣΙΑΔΗΣ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΑΝΤΙΜΙΣΑΡΗΣ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΡΟΜΒΟΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-350-039","name":"LIDL GR0039 - Τρίκαλα/Πύλης","category":"LIDL","storeNo":"GR0039","region":"Τρικάλων","regionCode":"350","city":"Τρίκαλα/Πύλης","address":"1ο χλμ. Τρικάλων-Πύλης","phone":"6937014560","facilityManager":"ΑΝΑΣΤΑΣΙΑΔΗΣ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΑΝΤΙΜΙΣΑΡΗΣ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΡΟΜΒΟΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-350-043","name":"LIDL GR0043 - Κέρκυρα/Αεροδρόμιο","category":"LIDL","storeNo":"GR0043","region":"Τρικάλων","regionCode":"350","city":"Κέρκυρα/Αεροδρόμιο","address":"Ρήγα Φεραίου & παράκαμψη αεροδρομίου","phone":"6937014595","facilityManager":"ΑΝΑΣΤΑΣΙΑΔΗΣ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΠΑΛΑΣΚΑ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΝΑΚΑΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-350-044","name":"LIDL GR0044 - Λάρισα/Άγιος Θωμάς","category":"LIDL","storeNo":"GR0044","region":"Τρικάλων","regionCode":"350","city":"Λάρισα/Άγιος Θωμάς","address":"1ο χλμ.Ε.Ο. Λάρισας-Ιωαννίνων","phone":"6937014606","facilityManager":"ΑΝΑΣΤΑΣΙΑΔΗΣ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΑΝΤΙΜΙΣΑΡΗΣ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΡΟΜΒΟΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-350-045","name":"LIDL GR0045 - Καστοριά","category":"LIDL","storeNo":"GR0045","region":"Τρικάλων","regionCode":"350","city":"Καστοριά","address":"Αριστάρχου & Αθ.Διάκου & Πυθαγόρα","phone":"6937014607","facilityManager":"ΖΗΣΟΠΟΥΛΟΣ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΠΑΛΑΣΚΑ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΡΟΜΒΟΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-350-051","name":"LIDL GR0051 - Σέρβια","category":"LIDL","storeNo":"GR0051","region":"Τρικάλων","regionCode":"350","city":"Σέρβια","address":"1ο χλμ.Ε.Ο.Σερβίων-Κοζάνης","phone":"6937014634","facilityManager":"ΖΗΣΟΠΟΥΛΟΣ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΠΑΛΑΣΚΑ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΡΟΜΒΟΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-350-056","name":"LIDL GR0056 - Γρεβενά","category":"LIDL","storeNo":"GR0056","region":"Τρικάλων","regionCode":"350","city":"Γρεβενά","address":"1ο χλμ.Ε.Ο.Γρεβενών-Κοζάνης","phone":"6937014641","facilityManager":"ΖΗΣΟΠΟΥΛΟΣ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΠΑΛΑΣΚΑ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΡΟΜΒΟΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-350-057","name":"LIDL GR0057 - Τρίκαλα/Δέλτα","category":"LIDL","storeNo":"GR0057","region":"Τρικάλων","regionCode":"350","city":"Τρίκαλα/Δέλτα","address":"1ο χλμ.Ε.Ο.Τρικάλων-Λάρισας","phone":"6937014644","facilityManager":"ΑΝΑΣΤΑΣΙΑΔΗΣ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΑΝΤΙΜΙΣΑΡΗΣ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΡΟΜΒΟΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-350-066","name":"LIDL GR0066 - Κοζάνη","category":"LIDL","storeNo":"GR0066","region":"Τρικάλων","regionCode":"350","city":"Κοζάνη","address":"2ο χλμ. Ε.Ο.Κοζάνης-Θεσσαλονίκης","phone":"6937014680","facilityManager":"ΖΗΣΟΠΟΥΛΟΣ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΠΑΛΑΣΚΑ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΡΟΜΒΟΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-350-070","name":"LIDL GR0070 - Άργος Ορεστικό","category":"LIDL","storeNo":"GR0070","region":"Τρικάλων","regionCode":"350","city":"Άργος Ορεστικό","address":"Μεγάλου Αλεξάνδρου 147α","phone":"6937014692","facilityManager":"ΖΗΣΟΠΟΥΛΟΣ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΠΑΛΑΣΚΑ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΡΟΜΒΟΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-350-078","name":"LIDL GR0078 - Λάρισα/Φαρσάλων","category":"LIDL","storeNo":"GR0078","region":"Τρικάλων","regionCode":"350","city":"Λάρισα/Φαρσάλων","address":"Κέκροπος 2","phone":"6937014723","facilityManager":"ΑΝΑΣΤΑΣΙΑΔΗΣ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΑΝΤΙΜΙΣΑΡΗΣ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΡΟΜΒΟΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-350-079","name":"LIDL GR0079 - Καλαμπάκα","category":"LIDL","storeNo":"GR0079","region":"Τρικάλων","regionCode":"350","city":"Καλαμπάκα","address":"Τρικάλων 156","phone":"6937014724","facilityManager":"ΑΝΑΣΤΑΣΙΑΔΗΣ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΑΝΤΙΜΙΣΑΡΗΣ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΡΟΜΒΟΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-350-089","name":"LIDL GR0089 - Αμύνταιο","category":"LIDL","storeNo":"GR0089","region":"Τρικάλων","regionCode":"350","city":"Αμύνταιο","address":"Θανάση Χατζη","phone":"6937014765","facilityManager":"ΖΗΣΟΠΟΥΛΟΣ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΠΑΛΑΣΚΑ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΡΟΜΒΟΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-350-091","name":"LIDL GR0091 - Καρδίτσα/Τρικάλων","category":"LIDL","storeNo":"GR0091","region":"Τρικάλων","regionCode":"350","city":"Καρδίτσα/Τρικάλων","address":"2ο χλμ. Καρδίτσας-Τρικάλων","phone":"6937014770","facilityManager":"ΑΝΑΣΤΑΣΙΑΔΗΣ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΑΝΤΙΜΙΣΑΡΗΣ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΡΟΜΒΟΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-350-092","name":"LIDL GR0092 - Ιωάννινα/Νέα Ζωή","category":"LIDL","storeNo":"GR0092","region":"Τρικάλων","regionCode":"350","city":"Ιωάννινα/Νέα Ζωή","address":"Αλεξάνδρου Υψηλάντη 2 & Λεωφόρος Γράμμου","phone":"6937014775","facilityManager":"ΑΝΑΣΤΑΣΙΑΔΗΣ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΠΑΛΑΣΚΑ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΝΑΚΑΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-350-097","name":"LIDL GR0097 - Λεπτοκαρυά","category":"LIDL","storeNo":"GR0097","region":"Τρικάλων","regionCode":"350","city":"Λεπτοκαρυά","address":"Ανώνυμη οδός α","phone":"6937014783","facilityManager":"ΖΗΣΟΠΟΥΛΟΣ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΑΝΤΙΜΙΣΑΡΗΣ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΡΟΜΒΟΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-350-104","name":"LIDL GR0104 - Κατερίνη/Παραλία","category":"LIDL","storeNo":"GR0104","region":"Τρικάλων","regionCode":"350","city":"Κατερίνη/Παραλία","address":"Αναπαύσεως 1","phone":"6937014789","facilityManager":"ΖΗΣΟΠΟΥΛΟΣ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΑΝΤΙΜΙΣΑΡΗΣ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΡΟΜΒΟΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-350-109","name":"LIDL GR0109 - Αγριά/ΒΟΛΟΥ","category":"LIDL","storeNo":"GR0109","region":"Τρικάλων","regionCode":"350","city":"Αγριά/ΒΟΛΟΥ","address":"Αναπαύσεως 3-5","phone":"6937014791","facilityManager":"ΑΝΑΣΤΑΣΙΑΔΗΣ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΑΝΤΙΜΙΣΑΡΗΣ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΠΕΤΡΟΥ","active":true,"notes":"","sites":[]},{"id":"LIDL-350-111","name":"LIDL GR0111 - Κέρκυρα/Λευκίμμη","category":"LIDL","storeNo":"GR0111","region":"Τρικάλων","regionCode":"350","city":"Κέρκυρα/Λευκίμμη","address":"Περιφερειακή οδός Λευκίμης","phone":"6937014792","facilityManager":"ΑΝΑΣΤΑΣΙΑΔΗΣ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΠΑΛΑΣΚΑ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΝΑΚΑΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-350-113","name":"LIDL GR0113 - Αλμυρός","category":"LIDL","storeNo":"GR0113","region":"Τρικάλων","regionCode":"350","city":"Αλμυρός","address":"Χρήστου Τσαμάνη 29 & Βόλου","phone":"6937014797","facilityManager":"ΑΝΑΣΤΑΣΙΑΔΗΣ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΑΝΤΙΜΙΣΑΡΗΣ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΠΕΤΡΟΥ","active":true,"notes":"","sites":[]},{"id":"LIDL-350-114","name":"LIDL GR0114 - Κέρκυρα/Αλυκές","category":"LIDL","storeNo":"GR0114","region":"Τρικάλων","regionCode":"350","city":"Κέρκυρα/Αλυκές","address":"3ο χλμ.Ε.Ο.Κέρκυρας-Παλαιοκαστρίτσας","phone":"6937015123","facilityManager":"ΑΝΑΣΤΑΣΙΑΔΗΣ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΠΑΛΑΣΚΑ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΝΑΚΑΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-350-130","name":"LIDL GR0130 - Τύρναβος","category":"LIDL","storeNo":"GR0130","region":"Τρικάλων","regionCode":"350","city":"Τύρναβος","address":"Ειρήνης 93-95","phone":"6932472398","facilityManager":"ΑΝΑΣΤΑΣΙΑΔΗΣ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΑΝΤΙΜΙΣΑΡΗΣ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΡΟΜΒΟΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-350-131","name":"LIDL GR0131 - Βόλος/Λαρίσης","category":"LIDL","storeNo":"GR0131","region":"Τρικάλων","regionCode":"350","city":"Βόλος/Λαρίσης","address":"Λαρίσης & Νεαπόλεως","phone":"6936749111","facilityManager":"ΑΝΑΣΤΑΣΙΑΔΗΣ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΑΝΤΙΜΙΣΑΡΗΣ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΠΕΤΡΟΥ","active":true,"notes":"","sites":[]},{"id":"LIDL-350-136","name":"LIDL GR0136 - Φλώρινα","category":"LIDL","storeNo":"GR0136","region":"Τρικάλων","regionCode":"350","city":"Φλώρινα","address":"2ο χλμ.Φλώρινας-Αρμενοχωρίου","phone":"6937014518","facilityManager":"ΖΗΣΟΠΟΥΛΟΣ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΠΑΛΑΣΚΑ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΡΟΜΒΟΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-350-155","name":"LIDL GR0155 - Ιωάννινα/ΑΝΑΤΟΛΗ","category":"LIDL","storeNo":"GR0155","region":"Τρικάλων","regionCode":"350","city":"Ιωάννινα/ΑΝΑΤΟΛΗ","address":"4ο χλμ.Ε.Ο.Ιωαννίνων-Άρτας","phone":"6937014674","facilityManager":"ΑΝΑΣΤΑΣΙΑΔΗΣ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΠΑΛΑΣΚΑ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΝΑΚΑΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-350-324","name":"LIDL GR0324 - Ιστιαία","category":"LIDL","storeNo":"GR0324","region":"Τρικάλων","regionCode":"350","city":"Ιστιαία","address":"1ο χλμ.Ιστιαίας-Χαλκίδας","phone":"6937014876","facilityManager":"ΑΝΑΣΤΑΣΙΑΔΗΣ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΑΝΤΙΜΙΣΑΡΗΣ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΒΕΡΕΝΤΖΗΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-350-331","name":"LIDL GR0331 - Λαμία/Γαλανέικα","category":"LIDL","storeNo":"GR0331","region":"Τρικάλων","regionCode":"350","city":"Λαμία/Γαλανέικα","address":"Αλύτρωτων πατρίδων 7","phone":"6937014909","facilityManager":"ΑΝΑΣΤΑΣΙΑΔΗΣ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΑΝΤΙΜΙΣΑΡΗΣ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΒΕΡΕΝΤΖΗΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-350-345","name":"LIDL GR0345 - Στυλίδα","category":"LIDL","storeNo":"GR0345","region":"Τρικάλων","regionCode":"350","city":"Στυλίδα","address":"Λαμίας & Γ.Παπανδρέου & Πολυτεχνίου","phone":"6937014927","facilityManager":"ΑΝΑΣΤΑΣΙΑΔΗΣ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΑΝΤΙΜΙΣΑΡΗΣ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΒΕΡΕΝΤΖΗΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-350-820","name":"LIDL GR0820 - Πρέβεζα","category":"LIDL","storeNo":"GR0820","region":"Τρικάλων","regionCode":"350","city":"Πρέβεζα","address":"3ο χλμ.Ε.Ο.Πρέβεζας-Ιωαννίνων","phone":"6937015148","facilityManager":"ΑΝΑΣΤΑΣΙΑΔΗΣ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΠΑΛΑΣΚΑ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΝΑΚΑΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-350-823","name":"LIDL GR0823 - Ηγουμενίτσα","category":"LIDL","storeNo":"GR0823","region":"Τρικάλων","regionCode":"350","city":"Ηγουμενίτσα","address":"2ο χλμ.Ε.Ο.Ηγουμενίτσας-Ιωαννίνων","phone":"6937015152","facilityManager":"ΑΝΑΣΤΑΣΙΑΔΗΣ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΠΑΛΑΣΚΑ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΝΑΚΑΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-350-824","name":"LIDL GR0824 - Λευκάδα","category":"LIDL","storeNo":"GR0824","region":"Τρικάλων","regionCode":"350","city":"Λευκάδα","address":"2ο χλμ.Επ.Οδού Λευκάδας-Νυδρίου","phone":"6937015153","facilityManager":"ΑΝΑΣΤΑΣΙΑΔΗΣ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΠΑΛΑΣΚΑ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΝΑΚΑΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-350-828","name":"LIDL GR0828 - Καρπενήσι","category":"LIDL","storeNo":"GR0828","region":"Τρικάλων","regionCode":"350","city":"Καρπενήσι","address":"Χαριλάου Τρικούπη 63","phone":"6937015164","facilityManager":"ΑΝΑΣΤΑΣΙΑΔΗΣ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΑΝΤΙΜΙΣΑΡΗΣ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΒΕΡΕΝΤΖΗΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-350-301","name":"LIDL GR0301 - Λιβαδειά","category":"LIDL","storeNo":"GR0301","region":"Τρικάλων","regionCode":"350","city":"Λιβαδειά","address":"Χαιρωνείας και Ρούμελης","phone":"","facilityManager":"ΑΝΑΣΤΑΣΙΑΔΗΣ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΑΝΤΙΜΙΣΑΡΗΣ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΓΟΥΝΑΡΗΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-350-312","name":"LIDL GR0312 - Θήβα","category":"LIDL","storeNo":"GR0312","region":"Τρικάλων","regionCode":"350","city":"Θήβα","address":"91° χλμ. Επαρ.Οδός Αθηνών-Λαμίας","phone":"","facilityManager":"ΑΝΑΣΤΑΣΙΑΔΗΣ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΑΝΤΙΜΙΣΑΡΗΣ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΓΟΥΝΑΡΗΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-350-347","name":"LIDL GR0347 - Νέα Αρτάκη","category":"LIDL","storeNo":"GR0347","region":"Τρικάλων","regionCode":"350","city":"Νέα Αρτάκη","address":"1ο χλμ.Ε.Ο.Νέας Αρτάκης-Ψαχνών","phone":"","facilityManager":"ΑΝΑΣΤΑΣΙΑΔΗΣ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΑΝΤΙΜΙΣΑΡΗΣ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΓΟΥΝΑΡΗΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-350-397","name":"LIDL GR0397 - Χαλκίδα/Δροσιά","category":"LIDL","storeNo":"GR0397","region":"Τρικάλων","regionCode":"350","city":"Χαλκίδα/Δροσιά","address":"Επ.Οδός Χαλκίδας-Δροσιάς","phone":"","facilityManager":"ΑΝΑΣΤΑΣΙΑΔΗΣ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΑΝΤΙΜΙΣΑΡΗΣ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΓΟΥΝΑΡΗΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-350-832","name":"LIDL GR0832 - Άρτα/Πέτα","category":"LIDL","storeNo":"GR0832","region":"Τρικάλων","regionCode":"350","city":"Άρτα/Πέτα","address":"1ο χλμ.Ε.Ο.Αρτας-Πέτα","phone":"6937015175","facilityManager":"ΑΝΑΣΤΑΣΙΑΔΗΣ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΠΑΛΑΣΚΑ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΝΑΚΑΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-340-302","name":"LIDL GR0302 - Αθήνα/Παλαιό Φάληρο","category":"LIDL","storeNo":"GR0302","region":"Αθήνας","regionCode":"340","city":"Αθήνα/Παλαιό Φάληρο","address":"Αγ.Αλεξάνδρου 57-59","phone":"","facilityManager":"ΠΑΓΩΝΗΣ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΜΗΛΙΩΝΗ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΣΑΜΑΡΑΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-340-323","name":"LIDL GR0323 - Αθήνα/Νέα Ιωνία","category":"LIDL","storeNo":"GR0323","region":"Αθήνας","regionCode":"340","city":"Αθήνα/Νέα Ιωνία","address":"Αλέκου παναγούλη 91","phone":"","facilityManager":"ΔΗΜΟΓΛΟΥ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΚΑΛΠΑΚΙΔΟΥ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΦΟΥΝΤΩΤΟΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-340-383","name":"LIDL GR0383 - Αθήνα/Αμπελόκηποι","category":"LIDL","storeNo":"GR0383","region":"Αθήνας","regionCode":"340","city":"Αθήνα/Αμπελόκηποι","address":"Σεβαστουπόλεως 133","phone":"","facilityManager":"ΔΗΜΟΓΛΟΥ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΚΑΛΠΑΚΙΔΟΥ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΑΝΔΡΕΑΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-340-303","name":"LIDL GR0303 - Αθήνα/Ανοιξη","category":"LIDL","storeNo":"GR0303","region":"Αθήνας","regionCode":"340","city":"Αθήνα/Ανοιξη","address":"Λεωφόρος Μαραθώνος 24","phone":"","facilityManager":"ΔΗΜΟΓΛΟΥ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΚΑΛΠΑΚΙΔΟΥ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΣΑΜΑΡΑΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-340-304","name":"LIDL GR0304 - Αθήνα/Ιλιον-Ραδιοφωνία","category":"LIDL","storeNo":"GR0304","region":"Αθήνας","regionCode":"340","city":"Αθήνα/Ιλιον-Ραδιοφωνία","address":"Αγ.Νικολάου 52-54","phone":"","facilityManager":"ΔΗΜΟΓΛΟΥ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΚΑΛΠΑΚΙΔΟΥ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΣΑΜΑΡΑΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-340-309","name":"LIDL GR0309 - Αθήνα/Ηράκλειο","category":"LIDL","storeNo":"GR0309","region":"Αθήνας","regionCode":"340","city":"Αθήνα/Ηράκλειο","address":"Λεωφόρος Ηρακλείου 412","phone":"","facilityManager":"ΔΗΜΟΓΛΟΥ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΚΑΛΠΑΚΙΔΟΥ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΦΟΥΝΤΩΤΟΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-340-316","name":"LIDL GR0316 - Αθήνα/Μελίσσια","category":"LIDL","storeNo":"GR0316","region":"Αθήνας","regionCode":"340","city":"Αθήνα/Μελίσσια","address":"Λεωφόρος Δημοκρατίας 4-6","phone":"","facilityManager":"ΔΗΜΟΓΛΟΥ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΚΑΛΠΑΚΙΔΟΥ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΦΟΥΝΤΩΤΟΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-340-322","name":"LIDL GR0322 - Αθήνα/Μενίδι-Δημοκρατίας","category":"LIDL","storeNo":"GR0322","region":"Αθήνας","regionCode":"340","city":"Αθήνα/Μενίδι-Δημοκρατίας","address":"Λεωφόρος Δημοκρατίας 216","phone":"","facilityManager":"ΔΗΜΟΓΛΟΥ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΚΑΛΠΑΚΙΔΟΥ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΣΑΜΑΡΑΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-340-327","name":"LIDL GR0327 - Αθήνα/Δραπετσώνα","category":"LIDL","storeNo":"GR0327","region":"Αθήνας","regionCode":"340","city":"Αθήνα/Δραπετσώνα","address":"Εθνικής αντίστασης 4","phone":"","facilityManager":"ΠΑΓΩΝΗΣ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΜΗΛΙΩΝΗ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΦΟΥΝΤΩΤΟΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-340-329","name":"LIDL GR0329 - Αθήνα/Ανω Λιόσια","category":"LIDL","storeNo":"GR0329","region":"Αθήνας","regionCode":"340","city":"Αθήνα/Ανω Λιόσια","address":"Κρητικού Πελάγους 26","phone":"","facilityManager":"ΔΗΜΟΓΛΟΥ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΚΑΛΠΑΚΙΔΟΥ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΣΑΜΑΡΑΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-340-330","name":"LIDL GR0330 - Αθήνα/Περιστέρι-Κηφισού","category":"LIDL","storeNo":"GR0330","region":"Αθήνας","regionCode":"340","city":"Αθήνα/Περιστέρι-Κηφισού","address":"Κων/πολεως 1 & Λεωφ.Κηφισού","phone":"","facilityManager":"ΠΑΓΩΝΗΣ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΜΗΛΙΩΝΗ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΦΟΥΝΤΩΤΟΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-340-334","name":"LIDL GR0334 - Αθήνα/Ρέντης-Θηβών 226","category":"LIDL","storeNo":"GR0334","region":"Αθήνας","regionCode":"340","city":"Αθήνα/Ρέντης-Θηβών 226","address":"Θηβών 226 & Παρνασσού","phone":"","facilityManager":"ΠΑΓΩΝΗΣ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΜΗΛΙΩΝΗ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΦΟΥΝΤΩΤΟΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-340-337","name":"LIDL GR0337 - Αθήνα/Πειραιάς-Θηβών","category":"LIDL","storeNo":"GR0337","region":"Αθήνας","regionCode":"340","city":"Αθήνα/Πειραιάς-Θηβών","address":"Θηβών 40","phone":"","facilityManager":"ΠΑΓΩΝΗΣ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΜΗΛΙΩΝΗ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΦΟΥΝΤΩΤΟΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-340-339","name":"LIDL GR0339 - Αθήνα/Μεταμόρφωση","category":"LIDL","storeNo":"GR0339","region":"Αθήνας","regionCode":"340","city":"Αθήνα/Μεταμόρφωση","address":"14 χλμ.Ε.Ο Αθηνών-Λαμίας","phone":"","facilityManager":"ΔΗΜΟΓΛΟΥ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΚΑΛΠΑΚΙΔΟΥ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΣΑΜΑΡΑΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-340-364","name":"LIDL GR0364 - Αθήνα/Νέος Κόσμος","category":"LIDL","storeNo":"GR0364","region":"Αθήνας","regionCode":"340","city":"Αθήνα/Νέος Κόσμος","address":"Φρειδερίκου Σμίθ 37 & Χέλντραιχ","phone":"","facilityManager":"ΔΗΜΟΓΛΟΥ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΚΑΛΠΑΚΙΔΟΥ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΣΑΜΑΡΑΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-340-365","name":"LIDL GR0365 - Αττική/Παιανία","category":"LIDL","storeNo":"GR0365","region":"Αθήνας","regionCode":"340","city":"Αττική/Παιανία","address":"Λεωφόρος Λαυρίου 56-58","phone":"","facilityManager":"ΚΑΛΟΝΑΚΗΣ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΜΗΛΙΩΝΗ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΣΑΜΑΡΑΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-340-384","name":"LIDL GR0384 - Αθήνα/Περιστέρι-Τζ.Κέννεντυ","category":"LIDL","storeNo":"GR0384","region":"Αθήνας","regionCode":"340","city":"Αθήνα/Περιστέρι-Τζ.Κέννεντυ","address":"Τζων Κέννεντυ 148","phone":"","facilityManager":"ΠΑΓΩΝΗΣ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΜΗΛΙΩΝΗ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΦΟΥΝΤΩΤΟΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-340-385","name":"LIDL GR0385 - Αθήνα/Ανω Πατήσια","category":"LIDL","storeNo":"GR0385","region":"Αθήνας","regionCode":"340","city":"Αθήνα/Ανω Πατήσια","address":"Πατησίων 318-320","phone":"","facilityManager":"ΔΗΜΟΓΛΟΥ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΚΑΛΠΑΚΙΔΟΥ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΑΝΔΡΕΑΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-340-386","name":"LIDL GR0386 - Αθήνα/Βριλήσσια","category":"LIDL","storeNo":"GR0386","region":"Αθήνας","regionCode":"340","city":"Αθήνα/Βριλήσσια","address":"Τενέδου & Θράκης 1-3","phone":"","facilityManager":"ΔΗΜΟΓΛΟΥ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΚΑΛΠΑΚΙΔΟΥ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΦΟΥΝΤΩΤΟΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-340-391","name":"LIDL GR0391 - Αθήνα/Μενίδι-Θρακομακεδόνων","category":"LIDL","storeNo":"GR0391","region":"Αθήνας","regionCode":"340","city":"Αθήνα/Μενίδι-Θρακομακεδόνων","address":"Λεωφ.Θρακομακεδόνων 42 & Ι.Βρεττού","phone":"","facilityManager":"ΔΗΜΟΓΛΟΥ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΚΑΛΠΑΚΙΔΟΥ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΣΑΜΑΡΑΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-340-393","name":"LIDL GR0393 - Αθήνα/Ελληνικό","category":"LIDL","storeNo":"GR0393","region":"Αθήνας","regionCode":"340","city":"Αθήνα/Ελληνικό","address":"Αθ.Διάκου 29Α & Χρ.Τραπεζούντος","phone":"","facilityManager":"ΠΑΓΩΝΗΣ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΜΗΛΙΩΝΗ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΣΑΜΑΡΑΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-340-396","name":"LIDL GR0396 - Αθήνα/Παλαιό Φάληρο-Ιάσωνος","category":"LIDL","storeNo":"GR0396","region":"Αθήνας","regionCode":"340","city":"Αθήνα/Παλαιό Φάληρο-Ιάσωνος","address":"Ιάσωνος 6","phone":"","facilityManager":"ΠΑΓΩΝΗΣ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΜΗΛΙΩΝΗ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΣΑΜΑΡΑΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-340-400","name":"LIDL GR0400 - Αθήνα/Χαϊδάρι","category":"LIDL","storeNo":"GR0400","region":"Αθήνας","regionCode":"340","city":"Αθήνα/Χαϊδάρι","address":"Λεωφ.Αθηνών 253,Πελοποννήσου & Δόξης","phone":"","facilityManager":"ΠΑΓΩΝΗΣ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΜΗΛΙΩΝΗ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΦΟΥΝΤΩΤΟΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-340-403","name":"LIDL GR0403 - Αττική/Νέα Μάκρη","category":"LIDL","storeNo":"GR0403","region":"Αθήνας","regionCode":"340","city":"Αττική/Νέα Μάκρη","address":"Λεωφ.Μαραθώνος 227 & Θησέως","phone":"","facilityManager":"ΚΑΛΟΝΑΚΗΣ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΜΗΛΙΩΝΗ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΣΑΜΑΡΑΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-340-407","name":"LIDL GR0407 - Αθήνα/Λυκόβρηση","category":"LIDL","storeNo":"GR0407","region":"Αθήνας","regionCode":"340","city":"Αθήνα/Λυκόβρηση","address":"Γρ.Λαμπράκη 23 & Θησέως 13","phone":"","facilityManager":"ΔΗΜΟΓΛΟΥ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΚΑΛΠΑΚΙΔΟΥ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΦΟΥΝΤΩΤΟΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-340-700","name":"LIDL GR0700 - Ρόδος/Λίνδου","category":"LIDL","storeNo":"GR0700","region":"Αθήνας","regionCode":"340","city":"Ρόδος/Λίνδου","address":"5ο χλμ.Ρόδου-Λίνδου","phone":"","facilityManager":"ΔΗΜΟΓΛΟΥ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΚΑΛΠΑΚΙΔΟΥ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΣΤΕΦΑΝΟΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-340-319","name":"LIDL GR0319 - Αθήνα/Φιλαδέλφεια","category":"LIDL","storeNo":"GR0319","region":"Αθήνας","regionCode":"340","city":"Αθήνα/Φιλαδέλφεια","address":"Ροδόπης 2","phone":"","facilityManager":"ΔΗΜΟΓΛΟΥ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΚΑΛΠΑΚΙΔΟΥ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΑΝΔΡΕΑΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-340-361","name":"LIDL GR0361 - Αττική/Πόρτο Ράφτη","category":"LIDL","storeNo":"GR0361","region":"Αθήνας","regionCode":"340","city":"Αττική/Πόρτο Ράφτη","address":"2ο χλμ.Λεωφόρος Πόρτο Ράφτη","phone":"","facilityManager":"ΚΑΛΟΝΑΚΗΣ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΜΗΛΙΩΝΗ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΣΑΜΑΡΑΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-340-320","name":"LIDL GR0320 - Αττική/Κορωπί","category":"LIDL","storeNo":"GR0320","region":"Αθήνας","regionCode":"340","city":"Αττική/Κορωπί","address":"Βασιλέως Κωνσταντίνου 20","phone":"","facilityManager":"ΚΑΛΟΝΑΚΗΣ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΜΗΛΙΩΝΗ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΣΑΜΑΡΑΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-340-328","name":"LIDL GR0328 - Αθήνα/Αργυρούπολη","category":"LIDL","storeNo":"GR0328","region":"Αθήνας","regionCode":"340","city":"Αθήνα/Αργυρούπολη","address":"Λεωφόρος Αλίμου 79","phone":"","facilityManager":"ΠΑΓΩΝΗΣ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΜΗΛΙΩΝΗ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΣΑΜΑΡΑΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-340-333","name":"LIDL GR0333 - Αττική/Μαρκόπουλο","category":"LIDL","storeNo":"GR0333","region":"Αθήνας","regionCode":"340","city":"Αττική/Μαρκόπουλο","address":"Περιφερειακή οδός Μαρκόπουλου","phone":"","facilityManager":"ΚΑΛΟΝΑΚΗΣ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΜΗΛΙΩΝΗ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΣΑΜΑΡΑΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-340-341","name":"LIDL GR0341 - Αθήνα/Αγιος Δημήτριος","category":"LIDL","storeNo":"GR0341","region":"Αθήνας","regionCode":"340","city":"Αθήνα/Αγιος Δημήτριος","address":"Λεωφ.Βουλιαγμένης 323-325","phone":"","facilityManager":"ΠΑΓΩΝΗΣ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΜΗΛΙΩΝΗ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΣΑΜΑΡΑΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-340-343","name":"LIDL GR0343 - Αθήνα/Αιγάλεω-Ιερά Οδός","category":"LIDL","storeNo":"GR0343","region":"Αθήνας","regionCode":"340","city":"Αθήνα/Αιγάλεω-Ιερά Οδός","address":"Ιερά Οδός 319 & Ψαρρών","phone":"","facilityManager":"ΠΑΓΩΝΗΣ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΜΗΛΙΩΝΗ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΦΟΥΝΤΩΤΟΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-340-344","name":"LIDL GR0344 - Αθήνα/Βύρωνας","category":"LIDL","storeNo":"GR0344","region":"Αθήνας","regionCode":"340","city":"Αθήνα/Βύρωνας","address":"Αγίας Σοφίας 65 & Κωνσταντινουπόλεως","phone":"","facilityManager":"ΔΗΜΟΓΛΟΥ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΚΑΛΠΑΚΙΔΟΥ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΣΑΜΑΡΑΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-340-338","name":"LIDL GR0338 - Αθήνα/Ταύρος","category":"LIDL","storeNo":"GR0338","region":"Αθήνας","regionCode":"340","city":"Αθήνα/Ταύρος","address":"Πέτρου Ράλλη 21","phone":"","facilityManager":"ΠΑΓΩΝΗΣ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΜΗΛΙΩΝΗ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΦΟΥΝΤΩΤΟΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-340-314","name":"LIDL GR0314 - Αθήνα/Παγκράτι","category":"LIDL","storeNo":"GR0314","region":"Αθήνας","regionCode":"340","city":"Αθήνα/Παγκράτι","address":"Υμηττού 108-110","phone":"","facilityManager":"ΔΗΜΟΓΛΟΥ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΚΑΛΠΑΚΙΔΟΥ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΣΑΜΑΡΑΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-340-409","name":"LIDL GR0409 - Αθήνα/Ρέντης-Πειραιώς","category":"LIDL","storeNo":"GR0409","region":"Αθήνας","regionCode":"340","city":"Αθήνα/Ρέντης-Πειραιώς","address":"Λεωφ.Πειραιώς 161-165 & Φλέμινγκ","phone":"","facilityManager":"ΠΑΓΩΝΗΣ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΜΗΛΙΩΝΗ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΦΟΥΝΤΩΤΟΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-340-085","name":"LIDL GR0085 - Σάμος","category":"LIDL","storeNo":"GR0085","region":"Αθήνας","regionCode":"340","city":"Σάμος","address":"4ο χλμ. Σάμου-Πυθαγορείου","phone":"","facilityManager":"ΠΑΓΩΝΗΣ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΜΗΛΙΩΝΗ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΣΟΥΡΡΗΣ ΣΤΑΥΡΟΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-340-351","name":"LIDL GR0351 - Αττική/Κερατέα","category":"LIDL","storeNo":"GR0351","region":"Αθήνας","regionCode":"340","city":"Αττική/Κερατέα","address":"Λεωφόρος Σουνίου 7","phone":"","facilityManager":"ΚΑΛΟΝΑΚΗΣ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΜΗΛΙΩΝΗ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΣΑΜΑΡΑΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-340-321","name":"LIDL GR0321 - Αττική/Σπάτα","category":"LIDL","storeNo":"GR0321","region":"Αθήνας","regionCode":"340","city":"Αττική/Σπάτα","address":"Χρήστου Μπέκα & Ηλία Μπερτόλη","phone":"","facilityManager":"ΚΑΛΟΝΑΚΗΣ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΜΗΛΙΩΝΗ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΣΑΜΑΡΑΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-340-353","name":"LIDL GR0353 - Αθήνα/Περισσός","category":"LIDL","storeNo":"GR0353","region":"Αθήνας","regionCode":"340","city":"Αθήνα/Περισσός","address":"Γ.Αβέρωφ 36 & Μακελαράκη","phone":"","facilityManager":"ΧΡΙΣΤΟΠΟΥΛΟΥ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΚΑΛΠΑΚΙΔΟΥ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΦΟΥΝΤΩΤΟΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-340-722","name":"LIDL GR0722 - ΣΥΡΟΣ","category":"LIDL","storeNo":"GR0722","region":"Αθήνας","regionCode":"340","city":"ΣΥΡΟΣ","address":"Ηρώων Πολυτεχνείου 32","phone":"","facilityManager":"ΠΑΓΩΝΗΣ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΜΗΛΙΩΝΗ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΜΑΝΔΥΛΑΡΑΣ ΧΡΗΣΤΟΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-380-807","name":"LIDL GR0807 - Πάτρας/Ιωνίας","category":"LIDL","storeNo":"GR0807","region":"Πάτρας","regionCode":"380","city":"Πάτρας/Ιωνίας","address":"Ιωνίας & Γοργοποτάμου 8","phone":"6937015124","facilityManager":"ΧΡΙΣΤΟΠΟΥΛΟΥ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΠΑΠΑΣΠΥΡΟΥ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΜΠΑΙΛΟΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-380-808","name":"LIDL GR0808 - Αίγιο","category":"LIDL","storeNo":"GR0808","region":"Πάτρας","regionCode":"380","city":"Αίγιο","address":"Κορίνθου 100","phone":"6937015125","facilityManager":"ΧΡΙΣΤΟΠΟΥΛΟΥ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΠΑΠΑΣΠΥΡΟΥ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΜΠΑΙΛΟΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-380-812","name":"LIDL GR0812 - Καλαμάτα/Νέα είσοδος","category":"LIDL","storeNo":"GR0812","region":"Πάτρας","regionCode":"380","city":"Καλαμάτα/Νέα είσοδος","address":"Ηρώων Πολυτεχνείου(νέα είσοδος)","phone":"6937015138","facilityManager":"ΧΡΙΣΤΟΠΟΥΛΟΥ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΠΑΠΑΣΠΥΡΟΥ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΜΠΑΙΛΟΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-380-819","name":"LIDL GR0819 - Κυπαρισσία","category":"LIDL","storeNo":"GR0819","region":"Πάτρας","regionCode":"380","city":"Κυπαρισσία","address":"2ο χλμ.Ε.Ο. Κυπαρισσίας - Πύργου","phone":"6937015146","facilityManager":"ΧΡΙΣΤΟΠΟΥΛΟΥ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΠΑΠΑΣΠΥΡΟΥ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΜΠΑΙΛΟΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-380-827","name":"LIDL GR0827 - Κρανίδι","category":"LIDL","storeNo":"GR0827","region":"Πάτρας","regionCode":"380","city":"Κρανίδι","address":"1ο χλμ.Κρανιδίου-Ναυπλίου","phone":"6937015163","facilityManager":"ΧΡΙΣΤΟΠΟΥΛΟΥ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΠΑΠΑΣΠΥΡΟΥ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΚΑΠΕΤΑΝΟΠΟΥΛΟΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-380-830","name":"LIDL GR0830 - Αγρίνιο/Αγιος Κωνσταντίνος","category":"LIDL","storeNo":"GR0830","region":"Πάτρας","regionCode":"380","city":"Αγρίνιο/Αγιος Κωνσταντίνος","address":"Μεγάλης Χώρας","phone":"6937015170","facilityManager":"ΧΡΙΣΤΟΠΟΥΛΟΥ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΠΑΠΑΣΠΥΡΟΥ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΜΠΑΙΛΟΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-380-835","name":"LIDL GR0835 - Ναύπλιο","category":"LIDL","storeNo":"GR0835","region":"Πάτρας","regionCode":"380","city":"Ναύπλιο","address":"Λεωφόρος Ασκληπιού 36","phone":"6937015184","facilityManager":"ΧΡΙΣΤΟΠΟΥΛΟΥ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΠΑΠΑΣΠΥΡΟΥ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΚΑΠΕΤΑΝΟΠΟΥΛΟΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-380-801","name":"LIDL GR0801 - Πύργος","category":"LIDL","storeNo":"GR0801","region":"Πάτρας","regionCode":"380","city":"Πύργος","address":"Αλφειού 23","phone":"6937015118","facilityManager":"ΧΡΙΣΤΟΠΟΥΛΟΥ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΠΑΠΑΣΠΥΡΟΥ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΜΠΑΙΛΟΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-380-841","name":"LIDL GR0841 - Ρίο/Ακταίο","category":"LIDL","storeNo":"GR0841","region":"Πάτρας","regionCode":"380","city":"Ρίο/Ακταίο","address":"Καραϊσκάκη & Π.Ε.Ο.Κορίνθου Πατρών","phone":"6932472371","facilityManager":"ΧΡΙΣΤΟΠΟΥΛΟΥ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΠΑΠΑΣΠΥΡΟΥ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΜΠΑΙΛΟΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-380-816","name":"LIDL GR0816 - Αγρίνιο/Θέρμου","category":"LIDL","storeNo":"GR0816","region":"Πάτρας","regionCode":"380","city":"Αγρίνιο/Θέρμου","address":"2ο χλμ.Αγρινίου-Θέρμου","phone":"6937015143","facilityManager":"ΧΡΙΣΤΟΠΟΥΛΟΥ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΠΑΠΑΣΠΥΡΟΥ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΜΠΑΙΛΟΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-380-817","name":"LIDL GR0817 - Πάτρα/Νοταρά","category":"LIDL","storeNo":"GR0817","region":"Πάτρας","regionCode":"380","city":"Πάτρα/Νοταρά","address":"Νοταρά 9","phone":"6937015144","facilityManager":"ΧΡΙΣΤΟΠΟΥΛΟΥ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΠΑΠΑΣΠΥΡΟΥ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΜΠΑΙΛΟΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-380-810","name":"LIDL GR0810 - Ναύπακτος","category":"LIDL","storeNo":"GR0810","region":"Πάτρας","regionCode":"380","city":"Ναύπακτος","address":"1ο χλμ.Ε.Ο.Ναυπάκτου-Αντιρρίου","phone":"6937015129","facilityManager":"ΧΡΙΣΤΟΠΟΥΛΟΥ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΠΑΠΑΣΠΥΡΟΥ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΜΠΑΙΛΟΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-380-821","name":"LIDL GR0821 - Κόρινθος","category":"LIDL","storeNo":"GR0821","region":"Πάτρας","regionCode":"380","city":"Κόρινθος","address":"1ο χλμ.Κορίνθου-Εξαμιλίων","phone":"6937015149","facilityManager":"ΧΡΙΣΤΟΠΟΥΛΟΥ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΠΑΠΑΣΠΥΡΟΥ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΚΑΠΕΤΑΝΟΠΟΥΛΟΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-380-822","name":"LIDL GR0822 - Κιάτο","category":"LIDL","storeNo":"GR0822","region":"Πάτρας","regionCode":"380","city":"Κιάτο","address":"1ο χλμ.Π.Ε.Ο.Κιάτου-Κορίνθου","phone":"6937015151","facilityManager":"ΧΡΙΣΤΟΠΟΥΛΟΥ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΠΑΠΑΣΠΥΡΟΥ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΚΑΠΕΤΑΝΟΠΟΥΛΟΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-380-825","name":"LIDL GR0825 - Ζάκυνθος","category":"LIDL","storeNo":"GR0825","region":"Πάτρας","regionCode":"380","city":"Ζάκυνθος","address":"3ο χλμ.35ης Ε.Ο.Ζακύνθου-Κερίου","phone":"6937015155","facilityManager":"ΧΡΙΣΤΟΠΟΥΛΟΥ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΠΑΠΑΣΠΥΡΟΥ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΜΠΑΙΛΟΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-380-701","name":"LIDL GR0701 - Κρήτη/Χανιά-Μουρνιών","category":"LIDL","storeNo":"GR0701","region":"Πάτρας","regionCode":"380","city":"Κρήτη/Χανιά-Μουρνιών","address":"Λεωφόρος Μουρνιών 53","phone":"6937015011","facilityManager":"ΚΑΛΟΝΑΚΗΣ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΠΑΠΑΣΠΥΡΟΥ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΠΟΥΛΟΡΙΝΑΚΗΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-380-706","name":"LIDL GR0706 - Κρήτη/Χανιά-Απόστολοι","category":"LIDL","storeNo":"GR0706","region":"Πάτρας","regionCode":"380","city":"Κρήτη/Χανιά-Απόστολοι","address":"Κόμβος Αγίων Αποστόλων","phone":"6937015055","facilityManager":"ΚΑΛΟΝΑΚΗΣ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΠΑΠΑΣΠΥΡΟΥ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΠΟΥΛΟΡΙΝΑΚΗΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-380-720","name":"LIDL GR0720 - Κρήτη/Χερσόνησος","category":"LIDL","storeNo":"GR0720","region":"Πάτρας","regionCode":"380","city":"Κρήτη/Χερσόνησος","address":"25ο χλμ.Π.Ε.Ο.Ηρακλείου-Αγ.Νικολάου","phone":"6937015094","facilityManager":"ΚΑΛΟΝΑΚΗΣ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΠΑΠΑΣΠΥΡΟΥ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΠΟΥΛΟΡΙΝΑΚΗΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-380-721","name":"LIDL GR0721 - Κρήτη/Ιεράπετρα","category":"LIDL","storeNo":"GR0721","region":"Πάτρας","regionCode":"380","city":"Κρήτη/Ιεράπετρα","address":"Κωνσταντίνου Καραμανλή 5","phone":"6978990683","facilityManager":"ΚΑΛΟΝΑΚΗΣ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΠΑΠΑΣΠΥΡΟΥ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΠΟΥΛΟΡΙΝΑΚΗΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-380-711","name":"LIDL GR0711 - Κρήτη/Χανιά-Πλατανιάς","category":"LIDL","storeNo":"GR0711","region":"Πάτρας","regionCode":"380","city":"Κρήτη/Χανιά-Πλατανιάς","address":"Π.Ε.Ο. Χανίων-Κισσάμου","phone":"6932472384","facilityManager":"ΚΑΛΟΝΑΚΗΣ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΠΑΠΑΣΠΥΡΟΥ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΠΟΥΛΟΡΙΝΑΚΗΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-380-840","name":"LIDL GR0840 - Ασσος Κορινθίας","category":"LIDL","storeNo":"GR0840","region":"Πάτρας","regionCode":"380","city":"Ασσος Κορινθίας","address":"96ο χλμ.Π.Ε.Ο.Κορίνθου","phone":"6937068294","facilityManager":"ΧΡΙΣΤΟΠΟΥΛΟΥ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΠΑΠΑΣΠΥΡΟΥ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΚΑΠΕΤΑΝΟΠΟΥΛΟΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-380-405","name":"LIDL GR0405 - Σαλαμίνα","category":"LIDL","storeNo":"GR0405","region":"Πάτρας","regionCode":"380","city":"Σαλαμίνα","address":"Λεωφόρος Αιαντείου 70","phone":"6979-790146","facilityManager":"ΧΡΙΣΤΟΠΟΥΛΟΥ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΠΑΠΑΣΠΥΡΟΥ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΦΟΥΝΤΩΤΟΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-380-048","name":"LIDL GR0048 - Κρήτη/Ρέθυμνο-Ατσιπόπουλο","category":"LIDL","storeNo":"GR0048","region":"Πάτρας","regionCode":"380","city":"Κρήτη/Ρέθυμνο-Ατσιπόπουλο","address":"","phone":"6937014610","facilityManager":"ΚΑΛΟΝΑΚΗΣ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΠΑΠΑΣΠΥΡΟΥ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΠΟΥΛΟΡΙΝΑΚΗΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-380-305","name":"LIDL GR0305 - Αττική/Ασπρόπυργος","category":"LIDL","storeNo":"GR0305","region":"Πάτρας","regionCode":"380","city":"Αττική/Ασπρόπυργος","address":"Φυλής και Θρασύβουλου 1","phone":"6937014835","facilityManager":"ΧΡΙΣΤΟΠΟΥΛΟΥ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΠΑΠΑΣΠΥΡΟΥ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΦΟΥΝΤΩΤΟΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-380-313","name":"LIDL GR0313 - Αττική/Μέγαρα","category":"LIDL","storeNo":"GR0313","region":"Πάτρας","regionCode":"380","city":"Αττική/Μέγαρα","address":"42ο χλμ.Παλαιά οδός Αθηνών-Κορίνθου","phone":"6937014850","facilityManager":"ΧΡΙΣΤΟΠΟΥΛΟΥ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΠΑΠΑΣΠΥΡΟΥ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΦΟΥΝΤΩΤΟΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-380-703","name":"LIDL GR0703 - Κρήτη/Ρέθυμνο-Πλατανιάς","category":"LIDL","storeNo":"GR0703","region":"Πάτρας","regionCode":"380","city":"Κρήτη/Ρέθυμνο-Πλατανιάς","address":"Σάμου 17","phone":"6937015022","facilityManager":"ΚΑΛΟΝΑΚΗΣ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΠΑΠΑΣΠΥΡΟΥ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΠΟΥΛΟΡΙΝΑΚΗΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-380-826","name":"LIDL GR0826 - Αργος","category":"LIDL","storeNo":"GR0826","region":"Πάτρας","regionCode":"380","city":"Αργος","address":"Αργους-Ιναχου","phone":"6937015156","facilityManager":"ΧΡΙΣΤΟΠΟΥΛΟΥ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΠΑΠΑΣΠΥΡΟΥ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΚΑΠΕΤΑΝΟΠΟΥΛΟΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-380-836","name":"LIDL GR0836 - ΠΑΤΡΑ","category":"LIDL","storeNo":"GR0836","region":"Πάτρας","regionCode":"380","city":"ΠΑΤΡΑ","address":"Πατρών Κλάους","phone":"6937015188","facilityManager":"ΧΡΙΣΤΟΠΟΥΛΟΥ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΠΑΠΑΣΠΥΡΟΥ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΜΠΑΙΛΟΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-380-058","name":"LIDL GR0058 - Κρήτη/Μοίρες","category":"LIDL","storeNo":"GR0058","region":"Πάτρας","regionCode":"380","city":"Κρήτη/Μοίρες","address":"1ο χλμ.Μοίρες-Ηράκλειο","phone":"6937014646","facilityManager":"ΚΑΛΟΝΑΚΗΣ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΠΑΠΑΣΠΥΡΟΥ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΠΟΥΛΟΡΙΝΑΚΗΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-380-837","name":"LIDL GR0837 - Πάτρα παραλία","category":"LIDL","storeNo":"GR0837","region":"Πάτρας","regionCode":"380","city":"Πάτρα παραλία","address":"Π.Ε.Ο Πατρών-Πύργου","phone":"6937015192","facilityManager":"ΧΡΙΣΤΟΠΟΥΛΟΥ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΠΑΠΑΣΠΥΡΟΥ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΜΠΑΙΛΟΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-380-366","name":"LIDL GR0366 - Γέρακας","category":"LIDL","storeNo":"GR0366","region":"Πάτρας","regionCode":"380","city":"Γέρακας","address":"Λεωφόρος Μαραθώνος 100-102","phone":"","facilityManager":"ΔΗΜΟΓΛΟΥ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΠΑΠΑΣΠΥΡΟΥ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΦΟΥΝΤΩΤΟΣ","active":true,"notes":"","sites":[]},{"id":"LIDL-310-095","name":"LIDL GR0095 - Ιερισσός","category":"LIDL","storeNo":"GR0095","region":"Σίνδου","regionCode":"310","city":"Ιερισσός","address":"1 χλμ. Ιερισσού-Γοματίου","phone":"6937014781","facilityManager":"ΝΙΚΟΠΟΥΛΟΣ","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"ΟΥΤΣΙΟΥ","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΡΟΜΒΟΣ","active":true,"notes":"","sites":[]}];

function lidlNorm(v){
  return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
    .replace(/ς/g,'σ').replace(/[^a-z0-9α-ω]+/g,' ').trim();
}
function mergeLidlClients(){
  let changed=false;
  LIDL_CLIENT_SEED.forEach(s=>{
    let existing=C.find(c=>c.storeNo===s.storeNo)||C.find(c=>clientKey(c.name)===clientKey(s.name));
    if(!existing){C.push({...s});changed=true;return}
    const safeFields=['category','storeNo','region','regionCode','city','address','phone','facilityManager',
      'facilityAssistant','maintenanceOwner','active'];
    safeFields.forEach(k=>{if((existing[k]===undefined||existing[k]===null||existing[k]==='')&&s[k]!==''){existing[k]=s[k];changed=true}});
    ['facilityManagerLandline','facilityManagerMobile','facilityManagerEmail','facilityAssistantLandline',
     'facilityAssistantMobile','facilityAssistantEmail'].forEach(k=>{if(existing[k]===undefined){existing[k]='';changed=true}});
  });
  if(changed)save();
}
function clientSearchText(c){
  return lidlNorm([c.name,c.storeNo,c.city,c.address,c.phone,c.region,c.facilityManager,c.facilityAssistant,c.maintenanceOwner].join(' '));
}
function quickClientMatches(q){
  let n=lidlNorm(q);
  let list=C.filter(c=>c.active!==false);
  if(!n)return list.filter(c=>c.category==='LIDL').slice(0,10);
  return list.map(c=>{
    let hay=clientSearchText(c),name=lidlNorm(c.name),store=lidlNorm(c.storeNo);
    let score=name.startsWith(n)?0:store.startsWith(n)?1:hay.split(' ').some(x=>x.startsWith(n))?2:hay.includes(n)?3:99;
    return {c,score};
  }).filter(x=>x.score<99).sort((a,b)=>a.score-b.score||a.c.name.localeCompare(b.c.name,'el')).slice(0,10).map(x=>x.c);
}
function quickClientSearch(){
  let box=$('clientQuickResults');if(!box)return;
  let q=$('jClient').value,items=quickClientMatches(q);
  box.innerHTML=items.map(c=>`<button type="button" class="client-quick-item" onclick="selectQuickClient('${String(c.id||'').replace(/'/g,"\\'")}')"><b>${esc(c.name)}</b><small>${esc([c.region,c.phone,c.maintenanceOwner].filter(Boolean).join(' • '))}</small></button>`).join('');
  box.classList.toggle('show',items.length>0);
}
function selectQuickClient(id){
  let c=C.find(x=>x.id===id);if(!c)return;
  $('jClient').value=c.name;$('clientQuickResults')?.classList.remove('show');autofillClient();
}
function renderSelectedClientInfo(c){
  let el=$('selectedClientInfo');if(!el)return;
  if(!c){el.classList.remove('show');el.innerHTML='';return}
  el.innerHTML=[
   ['Περιφέρεια',c.region],['Τηλέφωνο καταστήματος',c.phone],['Υπεύθυνος Συντήρησης',c.maintenanceOwner],
   ['Facility Manager',c.facilityManager],['FM τηλέφωνα',[c.facilityManagerLandline,c.facilityManagerMobile].filter(Boolean).join(' / ')],
   ['FM Email',c.facilityManagerEmail],['Facility Manager Assistant',c.facilityAssistant],
   ['Assistant τηλέφωνα',[c.facilityAssistantLandline,c.facilityAssistantMobile].filter(Boolean).join(' / ')],
   ['Assistant Email',c.facilityAssistantEmail]
  ].map(x=>`<div><b>${esc(x[0])}</b><span>${esc(x[1]||'—')}</span></div>`).join('');
  el.classList.add('show');
}
document.addEventListener('click',e=>{if(!e.target.closest('.client-search-wrap'))$('clientQuickResults')?.classList.remove('show')});

const _v604AutofillClient=autofillClient;
autofillClient=function(){
  let typed=($('jClient')?.value||'').trim();
  let exact=C.find(c=>clientKey(c.name)===clientKey(typed));
  if(!exact&&typed){
    let matches=quickClientMatches(typed);
    if(matches.length===1){exact=matches[0];$('jClient').value=exact.name}
  }
  _v604AutofillClient();
  let c=currentClientRecord();
  if(c){
    $('jStoreNo').value=c.storeNo||$('jStoreNo').value;
    $('jCity').value=c.city||$('jCity').value;
    $('jAddress').value=c.address||$('jAddress').value;
    $('jPhone').value=c.phone||$('jPhone').value;
  }
  renderSelectedClientInfo(c);
};

const _v604OpenJob=openJob;
openJob=function(){_v604OpenJob();renderSelectedClientInfo(null);setTimeout(()=>$('jClient')?.focus(),50)};

const _v604EditJob=editJob;
editJob=function(id){_v604EditJob(id);setTimeout(()=>renderSelectedClientInfo(currentClientRecord()),20)};

renderClients=function(){
  let q=lidlNorm($('cliSearch')?.value||'');
  let list=allClientNames().filter(c=>!q||clientSearchText(c).includes(q));
  list.sort((a,b)=>a.name.localeCompare(b.name,'el'));window.__clientsCache=list;
  $('clientsBody').innerHTML=list.length?list.map((c,i)=>{
    let st=clientStats(c.name);
    return `<tr><td><b>${esc(c.name)}</b><div class="small">${esc(c.city||'')} • ${esc(c.address||'')}</div></td>
    <td>${esc(c.region||'—')}</td><td>${esc(c.phone||'—')}</td>
    <td><b>${esc(c.facilityManager||'—')}</b><div class="small">${esc([c.facilityManagerLandline,c.facilityManagerMobile,c.facilityManagerEmail].filter(Boolean).join(' • '))}</div></td>
    <td><b>${esc(c.facilityAssistant||'—')}</b><div class="small">${esc([c.facilityAssistantLandline,c.facilityAssistantMobile,c.facilityAssistantEmail].filter(Boolean).join(' • '))}</div></td>
    <td>${esc(c.maintenanceOwner||'—')}</td><td>${st.count}</td>
    <td><div class="actions"><button class="btn light" onclick="editClientAt(${i})">✏️</button><button class="btn light" onclick="openClientHistAt(${i})">📜</button><button class="btn danger" onclick="deleteClientAt(${i})">🗑️</button></div></td></tr>`;
  }).join(''):'<tr><td colspan="8">Δεν υπάρχουν πελάτες.</td></tr>';
};

editClientAt=function(i){
  let c=window.__clientsCache[i];
  $('cliId').value=c.id||'';$('cliName').value=c.name||'';$('cliCategory').value=c.category||'';
  $('cliPhone').value=c.phone||'';$('cliEmail').value=c.email||'';$('cliVat').value=c.vat||'';
  $('cliTaxOffice').value=c.taxOffice||'';$('cliContact').value=c.contact||'';$('cliCity').value=c.city||'';
  $('cliStoreNo').value=c.storeNo||'';$('cliRegion').value=c.region||'';$('cliAddress').value=c.address||'';
  $('cliMaintenanceOwner').value=c.maintenanceOwner||'';$('cliFacilityManager').value=c.facilityManager||'';
  $('cliFMLandline').value=c.facilityManagerLandline||'';$('cliFMMobile').value=c.facilityManagerMobile||'';
  $('cliFMEmail').value=c.facilityManagerEmail||'';$('cliFacilityAssistant').value=c.facilityAssistant||'';
  $('cliFALandline').value=c.facilityAssistantLandline||'';$('cliFAMobile').value=c.facilityAssistantMobile||'';
  $('cliFAEmail').value=c.facilityAssistantEmail||'';$('cliActive').value=String(c.active!==false);
  $('cliSites').value=sitesToText(c.sites);$('cliNotes').value=c.notes||'';window.scrollTo(0,0);
};
clearClient=function(){
  ['cliId','cliName','cliPhone','cliEmail','cliVat','cliTaxOffice','cliContact','cliCity','cliStoreNo','cliAddress',
   'cliMaintenanceOwner','cliFacilityManager','cliFMLandline','cliFMMobile','cliFMEmail','cliFacilityAssistant',
   'cliFALandline','cliFAMobile','cliFAEmail','cliSites','cliNotes'].forEach(id=>{if($(id))$(id).value=''});
  $('cliCategory').value='';$('cliRegion').value='';$('cliActive').value='true';
};
saveClient=function(){
  let id=$('cliId').value,name=$('cliName').value.trim();if(!name)return alert('Συμπλήρωσε όνομα επαφής.');
  let d={name,category:$('cliCategory').value,phone:$('cliPhone').value.trim(),email:$('cliEmail').value.trim(),
    vat:$('cliVat').value.trim(),taxOffice:$('cliTaxOffice').value.trim(),contact:$('cliContact').value.trim(),
    city:$('cliCity').value.trim(),storeNo:$('cliStoreNo').value.trim(),region:$('cliRegion').value,
    address:$('cliAddress').value.trim(),maintenanceOwner:$('cliMaintenanceOwner').value.trim(),
    facilityManager:$('cliFacilityManager').value.trim(),facilityManagerLandline:$('cliFMLandline').value.trim(),
    facilityManagerMobile:$('cliFMMobile').value.trim(),facilityManagerEmail:$('cliFMEmail').value.trim(),
    facilityAssistant:$('cliFacilityAssistant').value.trim(),facilityAssistantLandline:$('cliFALandline').value.trim(),
    facilityAssistantMobile:$('cliFAMobile').value.trim(),facilityAssistantEmail:$('cliFAEmail').value.trim(),
    active:$('cliActive').value!=='false',sites:parseClientSites($('cliSites').value),notes:$('cliNotes').value.trim()};
  if(id){let x=C.find(x=>x.id===id);if(x)Object.assign(x,d)}else{
    let existing=C.find(x=>clientKey(x.name)===clientKey(name));if(existing)Object.assign(existing,d);else C.push({id:uid('CLI'),...d});
  }
  clearClient();save();render();
};

mergeLidlClients();
render();

/* v6.0.5 — Καταστήματα Μασούτης */
const MASOUTIS_CLIENT_SEED=[{"id":"MASOUTIS-107","name":"ΜΑΣΟΥΤΗΣ Νο107 - Βολγας","category":"Μασούτης","storeNo":"Νο107","region":"","regionCode":"","city":"Βολγας","address":"","phone":"","facilityManager":"","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΡΟΜΒΟΣ","active":true,"notes":"Στοιχεία διεύθυνσης και τηλεφώνου προς επιβεβαίωση.","sites":[]},{"id":"MASOUTIS-112","name":"ΜΑΣΟΥΤΗΣ Νο112 - Ελευθεριας Αμπελοκηποι","category":"Μασούτης","storeNo":"Νο112","region":"","regionCode":"","city":"Ελευθεριας Αμπελοκηποι","address":"","phone":"","facilityManager":"","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΡΟΜΒΟΣ","active":true,"notes":"Στοιχεία διεύθυνσης και τηλεφώνου προς επιβεβαίωση.","sites":[]},{"id":"MASOUTIS-176","name":"ΜΑΣΟΥΤΗΣ Νο176 - Γιαννιτσα","category":"Μασούτης","storeNo":"Νο176","region":"","regionCode":"","city":"Γιαννιτσα","address":"","phone":"","facilityManager":"","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΡΟΜΒΟΣ","active":true,"notes":"Στοιχεία διεύθυνσης και τηλεφώνου προς επιβεβαίωση.","sites":[]},{"id":"MASOUTIS-208","name":"ΜΑΣΟΥΤΗΣ Νο208 - Τρικαλα","category":"Μασούτης","storeNo":"Νο208","region":"","regionCode":"","city":"Τρικαλα","address":"","phone":"","facilityManager":"","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΡΟΜΒΟΣ","active":true,"notes":"Στοιχεία διεύθυνσης και τηλεφώνου προς επιβεβαίωση.","sites":[]},{"id":"MASOUTIS-220","name":"ΜΑΣΟΥΤΗΣ Νο220 - Βολος Νεο","category":"Μασούτης","storeNo":"Νο220","region":"","regionCode":"","city":"Βολος Νεο","address":"","phone":"","facilityManager":"","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΡΟΜΒΟΣ","active":true,"notes":"Στοιχεία διεύθυνσης και τηλεφώνου προς επιβεβαίωση.","sites":[]},{"id":"MASOUTIS-240","name":"ΜΑΣΟΥΤΗΣ Νο240 - Βολος","category":"Μασούτης","storeNo":"Νο240","region":"","regionCode":"","city":"Βολος","address":"","phone":"","facilityManager":"","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΡΟΜΒΟΣ","active":true,"notes":"Στοιχεία διεύθυνσης και τηλεφώνου προς επιβεβαίωση.","sites":[]},{"id":"MASOUTIS-272","name":"ΜΑΣΟΥΤΗΣ Νο272 - Σινδος","category":"Μασούτης","storeNo":"Νο272","region":"","regionCode":"","city":"Σινδος","address":"","phone":"","facilityManager":"","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΡΟΜΒΟΣ","active":true,"notes":"Στοιχεία διεύθυνσης και τηλεφώνου προς επιβεβαίωση.","sites":[]},{"id":"MASOUTIS-280","name":"ΜΑΣΟΥΤΗΣ Νο280 - Ναουσσα","category":"Μασούτης","storeNo":"Νο280","region":"","regionCode":"","city":"Ναουσσα","address":"","phone":"","facilityManager":"","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΡΟΜΒΟΣ","active":true,"notes":"Στοιχεία διεύθυνσης και τηλεφώνου προς επιβεβαίωση.","sites":[]},{"id":"MASOUTIS-373","name":"ΜΑΣΟΥΤΗΣ Νο373 - Πλαταμωνας","category":"Μασούτης","storeNo":"Νο373","region":"","regionCode":"","city":"Πλαταμωνας","address":"","phone":"","facilityManager":"","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΡΟΜΒΟΣ","active":true,"notes":"Στοιχεία διεύθυνσης και τηλεφώνου προς επιβεβαίωση.","sites":[]},{"id":"MASOUTIS-379","name":"ΜΑΣΟΥΤΗΣ Νο379 - Περαν Αμπελοκηποι","category":"Μασούτης","storeNo":"Νο379","region":"","regionCode":"","city":"Περαν Αμπελοκηποι","address":"","phone":"","facilityManager":"","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΡΟΜΒΟΣ","active":true,"notes":"Στοιχεία διεύθυνσης και τηλεφώνου προς επιβεβαίωση.","sites":[]},{"id":"MASOUTIS-383","name":"ΜΑΣΟΥΤΗΣ Νο383 - Επταπυργιο","category":"Μασούτης","storeNo":"Νο383","region":"","regionCode":"","city":"Επταπυργιο","address":"","phone":"","facilityManager":"","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΡΟΜΒΟΣ","active":true,"notes":"Στοιχεία διεύθυνσης και τηλεφώνου προς επιβεβαίωση.","sites":[]},{"id":"MASOUTIS-431","name":"ΜΑΣΟΥΤΗΣ Νο431 - Περδικα","category":"Μασούτης","storeNo":"Νο431","region":"","regionCode":"","city":"Περδικα","address":"","phone":"","facilityManager":"","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΡΟΜΒΟΣ","active":true,"notes":"Στοιχεία διεύθυνσης και τηλεφώνου προς επιβεβαίωση.","sites":[]},{"id":"MASOUTIS-453","name":"ΜΑΣΟΥΤΗΣ Νο453 - Κ. Βογα","category":"Μασούτης","storeNo":"Νο453","region":"","regionCode":"","city":"Κ. Βογα","address":"","phone":"","facilityManager":"","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΡΟΜΒΟΣ","active":true,"notes":"Στοιχεία διεύθυνσης και τηλεφώνου προς επιβεβαίωση.","sites":[]},{"id":"MASOUTIS-467","name":"ΜΑΣΟΥΤΗΣ Νο467 - Ολυμπιου","category":"Μασούτης","storeNo":"Νο467","region":"","regionCode":"","city":"Ολυμπιου","address":"","phone":"","facilityManager":"","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΡΟΜΒΟΣ","active":true,"notes":"Στοιχεία διεύθυνσης και τηλεφώνου προς επιβεβαίωση.","sites":[]},{"id":"MASOUTIS-469","name":"ΜΑΣΟΥΤΗΣ Νο469 - Μ. Κυριακου","category":"Μασούτης","storeNo":"Νο469","region":"","regionCode":"","city":"Μ. Κυριακου","address":"","phone":"","facilityManager":"","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΡΟΜΒΟΣ","active":true,"notes":"Στοιχεία διεύθυνσης και τηλεφώνου προς επιβεβαίωση.","sites":[]},{"id":"MASOUTIS-490","name":"ΜΑΣΟΥΤΗΣ Νο490 - Σερρες","category":"Μασούτης","storeNo":"Νο490","region":"","regionCode":"","city":"Σερρες","address":"","phone":"","facilityManager":"","facilityManagerLandline":"","facilityManagerMobile":"","facilityManagerEmail":"","facilityAssistant":"","facilityAssistantLandline":"","facilityAssistantMobile":"","facilityAssistantEmail":"","maintenanceOwner":"ΡΟΜΒΟΣ","active":true,"notes":"Στοιχεία διεύθυνσης και τηλεφώνου προς επιβεβαίωση.","sites":[]}];
function mergeMasoutisClients(){
  let changed=false;
  MASOUTIS_CLIENT_SEED.forEach(s=>{
    let existing=C.find(c=>c.id===s.id)||C.find(c=>clientKey(c.name)===clientKey(s.name));
    if(!existing){C.push({...s});changed=true;return}
    ['category','storeNo','city','address','phone','maintenanceOwner','active','notes'].forEach(k=>{
      if((existing[k]===undefined||existing[k]===null||existing[k]==='')&&s[k]!==''){existing[k]=s[k];changed=true}
    });
  });
  if(changed)save();
}
mergeMasoutisClients();
render();

/* v6.0.6 — Επίσημα στοιχεία καταστημάτων Μασούτης από Excel */
const MASOUTIS_OFFICIAL_DATA=[{"id":"MASOUTIS-373","name":"ΜΑΣΟΥΤΗΣ Νο373 - Πλαταμώνας","category":"Μασούτης","storeNo":"Νο373","city":"Πλαταμωνας","address":"25Ης Μαρτιου Και Εγνατιας","maintenanceOwner":"ΡΟΜΒΟΣ","notes":""},{"id":"MASOUTIS-453","name":"ΜΑΣΟΥΤΗΣ Νο453 - Κ. Βόγα","category":"Μασούτης","storeNo":"Νο453","city":"Θες/Νικη","address":"Κιμωνος Βογα 89","maintenanceOwner":"ΡΟΜΒΟΣ","notes":""},{"id":"MASOUTIS-107","name":"ΜΑΣΟΥΤΗΣ Νο107 - Βόλγας","category":"Μασούτης","storeNo":"Νο107","city":"Θες/Νικη","address":"Λ.Βασιλισσης Ολγας 170","maintenanceOwner":"ΡΟΜΒΟΣ","notes":""},{"id":"MASOUTIS-469","name":"ΜΑΣΟΥΤΗΣ Νο469 - Μ. Κυριακού","category":"Μασούτης","storeNo":"Νο469","city":"Θες/Νικη","address":"Μανωλακη Κυριακου 18","maintenanceOwner":"ΡΟΜΒΟΣ","notes":""},{"id":"MASOUTIS-112","name":"ΜΑΣΟΥΤΗΣ Νο112 - Ελευθερίας Αμπελόκηποι","category":"Μασούτης","storeNo":"Νο112","city":"Θες/Νικη","address":"Ελευθεριας 50,Αμπελοκηποι","maintenanceOwner":"ΡΟΜΒΟΣ","notes":""},{"id":"MASOUTIS-379","name":"ΜΑΣΟΥΤΗΣ Νο379 - Πέραν Αμπελόκηποι","category":"Μασούτης","storeNo":"Νο379","city":"Θες/Νικη","address":"Περαν 39,Αμπελοκηποι","maintenanceOwner":"ΡΟΜΒΟΣ","notes":""},{"id":"MASOUTIS-467","name":"ΜΑΣΟΥΤΗΣ Νο467 - Ολύμπου","category":"Μασούτης","storeNo":"Νο467","city":"Θες/Νικη","address":"Ολυμπου 115,Κεντρο","maintenanceOwner":"ΡΟΜΒΟΣ","notes":""},{"id":"MASOUTIS-431","name":"ΜΑΣΟΥΤΗΣ Νο431 - Πέρδικα","category":"Μασούτης","storeNo":"Νο431","city":"Θες/Νικη","address":"Περδικα","maintenanceOwner":"ΡΟΜΒΟΣ","notes":""},{"id":"MASOUTIS-176","name":"ΜΑΣΟΥΤΗΣ Νο176 - Γιαννιτσά","category":"Μασούτης","storeNo":"Νο176","city":"Γιαννιτσα","address":"Κολοκοτρωνη 13","maintenanceOwner":"ΡΟΜΒΟΣ","notes":""},{"id":"MASOUTIS-272","name":"ΜΑΣΟΥΤΗΣ Νο272 - Σίνδος","category":"Μασούτης","storeNo":"Νο272","city":"Σινδος","address":"Λεωφορος Οχι 3","maintenanceOwner":"ΡΟΜΒΟΣ","notes":""},{"id":"MASOUTIS-383","name":"ΜΑΣΟΥΤΗΣ Νο383 - Επταπύργιο","category":"Μασούτης","storeNo":"Νο383","city":"Επταπυργιο","address":"Επταπυργιου 72 Και Μεγαρων","maintenanceOwner":"ΡΟΜΒΟΣ","notes":""},{"id":"MASOUTIS-208","name":"ΜΑΣΟΥΤΗΣ Νο208 - Τρίκαλα","category":"Μασούτης","storeNo":"Νο208","city":"Τρικαλα","address":"Ελευθεριας Και Μετεωρων","maintenanceOwner":"ΡΟΜΒΟΣ","notes":""},{"id":"MASOUTIS-490","name":"ΜΑΣΟΥΤΗΣ Νο490 - Σέρρες","category":"Μασούτης","storeNo":"Νο490","city":"Σερρες","address":"Μακεδονομαχων 31","maintenanceOwner":"Κ.ΤΣΑΛΟΥΜΗΣ","notes":""},{"id":"MASOUTIS-240","name":"ΜΑΣΟΥΤΗΣ Νο240 - Βόλος","category":"Μασούτης","storeNo":"Νο240","city":"Βολος","address":"Ρηγα Φεραιου 150","maintenanceOwner":"Δ.ΠΕΤΡΟΥ","notes":""},{"id":"MASOUTIS-220","name":"ΜΑΣΟΥΤΗΣ Νο220 - Βόλος Νέο","category":"Μασούτης","storeNo":"Νο220","city":"Βολος Νεο","address":"Αχιλλοπουλου Ευαγγελου 171","maintenanceOwner":"ΡΟΜΒΟΣ","notes":""},{"id":"MASOUTIS-280","name":"ΜΑΣΟΥΤΗΣ Νο280 - Νάουσα","category":"Μασούτης","storeNo":"Νο280","city":"Ναουσσα","address":"Δημαρχιας 23","maintenanceOwner":"ΡΟΜΒΟΣ","notes":""}];
function applyOfficialMasoutisData(){
  let changed=false;
  MASOUTIS_OFFICIAL_DATA.forEach(s=>{
    let c=C.find(x=>x.id===s.id)||C.find(x=>String(x.storeNo||'').replace(/\D/g,'')===String(s.storeNo).replace(/\D/g,'')&&x.category==='Μασούτης');
    if(!c){
      C.push({
        id:s.id,name:s.name,category:'Μασούτης',storeNo:s.storeNo,region:'',regionCode:'',
        city:s.city,address:s.address,phone:'',facilityManager:'',facilityManagerLandline:'',
        facilityManagerMobile:'',facilityManagerEmail:'',facilityAssistant:'',facilityAssistantLandline:'',
        facilityAssistantMobile:'',facilityAssistantEmail:'',maintenanceOwner:s.maintenanceOwner,
        active:true,notes:s.notes,sites:[]
      });
      changed=true;
      return;
    }
    ['name','category','storeNo','city','address','maintenanceOwner','notes'].forEach(k=>{
      if(c[k]!==s[k]){c[k]=s[k];changed=true}
    });
  });
  if(changed)save();
}
applyOfficialMasoutisData();
render();

/* v6.0.7 — Ειδική καρτέλα Electra Hotels */
const ELECTRA_CLIENT_SEED=[{"id":"ELECTRA-PALACE-THESSALONIKI","name":"Electra Palace Thessaloniki","category":"Electra Hotels","city":"Θεσσαλονίκη","address":"Πλατεία Αριστοτέλους 9","phone":"2310 294040","email":"","hotelExecution":"Συνεργεία Ρόμβος","hotelSubcontractor":"","active":true},{"id":"ELECTRA-PALACE-ATHENS","name":"Electra Palace Athens","category":"Electra Hotels","city":"Αθήνα","address":"","phone":"","email":"","hotelExecution":"Συνεργεία Ρόμβος","hotelSubcontractor":"","active":true},{"id":"ELECTRA-METROPOLIS","name":"Electra Metropolis Athens","category":"Electra Hotels","city":"Αθήνα","address":"","phone":"","email":"","hotelExecution":"Υπεργολάβος","hotelSubcontractor":"Β. Γκίκας","active":true},{"id":"ELECTRA-RHYTHM","name":"Electra Rhythm Athens","category":"Electra Hotels","city":"Αθήνα","address":"","phone":"","email":"","hotelExecution":"Υπεργολάβος","hotelSubcontractor":"Β. Γκίκας","active":true},{"id":"ELECTRA-OFFICES","name":"Electra Hotels - Κεντρικά Γραφεία","category":"Electra Hotels","city":"Αθήνα","address":"","phone":"","email":"","hotelExecution":"","hotelSubcontractor":"","active":true}];

function isElectraClient(c){
  return lidlNorm(c?.category||'').includes('electra') || lidlNorm(c?.name||'').includes('electra');
}
function toggleElectraFields(){
  const box=$('electraFields');
  if(!box)return;
  const show=lidlNorm($('cliCategory')?.value||'').includes('electra')||lidlNorm($('cliName')?.value||'').includes('electra');
  box.classList.toggle('show',show);
}
function mergeElectraClients(){
  let changed=false;
  ELECTRA_CLIENT_SEED.forEach(s=>{
    let c=C.find(x=>x.id===s.id)||C.find(x=>clientKey(x.name)===clientKey(s.name));
    if(!c){
      C.push({
        id:s.id,name:s.name,category:s.category,storeNo:'',region:'',regionCode:'',
        city:s.city,address:s.address,phone:s.phone,email:s.email,vat:'',taxOffice:'',contact:'',
        facilityManager:'',facilityManagerLandline:'',facilityManagerMobile:'',facilityManagerEmail:'',
        facilityAssistant:'',facilityAssistantLandline:'',facilityAssistantMobile:'',facilityAssistantEmail:'',
        maintenanceOwner:'',active:s.active,notes:'',sites:[],
        hotelGeneralManager:'',hotelGeneralManagerPhone:'',hotelGeneralManagerEmail:'',
        hotelMaintenanceManager:'',hotelMaintenancePhone:'',hotelMaintenanceEmail:'',
        hotelExecution:s.hotelExecution,hotelSubcontractor:s.hotelSubcontractor,
        hotelSubcontractorPhone:'',hotelSubcontractorEmail:''
      });
      changed=true;return;
    }
    ['category','city','address','phone','email','hotelExecution','hotelSubcontractor'].forEach(k=>{
      if((c[k]===undefined||c[k]===null||c[k]==='')&&s[k]){c[k]=s[k];changed=true}
    });
    ['hotelGeneralManager','hotelGeneralManagerPhone','hotelGeneralManagerEmail',
     'hotelMaintenanceManager','hotelMaintenancePhone','hotelMaintenanceEmail',
     'hotelSubcontractorPhone','hotelSubcontractorEmail'].forEach(k=>{
       if(c[k]===undefined){c[k]='';changed=true}
    });
  });
  if(changed)save();
}

const _v607EditClientAt=editClientAt;
editClientAt=function(i){
  _v607EditClientAt(i);
  let c=window.__clientsCache[i];
  $('cliHotelGeneralManager').value=c.hotelGeneralManager||'';
  $('cliHotelGeneralManagerPhone').value=c.hotelGeneralManagerPhone||'';
  $('cliHotelGeneralManagerEmail').value=c.hotelGeneralManagerEmail||'';
  $('cliHotelMaintenanceManager').value=c.hotelMaintenanceManager||'';
  $('cliHotelMaintenancePhone').value=c.hotelMaintenancePhone||'';
  $('cliHotelMaintenanceEmail').value=c.hotelMaintenanceEmail||'';
  $('cliHotelExecution').value=c.hotelExecution||'';
  $('cliHotelSubcontractor').value=c.hotelSubcontractor||'';
  $('cliHotelSubcontractorPhone').value=c.hotelSubcontractorPhone||'';
  $('cliHotelSubcontractorEmail').value=c.hotelSubcontractorEmail||'';
  toggleElectraFields();
};

const _v607ClearClient=clearClient;
clearClient=function(){
  _v607ClearClient();
  ['cliHotelGeneralManager','cliHotelGeneralManagerPhone','cliHotelGeneralManagerEmail',
   'cliHotelMaintenanceManager','cliHotelMaintenancePhone','cliHotelMaintenanceEmail',
   'cliHotelSubcontractor','cliHotelSubcontractorPhone','cliHotelSubcontractorEmail']
   .forEach(id=>{if($(id))$(id).value=''});
  if($('cliHotelExecution'))$('cliHotelExecution').value='';
  toggleElectraFields();
};

const _v607SaveClient=saveClient;
saveClient=function(){
  let id=$('cliId').value;
  let name=$('cliName').value.trim();
  if(!name)return alert('Συμπλήρωσε όνομα επαφής.');

  let existing=id?C.find(x=>x.id===id):C.find(x=>clientKey(x.name)===clientKey(name));
  _v607SaveClient();

  let c=id?C.find(x=>x.id===id):C.find(x=>clientKey(x.name)===clientKey(name));
  if(c){
    c.hotelGeneralManager=$('cliHotelGeneralManager').value.trim();
    c.hotelGeneralManagerPhone=$('cliHotelGeneralManagerPhone').value.trim();
    c.hotelGeneralManagerEmail=$('cliHotelGeneralManagerEmail').value.trim();
    c.hotelMaintenanceManager=$('cliHotelMaintenanceManager').value.trim();
    c.hotelMaintenancePhone=$('cliHotelMaintenancePhone').value.trim();
    c.hotelMaintenanceEmail=$('cliHotelMaintenanceEmail').value.trim();
    c.hotelExecution=$('cliHotelExecution').value;
    c.hotelSubcontractor=$('cliHotelSubcontractor').value.trim();
    c.hotelSubcontractorPhone=$('cliHotelSubcontractorPhone').value.trim();
    c.hotelSubcontractorEmail=$('cliHotelSubcontractorEmail').value.trim();
    save();render();
  }
};

const _v607RenderSelectedClientInfo=renderSelectedClientInfo;
renderSelectedClientInfo=function(c){
  _v607RenderSelectedClientInfo(c);
  if(!c||!isElectraClient(c))return;
  let el=$('selectedClientInfo');if(!el)return;
  el.innerHTML += [
   ['Γενικός Διευθυντής',c.hotelGeneralManager],
   ['Τηλέφωνο Γεν. Διευθυντή',c.hotelGeneralManagerPhone],
   ['Υπεύθυνος Συντήρησης',c.hotelMaintenanceManager],
   ['Τηλέφωνο Συντήρησης',c.hotelMaintenancePhone],
   ['Εκτέλεση Εργασιών',c.hotelExecution],
   ['Υπεργολάβος',c.hotelSubcontractor],
   ['Τηλέφωνο Υπεργολάβου',c.hotelSubcontractorPhone]
  ].map(x=>`<div><b>${esc(x[0])}</b><span>${esc(x[1]||'—')}</span></div>`).join('');
};

document.addEventListener('input',e=>{
  if(e.target?.id==='cliName'||e.target?.id==='cliCategory')toggleElectraFields();
});

mergeElectraClients();
render();

/* v6.0.8 — Συγχώνευση διπλών πελατών και αναδιπλούμενη φόρμα */
function clientCanonicalName(v){
  return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .toLowerCase().replace(/ς/g,'σ').replace(/[^a-z0-9α-ω]+/g,' ').trim();
}
function clientStoreDigits(c){
  let s=String(c?.storeNo||'').replace(/\D/g,'');
  if(!s){
    let m=String(c?.name||'').match(/\b(?:gr|νο)?\s*0*(\d{2,4})\b/i);
    if(m)s=m[1];
  }
  return s?String(Number(s)):'';
}
function clientChain(c){
  let x=clientCanonicalName(c?.category||'');
  let n=clientCanonicalName(c?.name||'');
  if(x.includes('lidl')||n.includes('lidl'))return 'lidl';
  if(x.includes('μασουτ')||n.includes('μασουτ'))return 'masoutis';
  if(x.includes('electra')||n.includes('electra'))return 'electra';
  return x;
}
function electraAliasKey(c){
  let n=clientCanonicalName(c?.name||'');
  if(!n.includes('electra'))return '';
  if(n.includes('palace')&&n.includes('thess'))return 'electra-palace-thessaloniki';
  if(n.includes('palace')&&n.includes('ath'))return 'electra-palace-athens';
  if(n.includes('metropolis'))return 'electra-metropolis';
  if(n.includes('rhythm'))return 'electra-rhythm';
  if(n.includes('γραφ')||n.includes('office')||n.includes('κεντρ'))return 'electra-offices';
  return '';
}
function clientDuplicateKey(c){
  let chain=clientChain(c),store=clientStoreDigits(c);
  if(store&&(chain==='lidl'||chain==='masoutis'))return chain+'#'+store;
  let ea=electraAliasKey(c);if(ea)return ea;
  return 'name#'+clientCanonicalName(c?.name||'');
}
function clientCompleteness(c){
  const fields=['phone','email','address','city','region','storeNo','facilityManager','facilityAssistant',
    'maintenanceOwner','hotelGeneralManager','hotelMaintenanceManager','hotelSubcontractor'];
  let score=fields.reduce((n,k)=>n+(c?.[k]?1:0),0);
  if(/^LIDL-|^MASOUTIS-|^ELECTRA-/.test(c?.id||''))score+=10;
  return score;
}
function mergeValueInto(target,source,key){
  if((target[key]===undefined||target[key]===null||target[key]==='')&&source[key]!==undefined&&source[key]!==null&&source[key]!==''){
    target[key]=source[key];
  }
}
function mergeClientObjects(target,source){
  Object.keys(source||{}).forEach(k=>{
    if(k==='id'||k==='name'||k==='sites')return;
    mergeValueInto(target,source,k);
  });
  let sites=[...(target.sites||[]),...(source.sites||[])],seen=new Set();
  target.sites=sites.filter(s=>{
    let k=clientCanonicalName([s.storeNo,s.name,s.city,s.address].join('|'));
    if(seen.has(k))return false;seen.add(k);return true;
  });
  if(source.notes&&source.notes!==target.notes){
    target.notes=[target.notes,source.notes].filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i).join('\n');
  }
}
function mergeDuplicateClients(showResult){
  let groups=new Map();
  C.forEach(c=>{
    let key=clientDuplicateKey(c);
    if(!key||key==='name#')return;
    if(!groups.has(key))groups.set(key,[]);
    groups.get(key).push(c);
  });
  let removed=0,renamed=0;
  groups.forEach(list=>{
    if(list.length<2)return;
    list.sort((a,b)=>clientCompleteness(b)-clientCompleteness(a));
    let keeper=list[0];
    list.slice(1).forEach(dup=>{
      mergeClientObjects(keeper,dup);
      J.forEach(j=>{
        if(clientCanonicalName(j.client)===clientCanonicalName(dup.name)){
          j.client=keeper.name;renamed++;
        }
      });
      let idx=C.indexOf(dup);if(idx>=0){C.splice(idx,1);removed++}
    });
  });
  if(removed){save();render()}
  if(showResult)alert(removed?`Συγχωνεύτηκαν ${removed} διπλές εγγραφές πελατών.\nΕνημερώθηκαν ${renamed} συνδέσεις εργασιών.`:'Δεν βρέθηκαν βέβαιες διπλές εγγραφές.');
  return removed;
}
function openNewClientEditor(){
  clearClient();
  $('clientEditorTitle').textContent='Νέα επαφή';
  $('clientEditorPanel').classList.add('show');
  setTimeout(()=>$('cliName')?.focus(),30);
  window.scrollTo({top:0,behavior:'smooth'});
}
function closeClientEditor(){
  $('clientEditorPanel')?.classList.remove('show');
  clearClient();
}
const _v608EditClientAt=editClientAt;
editClientAt=function(i){
  _v608EditClientAt(i);
  $('clientEditorTitle').textContent='Επεξεργασία επαφής';
  $('clientEditorPanel').classList.add('show');
  setTimeout(()=>$('cliName')?.focus(),30);
  window.scrollTo({top:0,behavior:'smooth'});
};
const _v608SaveClient=saveClient;
saveClient=function(){
  _v608SaveClient();
  mergeDuplicateClients(false);
  closeClientEditor();
};
mergeDuplicateClients(false);
render();

/* v6.5.65 — διαγραφή μόνο της επαφής που επεξεργάζεσαι */
function updateDeleteCurrentClientButton(){
  const b=document.getElementById('deleteCurrentClientBtn');
  if(b)b.style.display=($('cliId')?.value||'')?'inline-flex':'none';
}
function deleteCurrentClient(){
  const id=$('cliId')?.value||'';
  if(!id)return;
  const c=C.find(x=>x.id===id);
  if(!c)return;
  const list=window.__clientsCache||[];
  const i=list.findIndex(x=>x.id===id);
  if(i<0){ alert('Δεν βρέθηκε η επαφή στη λίστα. Κλείσε και άνοιξέ την ξανά.'); return; }
  deleteClientAt(i);
  closeClientEditor();
}

/* v6.0.9 — Ασφαλής διαγραφή πελάτη με διπλή επιβεβαίωση */
function deleteClientAt(i){
  const c=window.__clientsCache?.[i];
  if(!c)return;

  const linkedJobs=J.filter(j=>clientCanonicalName(j.client)===clientCanonicalName(c.name));
  const jobText=linkedJobs.length
    ? `\n\nΠΡΟΣΟΧΗ: Υπάρχουν ${linkedJobs.length} συνδεδεμένες εργασίες. Οι εργασίες ΔΕΝ θα διαγραφούν, αλλά θα μείνουν χωρίς ενεργή καρτέλα πελάτη.`
    : '';

  const first=confirm(
    `Θέλεις να διαγράψεις τον πελάτη:\n\n${c.name}${jobText}`
  );
  if(!first)return;

  const second=confirm(
    `ΔΕΥΤΕΡΗ ΕΠΙΒΕΒΑΙΩΣΗ\n\nΕίσαι απολύτως σίγουρος ότι θέλεις να διαγράψεις οριστικά τον πελάτη "${c.name}";`
  );
  if(!second)return;

  const idx=C.findIndex(x=>x.id===c.id);
  if(idx<0)return;

  C.splice(idx,1);
  save();
  render();

  alert(`Ο πελάτης "${c.name}" διαγράφηκε οριστικά.`);
}






clearSimpleReminder();
renderSimpleReminders();
try{
  const _lastReminderPopup=Number(localStorage.getItem('romvos_last_reminder_popup')||0);
  if(_lastReminderPopup && Date.now()-_lastReminderPopup>60000){
    localStorage.removeItem('romvos_last_reminder_popup');
  }
}catch(e){}
setTimeout(()=>checkSimpleReminders(false),500);
setInterval(()=>checkSimpleReminders(false),5000);
window.addEventListener('focus',()=>checkSimpleReminders(false));
document.addEventListener('visibilitychange',()=>{if(!document.hidden)checkSimpleReminders(false)});
