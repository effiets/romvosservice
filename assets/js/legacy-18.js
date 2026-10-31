
(function(){
  function validCompany(v){return v==='Ρόμβος Κλίμα'||v==='Ρόμβος Ψυκτική'}
  function companyTag(v){return validCompany(v)?'<span class="company-pill">'+esc(v)+'</span>':'<span class="company-missing">Εταιρεία: —</span>'}
  function focusEditor(sectionId,inputId){
    var panel=document.querySelector('#'+sectionId+' .panel');
    if(panel){panel.classList.remove('edit-flash');void panel.offsetWidth;panel.classList.add('edit-flash');panel.scrollIntoView({behavior:'smooth',block:'start'});}
    setTimeout(function(){var el=$(inputId);if(el){try{el.focus()}catch(e){}}},250);
  }

  renderLists=function(){
    if($('empList'))$('empList').innerHTML=E.length?E.map(function(e){
      let li=empLeaveInfo(e,today()),period=e.leaveFrom&&e.leaveTo?`${e.leaveReason||'Άδεια'}: ${e.leaveFrom.split('-').reverse().join('/')}–${e.leaveTo.split('-').reverse().join('/')}`:'';
      return `<div class="list"><div><b>${esc(e.name)}</b>${companyTag(e.company)}${li?`<span class="leave-note">${esc(li.reason)}</span>`:''}<div class="small">${esc(e.role||'')} ${e.phone?'• '+esc(e.phone):''}${period?' • '+esc(period):''}</div></div><div class="actions"><button class="btn light" onclick="editEmp('${e.id}')">✏️</button><button class="btn ${e.active===false?'danger':'light'}" onclick="toggleEmp('${e.id}')">${e.active===false?'Ανενεργός':'Ενεργός'}</button><button class="btn danger" onclick="delEmp('${e.id}')">🗑️</button></div></div>`
    }).join(''):'Δεν υπάρχουν τεχνικοί.';
    if($('vehList'))$('vehList').innerHTML=V.length?V.map(function(v){
      const out=!!v.outOfService,problem=String(v.problem||'').trim();
      return `<div class="list ${out?'vehicle-out-list':''}"><div><b>${esc(v.plate)}</b>${companyTag(v.company)}<span class="vehicle-status-badge ${out?'out':'ok'}">${out?'🔴 ΑΚΙΝΗΤΟ':'🟢 ΣΕ ΛΕΙΤΟΥΡΓΙΑ'}</span><div class="small">${esc(v.model||'')}</div>${out?`<div class="vehicle-problem-line">⚠️ ${esc(problem||'Χωρίς περιγραφή προβλήματος')}</div>`:''}</div><div class="actions"><button class="btn light" onclick="editVeh('${v.id}')">✏️</button><button class="btn ${v.active===false?'danger':'light'}" onclick="toggleVeh('${v.id}')">${v.active===false?'Ανενεργό':'Ενεργό'}</button><button class="btn danger" onclick="delVeh('${v.id}')">🗑️</button></div></div>`
    }).join(''):'Δεν υπάρχουν οχήματα.';
  };

  saveEmp=function(){
    let id=$('empId').value,n=$('empName').value.trim(),lf=$('empLeaveFrom').value,lt=$('empLeaveTo').value,lr=$('empLeaveReason').value,company=$('empCompany').value;
    if(!n)return alert('Συμπλήρωσε όνομα.');
    if(!validCompany(company))return alert('Επίλεξε εταιρεία: Ρόμβος Κλίμα ή Ρόμβος Ψυκτική.');
    if((lf&&!lt)||(!lf&&lt))return alert('Συμπλήρωσε και έναρξη και λήξη απουσίας.');
    if(lf&&lt&&lt<lf)return alert('Η λήξη απουσίας δεν μπορεί να είναι πριν από την έναρξη.');
    if(lf&&lt&&!lr)lr='Άδεια';
    let d={name:n,role:$('empRole').value.trim(),phone:$('empPhone').value.trim(),company:company,leaveFrom:lf,leaveTo:lt,leaveReason:lr};
    if(id){let e=E.find(x=>x.id===id);if(e)Object.assign(e,d)}else E.push({id:uid('EMP'),active:true,...d});
    clearEmp();save();render();renderBoard();
  };
  editEmp=function(id){
    let e=E.find(x=>x.id===id);if(!e)return;
    $('empId').value=id;$('empName').value=e.name||'';$('empRole').value=e.role||'';$('empPhone').value=e.phone||'';$('empCompany').value=validCompany(e.company)?e.company:'';$('empLeaveFrom').value=e.leaveFrom||'';$('empLeaveTo').value=e.leaveTo||'';$('empLeaveReason').value=e.leaveReason||'';
    focusEditor('emps','empName');
  };
  clearEmp=function(){
    $('empId').value='';$('empName').value='';$('empRole').value='';$('empPhone').value='';$('empCompany').value='';$('empLeaveFrom').value='';$('empLeaveTo').value='';$('empLeaveReason').value='';
  };

  saveVeh=function(){
    let id=$('vehId').value,p=$('vehPlate').value.trim(),company=$('vehCompany').value;
    if(!p)return alert('Συμπλήρωσε πινακίδα.');
    if(!validCompany(company))return alert('Επίλεξε εταιρεία: Ρόμβος Κλίμα ή Ρόμβος Ψυκτική.');
    if(!id&&V.some(v=>(v.plate||'').toLowerCase()===p.toLowerCase()))return alert('Υπάρχει ήδη όχημα με αυτή την πινακίδα.');
    const out=$('vehCondition')?.value==='out';
    const problem=String($('vehProblem')?.value||'').trim();
    if(out&&!problem)return alert('Γράψε ποιο πρόβλημα έχει το όχημα πριν το δηλώσεις Ακίνητο / Εκτός λειτουργίας.');
    let d={plate:p,model:$('vehModel').value.trim(),company:company,outOfService:out,problem:problem};
    if(id){let v=V.find(x=>x.id===id);if(v)Object.assign(v,d)}else V.push({id:uid('VEH'),active:true,...d});
    clearVeh();save();render();renderBoard();
  };
  editVeh=function(id){
    let v=V.find(x=>x.id===id);if(!v)return;
    $('vehId').value=id;$('vehPlate').value=v.plate||'';$('vehModel').value=v.model||'';$('vehCompany').value=validCompany(v.company)?v.company:'';
    if($('vehCondition'))$('vehCondition').value=v.outOfService?'out':'ok';
    if($('vehProblem'))$('vehProblem').value=v.problem||'';
    focusEditor('vehs','vehPlate');
  };
  clearVeh=function(){
    $('vehId').value='';$('vehPlate').value='';$('vehModel').value='';$('vehCompany').value='';
    if($('vehCondition'))$('vehCondition').value='ok';
    if($('vehProblem'))$('vehProblem').value='';
  };

  // Refresh only the two admin lists after the override is installed.
  try{renderLists()}catch(e){}
})();
