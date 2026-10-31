
/* v6.5.63 — To Do υπαγόρευση: live μετακίνηση κέρσορα χωρίς επανεγγραφή της προηγούμενης φράσης */
(function(){
  let recognition=null;
  let micStream=null;
  let micTrack=null;
  let listening=false;
  let restartTimer=null;
  let sessionSerial=0;
  let engineSerial=0;
  let activeSession=null;
  let lastUserCaret=0;
  let startCaretCandidate=null;

  function note(){return document.getElementById('todoNote')}
  function mic(){return document.getElementById('todoMicBtn')}
  function grow(){try{window.autoGrowTodoNote?.()}catch(e){}}

  function setStatus(text,on){
    const st=document.getElementById('todoVoiceStatus'),btn=mic();
    if(st){st.textContent=text;st.classList.toggle('active',!!on)}
    if(btn){
      btn.classList.toggle('listening',!!on);
      btn.textContent=on?'⏹️':'🎙️';
      btn.title=on?'Λήξη υπαγόρευσης':'Έναρξη υπαγόρευσης';
      btn.setAttribute('aria-label',on?'Λήξη υπαγόρευσης':'Έναρξη υπαγόρευσης');
    }
  }

  function upper(ch){return String(ch||'').toLocaleUpperCase('el-GR')}
  function capitalizeFirstLetter(s){
    return String(s||'').replace(/^(\s*)([A-Za-zΑ-Ωα-ωΆ-Ώά-ώ])/,(_,ws,ch)=>ws+upper(ch));
  }
  function formatDictation(text,before){
    let s=String(text||'');
    if(!s)return s;
    const b=String(before||'');
    if(b.trim()==='' || /\n[ \t]*$/.test(b) || /[.!?;:·…][ \t]*$/.test(b)){
      s=capitalizeFirstLetter(s);
    }
    s=s.replace(/([.!?;:·…])([ \t]*)([A-Za-zΑ-Ωα-ωΆ-Ώά-ώ])/g,
      (_,pun,ws,ch)=>pun+ws+upper(ch));
    s=s.replace(/(\n[ \t]*)([A-Za-zΑ-Ωα-ωΆ-Ώά-ώ])/g,
      (_,prefix,ch)=>prefix+upper(ch));
    return s;
  }

  function spokenFor(sess){
    return [sess.committed,sess.currentCycle]
      .map(v=>String(v||'').trim()).filter(Boolean).join(' ');
  }

  function replacementFor(sess){
    const spoken=formatDictation(spokenFor(sess),sess.before);
    if(!spoken)return '';
    const needBefore=sess.before && !/\s$/.test(sess.before) &&
      !/[([{"'«“‘\-–—/]$/.test(sess.before);
    const needAfter=sess.after && !/^\s/.test(sess.after) &&
      !/^[,.;:!?%)\]}"'»”’\-–—]/.test(sess.after);
    return (needBefore?' ':'')+spoken+(needAfter?' ':'');
  }

  function render(sess){
    if(activeSession!==sess)return;
    const el=note();if(!el)return;
    const repl=replacementFor(sess);
    try{
      el.setRangeText(repl,sess.insertAt,sess.dictEnd,'end');
      sess.dictEnd=sess.insertAt+repl.length;
    }catch(e){
      const a=el.value.slice(0,sess.insertAt),b=el.value.slice(sess.dictEnd);
      el.value=a+repl+b;
      sess.dictEnd=sess.insertAt+repl.length;
      try{el.setSelectionRange(sess.dictEnd,sess.dictEnd)}catch(_){ }
    }
    grow();
  }

  function commitCurrentCycle(sess){
    if(activeSession!==sess)return;
    const t=String(sess.currentCycle||'').trim();
    if(t){
      sess.committed=[sess.committed,t]
        .map(v=>String(v||'').trim()).filter(Boolean).join(' ');
    }
    sess.currentCycle='';
    render(sess);
  }

  async function ensureMic(){
    if(micTrack&&micTrack.readyState==='live'){
      micTrack.enabled=true;return micTrack;
    }
    if(!navigator.mediaDevices?.getUserMedia)return null;
    micStream=await navigator.mediaDevices.getUserMedia({audio:true});
    micTrack=micStream.getAudioTracks()[0]||null;
    if(micTrack)micTrack.enabled=true;
    return micTrack;
  }

  function scheduleEngineRestart(sess,delay){
    if(restartTimer)clearTimeout(restartTimer);
    restartTimer=setTimeout(()=>{
      if(activeSession===sess&&listening)startEngine(sess);
    },delay||80);
  }

  function makeRecognition(sess,engineId){
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SR)return null;
    const r=new SR();
    r.lang='el-GR';r.interimResults=true;r.continuous=true;r.maxAlternatives=1;

    r.onstart=()=>{
      if(activeSession===sess&&listening&&sess.engineId===engineId)
        setStatus('🎙️ Υπαγόρευση ενεργή — μετακίνησε τον κέρσορα όπου θέλεις ή πάτησε ⏹️ για λήξη.',true);
    };

    r.onresult=e=>{
      if(activeSession!==sess||!listening||sess.engineId!==engineId)return;
      let full='';
      for(let i=0;i<e.results.length;i++){
        const tr=e.results[i]?.[0]?.transcript||'';
        if(tr)full+=(full?' ':'')+tr;
      }
      sess.currentCycle=full.trim();
      render(sess);
    };

    r.onerror=e=>{
      if(activeSession!==sess||sess.engineId!==engineId)return;
      if(e.error==='not-allowed'||e.error==='service-not-allowed'){
        listening=false;activeSession=null;
        setStatus('Ο Chrome δεν έχει άδεια μικροφώνου.',false);
      }else if(e.error==='audio-capture'){
        listening=false;activeSession=null;
        setStatus('Δεν βρέθηκε διαθέσιμο μικρόφωνο.',false);
      }
    };

    r.onend=()=>{
      if(activeSession!==sess||!listening)return;
      // Αν αυτό είναι παλιό engine επειδή ο χρήστης μετακίνησε τον κέρσορα,
      // δεν ξαναγράφουμε τίποτα από την παλιά θέση.
      if(sess.engineId!==engineId)return;
      commitCurrentCycle(sess);
      scheduleEngineRestart(sess,120);
    };
    return r;
  }

  function startEngine(sess){
    if(activeSession!==sess||!listening)return;
    sess.currentCycle='';
    const engineId=++engineSerial;
    sess.engineId=engineId;
    recognition=makeRecognition(sess,engineId);
    if(!recognition){
      listening=false;activeSession=null;
      setStatus('Η υπαγόρευση δεν υποστηρίζεται από αυτόν τον browser. Δοκίμασε Chrome ή Edge.',false);
      return;
    }
    try{
      if(micTrack&&micTrack.readyState==='live')recognition.start(micTrack);
      else recognition.start();
    }catch(e){
      try{recognition.start()}
      catch(_){scheduleEngineRestart(sess,250)}
    }
  }

  function relocateWhileListening(pos){
    const sess=activeSession,el=note();
    if(!sess||!listening||!el)return;
    pos=Math.max(0,Math.min(Number(pos)||0,el.value.length));

    // Αν ο χρήστης δεν άλλαξε πραγματικά θέση, δεν κάνουμε τίποτα.
    if(pos===sess.dictEnd)return;

    // Το κείμενο της προηγούμενης φράσης είναι ΗΔΗ ορατό στο textarea.
    // Δεν το ξανακάνουμε render εδώ, γιατί το setRangeText θα μετακινούσε
    // τον κέρσορα πίσω πριν από τελεία / Enter που μόλις έβαλε ο χρήστης.
    // Απλώς το θεωρούμε παγωμένο και ξεκινάμε νέο τμήμα στη φρέσκια θέση.
    pos=Math.max(0,Math.min(pos,el.value.length));
    sess.insertAt=pos;
    sess.dictEnd=pos;
    sess.before=el.value.slice(0,pos);
    sess.after=el.value.slice(pos);
    sess.committed='';
    sess.currentCycle='';
    try{el.setSelectionRange(pos,pos)}catch(e){}

    // Ακυρώνουμε μόνο την εσωτερική μηχανή αναγνώρισης. Το μικρόφωνο και
    // η γενική υπαγόρευση μένουν ενεργά. Το νέο engine ξεκινά στη νέα θέση.
    sess.engineId=++engineSerial;
    const old=recognition;
    recognition=null;
    try{old?.abort()}catch(e){try{old?.stop()}catch(_){}}
    scheduleEngineRestart(sess,90);
  }

  function stopVoice(){
    const sess=activeSession;
    if(!sess||!listening)return;
    commitCurrentCycle(sess);
    listening=false;activeSession=null;sessionSerial++;
    if(restartTimer){clearTimeout(restartTimer);restartTimer=null}
    try{recognition?.stop()}catch(e){}
    if(micTrack&&micTrack.readyState==='live')micTrack.enabled=false;
    setStatus('Η υπαγόρευση σταμάτησε.',false);
    const el=note();
    if(el){
      el.focus();
      try{el.setSelectionRange(sess.dictEnd,sess.dictEnd)}catch(e){}
      lastUserCaret=sess.dictEnd;
    }
  }

  async function startVoice(){
    const el=note();if(!el)return;
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SR){
      setStatus('Η υπαγόρευση δεν υποστηρίζεται από αυτόν τον browser. Δοκίμασε Chrome ή Edge.',false);
      return;
    }
    let pos=(typeof startCaretCandidate==='number')?startCaretCandidate:
      ((document.activeElement===el&&typeof el.selectionStart==='number')?el.selectionStart:lastUserCaret);
    startCaretCandidate=null;
    pos=Math.max(0,Math.min(pos,el.value.length));

    const sess={
      id:++sessionSerial,
      insertAt:pos,
      dictEnd:pos,
      before:el.value.slice(0,pos),
      after:el.value.slice(pos),
      committed:'',
      currentCycle:'',
      engineId:0
    };
    activeSession=sess;listening=true;
    setStatus('🎙️ Ζητείται πρόσβαση στο μικρόφωνο…',true);
    try{await ensureMic()}
    catch(e){
      if(activeSession===sess){
        listening=false;activeSession=null;
        setStatus('Χρειάζεται να επιτρέψεις μία φορά την πρόσβαση στο μικρόφωνο.',false);
      }
      return;
    }
    if(activeSession!==sess||!listening)return;
    startEngine(sess);
  }

  window.toggleTodoVoice=function(){
    if(listening){stopVoice();return}
    startVoice();
  };

  function handleUserCaretMove(){
    const el=note();
    if(!el||typeof el.selectionStart!=='number')return;
    const pos=el.selectionStart;
    lastUserCaret=pos;
    if(listening&&activeSession)relocateWhileListening(pos);
  }

  function bind(){
    const el=note(),btn=mic();
    if(el){
      // Μόνο πραγματικές ενέργειες χρήστη. Δεν χρησιμοποιούμε selectionchange
      // όσο γράφει η αναγνώριση, ώστε το δικό μας setRangeText να μη θεωρείται μετακίνηση.
      el.addEventListener('mouseup',handleUserCaretMove);
      el.addEventListener('touchend',handleUserCaretMove);
      el.addEventListener('keyup',e=>{
        if(['Shift','Control','Alt','Meta'].includes(e.key))return;
        handleUserCaretMove();
      });
      el.addEventListener('click',()=>{ if(!listening)handleUserCaretMove(); });
      document.addEventListener('selectionchange',()=>{
        if(!listening&&document.activeElement===el&&typeof el.selectionStart==='number'){
          lastUserCaret=el.selectionStart;
        }
      });
    }
    if(btn){
      const grabStartCaret=()=>{
        if(listening)return;
        const ta=note();if(!ta)return;
        if(document.activeElement===ta&&typeof ta.selectionStart==='number'){
          startCaretCandidate=ta.selectionStart;
          lastUserCaret=ta.selectionStart;
        }else startCaretCandidate=lastUserCaret;
      };
      btn.addEventListener('pointerdown',grabStartCaret,true);
      btn.addEventListener('mousedown',grabStartCaret,true);
    }
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});
  else bind();
})();
