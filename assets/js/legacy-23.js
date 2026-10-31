
/* v6.5.40 — Σταθερή υπενθύμιση κάρτας εργασίας, Δευτέρα–Παρασκευή 08:20 & 16:20 */
(function(){
  'use strict';
  const KEY='romvos_work_card_ack_v1';
  const AM='08:20', PM='16:20';
  let currentSlot='';
  const q=id=>document.getElementById(id);
  function ymd(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
  function hm(d){return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0')}
  function weekday(d){const x=d.getDay();return x>=1&&x<=5}
  function read(){try{const x=JSON.parse(localStorage.getItem(KEY)||'{}');return x&&typeof x==='object'&&!Array.isArray(x)?x:{}}catch(e){return {}}}
  function write(x){try{localStorage.setItem(KEY,JSON.stringify(x))}catch(e){}}
  function prune(x){const ks=Object.keys(x).sort();while(ks.length>45){delete x[ks.shift()]}return x}
  function dueSlot(now){
    if(!weekday(now))return '';
    const t=hm(now), date=ymd(now), a=read(), rec=a[date]||{};
    // Μετά τις 16:20 προτεραιότητα έχει η απογευματινή κάρτα.
    if(t>=PM && !rec.pm)return 'pm';
    if(t>=AM && !rec.am)return 'am';
    return '';
  }
  function show(slot){
    if(!slot)return;
    const box=q('romvosWorkCardAlert');if(!box)return;
    currentSlot=slot;
    const isPM=slot==='pm';
    q('romvosWorkCardText').textContent=isPM?'Υπενθύμιση για χτύπημα κάρτας κατά την έξοδο.':'Υπενθύμιση για χτύπημα κάρτας κατά την προσέλευση.';
    q('romvosWorkCardTime').textContent=isPM?'Ώρα υπενθύμισης: 16:20':'Ώρα υπενθύμισης: 08:20';
    if(!box.classList.contains('show')){
      box.classList.add('show');
      try{window.playRomvosSoftAlert?.()}catch(e){}
    }
  }
  function tick(){
    const box=q('romvosWorkCardAlert');
    if(box?.classList.contains('show'))return;
    const slot=dueSlot(new Date());
    if(slot)show(slot);
  }
  window.romvosConfirmWorkCard=function(){
    if(!currentSlot)return;
    const now=new Date(), date=ymd(now), a=read(), rec=a[date]||{};
    rec[currentSlot]=true;
    rec[currentSlot+'At']=now.toISOString();
    a[date]=rec;write(prune(a));
    q('romvosWorkCardAlert')?.classList.remove('show');
    currentSlot='';
    setTimeout(tick,250);
  };
  window.romvosCheckWorkCard=tick;
  function init(){
    q('romvosWorkCardAlert')?.classList.remove('show');
    setTimeout(tick,1100);
    setInterval(tick,5000);
    window.addEventListener('focus',()=>setTimeout(tick,100));
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(tick,100)});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
