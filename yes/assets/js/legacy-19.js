
(function(){
  function parseArr(key){try{const a=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(a)?a:[]}catch(e){return []}}
  function writeArr(key,a){try{localStorage.setItem(key,JSON.stringify(a))}catch(e){}}
  function removeTestRows(){
    // Remove only test records created by our own test buttons; never user reminders/todos.
    const rk='romvos_simple_reminders';
    const ra=parseArr(rk); const rc=ra.filter(r=>!/^TEST(?:-|$)/i.test(String(r&&r.id||'')));
    if(rc.length!==ra.length)writeArr(rk,rc);
    const tk='romvos_todo_v1';
    const ta=parseArr(tk); const tc=ta.filter(t=>!/^TEST(?:-|$)/i.test(String(t&&t.id||'')));
    if(tc.length!==ta.length)writeArr(tk,tc);
  }
  function closeTestPopupOnStartup(){
    const el=document.getElementById('romvosInAppAlert');
    if(el){el.classList.remove('show');el.setAttribute('data-startup-closed','1')}
    const body=document.getElementById('romvosInAppBody');
    if(body && /Δοκιμ/i.test(body.textContent||''))body.innerHTML='';
    const move=document.getElementById('romvosInAppMove'); if(move)move.classList.remove('show');
  }
  function updateReminderPendingBadge(){
    const nav=document.getElementById('reminderNavCount'); if(!nav)return;
    const a=parseArr('romvos_simple_reminders');
    const n=a.filter(r=>r && !r.done && !/^TEST(?:-|$)/i.test(String(r.id||''))).length;
    nav.textContent=String(n); nav.style.display=n?'inline-flex':'none';
  }
  function enforceNavOrder(){
    const nav=document.querySelector('aside nav'); if(!nav)return;
    const order=['board','reminders','todo','orders','clients','incoming','returns','emps','vehs'];
    order.forEach(tab=>{const b=nav.querySelector('button[data-tab="'+tab+'"]');if(b)nav.appendChild(b)});
  }
  function init(){
    removeTestRows(); closeTestPopupOnStartup(); enforceNavOrder(); updateReminderPendingBadge();
    // Let legacy renderers finish, then enforce the pending count again.
    setTimeout(updateReminderPendingBadge,100);
    setTimeout(updateReminderPendingBadge,600);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true}); else init();
})();
