
(function(){
'use strict';
const KEY='romvos_inapp_alert_position_v37';
const el=document.getElementById('romvosInAppAlert');
if(!el)return;
const head=el.querySelector('.romvos-inapp-head');
if(!head)return;
head.title='Σύρε το παράθυρο σε άλλο σημείο της οθόνης';
let drag=null;
function readPos(){try{const p=JSON.parse(localStorage.getItem(KEY)||'null');return p&&Number.isFinite(p.x)&&Number.isFinite(p.y)?p:null}catch(e){return null}}
function clamp(x,y){
  const r=el.getBoundingClientRect();
  const w=Math.max(r.width,280),h=Math.max(r.height,120);
  const margin=8;
  return {
    x:Math.min(Math.max(margin,x),Math.max(margin,window.innerWidth-w-margin)),
    y:Math.min(Math.max(margin,y),Math.max(margin,window.innerHeight-h-margin))
  };
}
function setPos(x,y,save){
  const p=clamp(x,y);
  el.style.setProperty('left',p.x+'px','important');
  el.style.setProperty('top',p.y+'px','important');
  el.style.setProperty('right','auto','important');
  el.style.setProperty('bottom','auto','important');
  if(save){try{localStorage.setItem(KEY,JSON.stringify(p))}catch(e){}}
}
function restore(){
  const p=readPos();if(!p)return;
  // Περιμένουμε να γίνει ορατό ώστε να έχουμε το πραγματικό μέγεθός του.
  requestAnimationFrame(()=>setPos(p.x,p.y,false));
}
head.addEventListener('pointerdown',e=>{
  if(e.button!==undefined&&e.button!==0)return;
  if(e.target.closest('button,input,select,textarea,a'))return;
  const r=el.getBoundingClientRect();
  drag={dx:e.clientX-r.left,dy:e.clientY-r.top,pid:e.pointerId};
  el.classList.add('romvos-alert-dragging');
  try{head.setPointerCapture(e.pointerId)}catch(_){}
  e.preventDefault();
});
head.addEventListener('pointermove',e=>{
  if(!drag||e.pointerId!==drag.pid)return;
  setPos(e.clientX-drag.dx,e.clientY-drag.dy,false);
  e.preventDefault();
});
function endDrag(e){
  if(!drag||(e.pointerId!==undefined&&e.pointerId!==drag.pid))return;
  const r=el.getBoundingClientRect();
  drag=null;el.classList.remove('romvos-alert-dragging');
  setPos(r.left,r.top,true);
}
head.addEventListener('pointerup',endDrag);
head.addEventListener('pointercancel',endDrag);
new MutationObserver(()=>{if(el.classList.contains('show'))restore()}).observe(el,{attributes:true,attributeFilter:['class']});
window.addEventListener('resize',()=>{if(!el.classList.contains('show'))return;const r=el.getBoundingClientRect();setPos(r.left,r.top,true)});
if(el.classList.contains('show'))restore();
})();
