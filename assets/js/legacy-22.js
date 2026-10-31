
/* v6.5.38 — Δύο καθαρά, διακριτικά μπιπ για τις ειδοποιήσεις μέσα στο ROMVOS */
(function(){
  let ctx=null;
  function getCtx(){
    try{
      if(!ctx) ctx=new (window.AudioContext||window.webkitAudioContext)();
      return ctx;
    }catch(e){ return null; }
  }
  function schedule(c){
    try{
      const base=c.currentTime+0.02;
      [
        {delay:0.00,freq:760},
        {delay:0.27,freq:840}
      ].forEach(b=>{
        const o=c.createOscillator(), g=c.createGain();
        o.type='sine';
        o.frequency.setValueAtTime(b.freq,base+b.delay);
        g.gain.setValueAtTime(0.0001,base+b.delay);
        g.gain.exponentialRampToValueAtTime(0.060,base+b.delay+0.018);
        g.gain.exponentialRampToValueAtTime(0.0001,base+b.delay+0.155);
        o.connect(g); g.connect(c.destination);
        o.start(base+b.delay); o.stop(base+b.delay+0.17);
      });
    }catch(e){}
  }
  function prime(){
    const c=getCtx();
    if(c&&c.state==='suspended') c.resume().catch(()=>{});
  }
  ['pointerdown','keydown'].forEach(ev=>document.addEventListener(ev,prime,{once:true,capture:true}));
  window.playRomvosSoftAlert=function(){
    const c=getCtx();
    if(!c)return;
    try{
      if(c.state==='suspended'){
        c.resume().then(()=>schedule(c)).catch(()=>{});
      }else schedule(c);
    }catch(e){}
  };
})();
