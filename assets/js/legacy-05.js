
/* v6.5.9 — To Do: τίτλος, πλήρης σημείωση, υπαγόρευση, προθεσμία, αρχείο, προβολή και εκτύπωση */
(function(){
  const TODO_KEY='romvos_todo_v1';
  const TODO_ARCHIVE_KEY='romvos_todo_archive_v1';
  const TODO_MODE_KEY='romvos_todo_complete_mode_v1';
  const TODO_LABELS={week:'Αυτή την εβδομάδα',next:'Επόμενη εβδομάδα',later:'Αργότερα',none:'Χωρίς χρονικό προσδιορισμό'};
  let todoRecognition=null,todoListening=false,todoArchiveOpen=false,currentTodoView=null;
  function loadJson(key,fallback){try{const v=JSON.parse(localStorage.getItem(key)||'null');return v??fallback}catch(e){return fallback}}
  function normalizeTodo(x){if(!x||typeof x!=='object')return x;return {...x,title:x.title||x.text||'',note:x.note||'',deadlineDate:x.deadlineDate||'',deadlineTime:x.deadlineTime||''}}
  function loadTodos(){const x=loadJson(TODO_KEY,[]);return Array.isArray(x)?x.map(normalizeTodo):[]}
  function loadTodoArchive(){const x=loadJson(TODO_ARCHIVE_KEY,[]);return Array.isArray(x)?x.map(normalizeTodo):[]}
  function saveTodos(items){localStorage.setItem(TODO_KEY,JSON.stringify(items));renderTodoList();window.romvosCheckDeadlineNotices?.()}
  function saveTodoArchive(items){localStorage.setItem(TODO_ARCHIVE_KEY,JSON.stringify(items));renderTodoArchive()}
  function todoEsc(s){return String(s||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
  function todoUid(){return 'TODO-'+Date.now().toString(36)+Math.random().toString(36).slice(2,6)}
  function formatTodoDate(v){if(!v)return '';const d=new Date(v);if(Number.isNaN(d.getTime()))return '';return d.toLocaleString('el-GR',{dateStyle:'short',timeStyle:'short'})}
  function formatTodoDeadline(x){if(!x.deadlineDate)return '';const d=new Date(x.deadlineDate+'T12:00:00');const date=d.toLocaleDateString('el-GR');return x.deadlineTime?date+' • '+x.deadlineTime:date}
  function todoDeadlineDue(x){if(!x.deadlineDate||x.done)return false;const t=x.deadlineTime||'09:00';const d=new Date(x.deadlineDate+'T'+t+':00');return !Number.isNaN(d.getTime())&&d<=new Date()}
  function getTodoMode(){const m=localStorage.getItem(TODO_MODE_KEY)||'archive';return ['archive','keep','delete'].includes(m)?m:'archive'}
  function renderTodoList(){
    const box=document.getElementById('todoList'),count=document.getElementById('todoNavCount'),items=loadTodos();
    const active=items.filter(x=>!x.done).length;if(count){count.textContent=active;count.style.display=active?'inline-block':'none'}
    if(!box)return;if(!items.length){box.innerHTML='<div class="todo-empty">Δεν έχεις ενεργά To Do.</div>';return}
    const order={week:0,next:1,later:2,none:3};
    items.sort((a,b)=>(Number(!!a.done)-Number(!!b.done))||((a.deadlineDate||'9999-99-99').localeCompare(b.deadlineDate||'9999-99-99'))||((order[a.when]??9)-(order[b.when]??9))||((a.createdAt||'').localeCompare(b.createdAt||'')));
    box.innerHTML=items.map(x=>`<div class="todo-item ${x.done?'done':''}">
      <div class="todo-main"><div class="todo-title">${todoEsc(x.title||x.text)}</div>${x.note?`<div class="todo-note-preview">${todoEsc(x.note)}</div>`:''}<div class="todo-meta"><span class="todo-tag ${todoEsc(x.when)}">${todoEsc(TODO_LABELS[x.when]||TODO_LABELS.none)}</span>${x.deadlineDate?`<span class="todo-deadline ${todoDeadlineDue(x)?'due':''}">⏰ ${todoEsc(formatTodoDeadline(x))}</span>`:''}${x.doneAt?`<span>Ολοκληρώθηκε: ${todoEsc(formatTodoDate(x.doneAt))}</span>`:''}</div></div>
      <div class="todo-item-actions"><button class="btn light todo-edit-btn" type="button" onclick="editTodoItem('${x.id}')">✏️ Επεξεργασία</button><button class="btn light todo-view-btn" type="button" onclick="viewTodoItem('${x.id}','active')">👁️ Προβολή</button><label class="todo-complete-inline" title="Ολοκληρώθηκε"><input class="todo-check" type="checkbox" ${x.done?'checked':''} onchange="toggleTodoItem('${x.id}')"><span>Ολοκληρώθηκε</span></label><button class="todo-delete" type="button" onclick="deleteTodoItem('${x.id}')">🗑️</button></div>
    </div>`).join('');
  }
  function renderTodoArchive(){
    const box=document.getElementById('todoArchiveList'),count=document.getElementById('todoArchiveCount'),toggle=document.getElementById('todoArchiveToggle'),items=loadTodoArchive().sort((a,b)=>(b.doneAt||'').localeCompare(a.doneAt||''));
    if(count)count.textContent=items.length;if(!box)return;box.classList.toggle('show',todoArchiveOpen);if(toggle)toggle.textContent=todoArchiveOpen?'Απόκρυψη αρχείου':'Εμφάνιση αρχείου';
    if(!items.length){box.innerHTML='<div class="todo-empty">Το αρχείο ολοκληρωμένων είναι κενό.</div>';return}
    box.innerHTML=items.map(x=>`<div class="todo-archive-item"><div class="todo-main"><div class="todo-title">${todoEsc(x.title||x.text)}</div>${x.note?`<div class="todo-note-preview">${todoEsc(x.note)}</div>`:''}<div class="todo-meta"><span class="todo-tag ${todoEsc(x.when)}">${todoEsc(TODO_LABELS[x.when]||TODO_LABELS.none)}</span>${x.deadlineDate?`<span>⏰ ${todoEsc(formatTodoDeadline(x))}</span>`:''}<span>Ολοκληρώθηκε: ${todoEsc(formatTodoDate(x.doneAt))}</span></div></div><div class="todo-archive-actions"><button class="btn light" type="button" onclick="viewTodoItem('${x.id}','archive')">👁️ Προβολή</button><button class="btn light" type="button" onclick="restoreTodoFromArchive('${x.id}')">↩ Επαναφορά</button><button class="btn danger" type="button" onclick="deleteTodoFromArchive('${x.id}')">🗑️</button></div></div>`).join('');
  }
  function archiveTodoObject(item){const archive=loadTodoArchive();archive.unshift({...item,done:true,doneAt:item.doneAt||new Date().toISOString(),archivedAt:new Date().toISOString()});localStorage.setItem(TODO_ARCHIVE_KEY,JSON.stringify(archive))}
  window.autoGrowTodoNote=function(){const el=document.getElementById('todoNote');if(!el)return;el.style.height='auto';el.style.height=Math.min(Math.max(el.scrollHeight,130),Math.round(window.innerHeight*.52))+'px'};
  function resetTodoEditor(){
    const ids=['todoEditId','todoTitle','todoNote','todoDeadlineDate','todoDeadlineTime'];ids.forEach(id=>{const el=document.getElementById(id);if(el)el.value=''});
    const sel=document.getElementById('todoWhen'),saveBtn=document.getElementById('todoSaveBtn'),cancelBtn=document.getElementById('todoCancelEditBtn'),panel=document.querySelector('.todo-entry-panel');
    if(sel)sel.value='next';if(saveBtn)saveBtn.textContent='+ Προσθήκη';if(cancelBtn)cancelBtn.style.display='none';if(panel)panel.classList.remove('editing');autoGrowTodoNote();
  }
  window.editTodoItem=function(id){
    const x=loadTodos().find(v=>v.id===id);if(!x)return;
    document.getElementById('todoEditId').value=x.id;document.getElementById('todoTitle').value=x.title||x.text||'';document.getElementById('todoNote').value=x.note||'';document.getElementById('todoWhen').value=x.when||'next';document.getElementById('todoDeadlineDate').value=x.deadlineDate||'';document.getElementById('todoDeadlineTime').value=x.deadlineTime||'';
    document.getElementById('todoSaveBtn').textContent='💾 Αποθήκευση αλλαγών';document.getElementById('todoCancelEditBtn').style.display='inline-block';const panel=document.querySelector('.todo-entry-panel');panel?.classList.add('editing');panel?.scrollIntoView({behavior:'smooth',block:'start'});autoGrowTodoNote();setTimeout(()=>document.getElementById('todoTitle')?.focus(),180);
  };
  window.cancelTodoEdit=function(){resetTodoEditor();document.getElementById('todoTitle')?.focus()};
  window.addTodoItem=function(){
    const title=(document.getElementById('todoTitle')?.value||'').trim(),note=(document.getElementById('todoNote')?.value||'').trim(),when=document.getElementById('todoWhen')?.value||'next',deadlineDate=document.getElementById('todoDeadlineDate')?.value||'',deadlineTime=document.getElementById('todoDeadlineTime')?.value||'',id=(document.getElementById('todoEditId')?.value||'').trim();
    if(!title){document.getElementById('todoTitle')?.focus();return}
    const items=loadTodos();
    if(id){const idx=items.findIndex(v=>v.id===id);if(idx<0){resetTodoEditor();renderTodoList();return}items[idx]={...items[idx],title,text:title,note,when,deadlineDate,deadlineTime,editedAt:new Date().toISOString()};localStorage.setItem(TODO_KEY,JSON.stringify(items));resetTodoEditor();renderTodoList();window.romvosCheckDeadlineNotices?.();return}
    items.push({id:todoUid(),title,text:title,note,when,deadlineDate,deadlineTime,done:false,createdAt:new Date().toISOString()});saveTodos(items);resetTodoEditor();document.getElementById('todoTitle')?.focus();
  };
  window.saveTodoCompleteMode=function(){const sel=document.getElementById('todoCompleteMode');if(sel)localStorage.setItem(TODO_MODE_KEY,sel.value)};
  window.toggleTodoItem=function(id){let items=loadTodos();const idx=items.findIndex(v=>v.id===id);if(idx<0)return;const x=items[idx];if(x.done){x.done=false;x.doneAt='';saveTodos(items);return}x.done=true;x.doneAt=new Date().toISOString();const mode=getTodoMode();if(mode==='archive'){archiveTodoObject(x);items.splice(idx,1);localStorage.setItem(TODO_KEY,JSON.stringify(items));renderTodoList();renderTodoArchive();return}if(mode==='delete'){items.splice(idx,1);saveTodos(items);return}saveTodos(items)};
  window.archiveCompletedTodos=function(){const items=loadTodos(),done=items.filter(x=>x.done);if(!done.length)return alert('Δεν υπάρχουν ολοκληρωμένα To Do στη λίστα.');if(!confirm('Να μεταφερθούν τα ολοκληρωμένα To Do στο Αρχείο;'))return;const archive=loadTodoArchive();done.forEach(x=>archive.unshift({...x,done:true,doneAt:x.doneAt||new Date().toISOString(),archivedAt:new Date().toISOString()}));localStorage.setItem(TODO_ARCHIVE_KEY,JSON.stringify(archive));saveTodos(items.filter(x=>!x.done));renderTodoArchive()};
  window.deleteTodoItem=function(id){if(confirm('Να διαγραφεί αυτό το To Do;'))saveTodos(loadTodos().filter(x=>x.id!==id))};
  window.toggleTodoArchive=function(){todoArchiveOpen=!todoArchiveOpen;renderTodoArchive()};
  window.restoreTodoFromArchive=function(id){const archive=loadTodoArchive(),idx=archive.findIndex(x=>x.id===id);if(idx<0)return;const x=archive[idx];archive.splice(idx,1);localStorage.setItem(TODO_ARCHIVE_KEY,JSON.stringify(archive));const items=loadTodos();items.push({...x,done:false,doneAt:'',restoredAt:new Date().toISOString()});localStorage.setItem(TODO_KEY,JSON.stringify(items));renderTodoList();renderTodoArchive()};
  window.deleteTodoFromArchive=function(id){if(!confirm('Να διαγραφεί οριστικά αυτή η εγγραφή από το Αρχείο;'))return;saveTodoArchive(loadTodoArchive().filter(x=>x.id!==id))};
  window.clearTodoArchive=function(){const a=loadTodoArchive();if(!a.length)return;if(confirm('Να διαγραφεί ΟΛΟ το αρχείο ολοκληρωμένων To Do; Η ενέργεια δεν αναιρείται.'))saveTodoArchive([])};
  function setVoiceStatus(text,active){const st=document.getElementById('todoVoiceStatus'),btn=document.getElementById('todoMicBtn');if(st){st.textContent=text;st.classList.toggle('active',!!active)}if(btn)btn.classList.toggle('listening',!!active)}
  window.toggleTodoVoice=function(){
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR){setVoiceStatus('Η υπαγόρευση δεν υποστηρίζεται από αυτόν τον browser. Δοκίμασε Chrome ή Edge.',false);return}if(todoListening&&todoRecognition){todoRecognition.stop();return}
    const input=document.getElementById('todoNote');if(!input)return;todoRecognition=new SR();todoRecognition.lang='el-GR';todoRecognition.interimResults=true;todoRecognition.continuous=false;todoRecognition.maxAlternatives=1;const initial=input.value.trim();
    todoRecognition.onstart=()=>{todoListening=true;setVoiceStatus('🎙️ Ακούω… μίλησε τώρα.',true)};
    todoRecognition.onresult=e=>{let finalText='',interim='';for(let i=e.resultIndex;i<e.results.length;i++){const t=e.results[i][0].transcript;if(e.results[i].isFinal)finalText+=t;else interim+=t}const spoken=(finalText||interim).trim();input.value=[initial,spoken].filter(Boolean).join(initial&&spoken?' ':'');autoGrowTodoNote()};
    todoRecognition.onerror=e=>{todoListening=false;const msg=e.error==='not-allowed'?'Χρειάζεται άδεια μικροφώνου από τον browser.':e.error==='no-speech'?'Δεν άκουσα ομιλία. Πάτησε ξανά το μικρόφωνο.':'Η υπαγόρευση σταμάτησε: '+e.error;setVoiceStatus(msg,false)};
    todoRecognition.onend=()=>{todoListening=false;setVoiceStatus('Η υπαγόρευση ολοκληρώθηκε. Βλέπεις όλο το κείμενο και μπορείς να το διορθώσεις.',false);autoGrowTodoNote();input.focus()};try{todoRecognition.start()}catch(e){todoListening=false;setVoiceStatus('Δεν μπόρεσε να ξεκινήσει το μικρόφωνο. Έλεγξε την άδεια μικροφώνου.',false)}
  };
  function findTodoForView(id,source){const list=source==='archive'?loadTodoArchive():loadTodos();const item=list.find(x=>x.id===id);return item?{item,source}:null}
  window.viewTodoItem=function(id,source){const found=findTodoForView(id,source);if(!found)return;currentTodoView=found;const x=found.item,title=document.getElementById('todoViewTitle'),note=document.getElementById('todoViewNote'),details=document.getElementById('todoViewDetails');if(title)title.textContent=x.title||x.text||'';if(note)note.textContent=x.note||'';const status=found.source==='archive'?'Αρχειοθετημένο / Ολοκληρωμένο':(x.done?'Ολοκληρωμένο':'Ενεργό');if(details)details.innerHTML=`<b>Πότε</b><span>${todoEsc(TODO_LABELS[x.when]||TODO_LABELS.none)}</span>${x.deadlineDate?`<b>Προθεσμία</b><span>${todoEsc(formatTodoDeadline(x))}</span>`:''}<b>Κατάσταση</b><span>${todoEsc(status)}</span><b>Καταχωρήθηκε</b><span>${todoEsc(formatTodoDate(x.createdAt)||'—')}</span>${x.editedAt?`<b>Τελευταία επεξεργασία</b><span>${todoEsc(formatTodoDate(x.editedAt)||'—')}</span>`:''}${x.doneAt?`<b>Ολοκληρώθηκε</b><span>${todoEsc(formatTodoDate(x.doneAt)||'—')}</span>`:''}`;document.getElementById('todoViewOverlay')?.classList.add('show')};
  window.closeTodoView=function(){document.getElementById('todoViewOverlay')?.classList.remove('show')};
  window.printCurrentTodo=function(){
    if(!currentTodoView?.item)return;
    const x=currentTodoView.item,pa=document.getElementById('printArea');
    if(!pa)return;
    const orientation=document.getElementById('todoPrintOrientation')?.value==='landscape'?'landscape':'portrait';
    let ps=document.getElementById('todoDynamicPageStyle');
    if(!ps){ps=document.createElement('style');ps.id='todoDynamicPageStyle';document.head.appendChild(ps)}
    ps.textContent=`@media print{@page{size:A4 ${orientation};margin:14mm}}`;
    const docDate=new Date().toLocaleDateString('el-GR');
    pa.innerHTML=`<div class="todo-print-sheet">
      <div class="todo-print-head">
        <div class="todo-print-brand">ROMVOS SERVICE — To Do</div>
        <div class="todo-print-date">Ημερομηνία: ${todoEsc(docDate)}</div>
      </div>
      <div class="todo-print-title-label">Τίτλος</div>
      <div class="todo-print-title">${todoEsc(x.title||x.text||'—')}</div>
      <div class="todo-print-note-label">Σημείωση</div>
      <div class="todo-print-note">${todoEsc(x.note||'—')}</div>
    </div>`;
    document.body.classList.add('printing');
    setTimeout(()=>window.print(),50)
  };
  function initTodo(){const mode=document.getElementById('todoCompleteMode');if(mode)mode.value=getTodoMode();renderTodoList();renderTodoArchive();autoGrowTodoNote()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initTodo);else initTodo();
})();
