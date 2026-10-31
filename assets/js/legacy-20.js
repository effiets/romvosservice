
/* v6.5.36 — Οι πραγματικές Απλές Υπενθυμίσεις ελέγχονται απευθείας από localStorage.
   Δεν αλλάζει/διαγράφει άλλα δεδομένα. */
(function(){
  'use strict';
  const KEY='romvos_simple_reminders';
  const DISMISS_KEY='romvos_simple_reminder_dismiss_until_v6536';
  const q=id=>document.getElementById(id);
  function read(){
    try{const a=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(a)?a:[]}catch(e){return []}
  }
  function moment(r){
    const d=String(r?.date||''),t=String(r?.time||'09:00');
    if(!d)return null;
    const m=new Date(d+'T'+t+':00');
    return Number.isNaN(m.getTime())?null:m;
  }
  function due(){
    const now=new Date();
    return read().filter(r=>{
      if(!r || r.done || /^TEST(?:-|$)/i.test(String(r.id||'')))return false;
      const m=moment(r); if(!m || m>now)return false;
      if(r.snoozeUntil){const sn=new Date(r.snoozeUntil);if(!Number.isNaN(sn.getTime())&&sn>now)return false}
      return true;
    });
  }
  function pendingCount(){return read().filter(r=>r&&!r.done&&!/^TEST(?:-|$)/i.test(String(r.id||''))).length}
  function updateBadge(){
    const nav=q('reminderNavCount');if(!nav)return;
    const n=pendingCount();nav.textContent=String(n);nav.style.display=n?'inline-flex':'none';
  }
  function syncLegacy(a){try{if(typeof SIMPLE_REMINDERS!=='undefined')SIMPLE_REMINDERS=a}catch(e){}}
  function popupOpen(){return q('romvosInAppAlert')?.classList.contains('show')||false}
  function dismissed(){return Number(localStorage.getItem(DISMISS_KEY)||0)>Date.now()}
  function check(force){
    updateBadge();
    const a=due();
    if(!a.length)return;
    if(popupOpen())return;
    if(!force && dismissed())return;
    syncLegacy(read());
    try{
      if(typeof window.showSimpleReminderAlert==='function'){
        window.showSimpleReminderAlert(a.slice(0,8),false);
      }
    }catch(e){console.error('ROMVOS reminder autofire',e)}
  }

  // Κλείσιμο πραγματικής Απλής Υπενθύμισης = προσωρινή σίγαση 15 λεπτών.
  const oldClose=window.romvosCloseInAppAlert;
  if(typeof oldClose==='function'){
    window.romvosCloseInAppAlert=function(){
      const kind=String(q('romvosInAppType')?.textContent||'');
      const isTest=/Δοκιμ/i.test(String(q('romvosInAppBody')?.textContent||''));
      try{oldClose.apply(this,arguments)}finally{
        if(kind.includes('Απλή')&&!isTest){
          try{localStorage.setItem(DISMISS_KEY,String(Date.now()+15*60*1000))}catch(e){}
        }
      }
    };
  }

  // Με πραγματική ενέργεια/μεταφορά καθαρίζεται η προσωρινή σίγαση.
  ['romvosTomorrowInAppAlert','romvosApplyInAppDate','romvosCompleteInAppAlert'].forEach(name=>{
    const old=window[name];if(typeof old!=='function')return;
    window[name]=function(){try{localStorage.removeItem(DISMISS_KEY)}catch(e){};return old.apply(this,arguments)};
  });

  // Υπερισχύουμε των παλιών ελέγχων: η πηγή αλήθειας είναι το localStorage.
  window.checkSimpleReminders=function(force){
    try{window.renderSimpleReminders?.()}catch(e){}
    check(!!force);
  };
  window.romvosCheckInAppAlerts=(function(old){
    return function(forceKind){
      if(forceKind==='todo'){return typeof old==='function'?old(forceKind):undefined}
      check(forceKind==='reminder');
      // Αν δεν υπάρχει ληγμένη απλή υπενθύμιση, άφησε τον υπάρχοντα μηχανισμό να ελέγξει To Do.
      if(!due().length && typeof old==='function')return old(forceKind);
    };
  })(window.romvosCheckInAppAlerts);

  function start(){
    updateBadge();
    // Καμία δοκιμή στην εκκίνηση. Πρώτος πραγματικός έλεγχος μετά τη φόρτωση.
    setTimeout(()=>check(false),900);
    setInterval(()=>check(false),3000);
    window.addEventListener('focus',()=>setTimeout(()=>check(false),100));
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(()=>check(false),100)});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
