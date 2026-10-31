
/* v6.5.18 — φίλτρα Πελάτη / WH / FM / FMA / Συντηρητή + άμεση επικοινωνία */
(function(){
  const WH618={'310':'Θεσσαλονίκης','340':'Αθήνας','350':'Τρικάλων','380':'Πάτρας'};
  const e618=s=>{try{return esc(String(s??''))}catch(e){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}};
  const lines618=v=>Array.isArray(v)?v.filter(Boolean):String(v||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  const chain618=c=>{const s=((c?.category||'')+' '+(c?.name||'')).toLowerCase();if(s.includes('lidl'))return'lidl';if(s.includes('μασουτ')||s.includes('masout'))return'masoutis';if(s.includes('electra')||s.includes('ηλεκτρα'))return'electra';return'other'};
  const rank618=c=>({lidl:0,masoutis:1,electra:2,other:3}[chain618(c)]??3);
  const chainLabel618=c=>({lidl:'Lidl',masoutis:'Μασούτης',electra:'Electra',other:(c?.category||'Λοιπή επαφή')}[chain618(c)]||'Λοιπή επαφή');
  const canonicalRegion618=c=>{const code=String(c?.regionCode||'').trim();return WH618[code]||(c?.region||'').trim()||''};
  const regionDisplay618=c=>{const code=String(c?.regionCode||'').trim(),r=canonicalRegion618(c);return code?(r?`${r} (WH ${code})`:`WH ${code}`):(r||'')};
  const cleanTel618=v=>String(v||'').replace(/[^0-9+]/g,'');
  const linkTel618=v=>{v=String(v||'').trim();return v?`<a href="tel:${e618(cleanTel618(v))}">☎ ${e618(v)}</a>`:''};
  const linkMail618=v=>{v=String(v||'').trim();return v?`<a href="mailto:${e618(v)}">✉ ${e618(v)}</a>`:''};
  const fmLinks618=(phone1,phone2,email)=>[linkTel618(phone1),linkTel618(phone2),linkMail618(email)].filter(Boolean).join('');
  const allSearch618=c=>{const sites=(c?.sites||[]).map(s=>Object.values(s||{}).join(' ')).join(' ');const extras=(c?.extraContacts||[]).map(x=>Object.values(x||{}).join(' ')).join(' ');return [c?.name,c?.category,c?.storeNo,c?.city,c?.address,c?.phone,c?.email,c?.contact,c?.regionCode,canonicalRegion618(c),c?.facilityManager,c?.facilityManagerLandline,c?.facilityManagerMobile,c?.facilityManagerEmail,c?.facilityAssistant,c?.facilityAssistantLandline,c?.facilityAssistantMobile,c?.facilityAssistantEmail,c?.maintenanceOwner,c?.hotelGeneralManager,c?.hotelGeneralManagerPhone,c?.hotelGeneralManagerEmail,c?.hotelMaintenanceManager,c?.hotelMaintenancePhone,c?.hotelMaintenanceEmail,c?.hotelSubcontractor,c?.hotelSubcontractorPhone,c?.hotelSubcontractorEmail,...lines618(c?.extraPhones),...lines618(c?.extraEmails),extras,sites].filter(Boolean).join(' ').toLowerCase()};

  function setOptions618(id,items,placeholder,formatter){
    const el=$(id);if(!el)return;const cur=el.value;const uniq=[...new Set(items.filter(Boolean).map(x=>String(x).trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'el',{numeric:true}));
    el.innerHTML=`<option value="">${e618(placeholder)}</option>`+uniq.map(v=>`<option value="${e618(v)}">${e618(formatter?formatter(v):v)}</option>`).join('');
    if(uniq.includes(cur))el.value=cur;
  }
  function populateFilters618(){
    const list=Array.isArray(C)?C:[];
    const regions=[];list.forEach(c=>{const code=String(c.regionCode||'').trim(),r=canonicalRegion618(c);if(code)regions.push('WH:'+code);else if(r)regions.push('REG:'+r)});
    setOptions618('cliRegionFilter',regions,'Όλες οι Περιφέρειες',v=>{if(v.startsWith('WH:')){const code=v.slice(3);return `WH ${code} — ${WH618[code]||''}`.trim()}return v.slice(4)});
    setOptions618('cliFMFilter',list.map(c=>c.facilityManager),'Όλοι οι FM');
    setOptions618('cliFMAFilter',list.map(c=>c.facilityAssistant),'Όλοι οι FMA');
    setOptions618('cliOwnerFilter',list.map(c=>c.maintenanceOwner||c.hotelMaintenanceManager),'Όλοι οι συντηρητές');
  }
  function regionMatches618(c,v){if(!v)return true;if(v.startsWith('WH:'))return String(c.regionCode||'').trim()===v.slice(3);if(v.startsWith('REG:'))return canonicalRegion618(c)===v.slice(4);return true}
  function mainContactHtml618(c){const phones=[c.phone,...lines618(c.extraPhones)].filter(Boolean),emails=[c.email,...lines618(c.extraEmails)].filter(Boolean);let h=phones.map(linkTel618).join('');if(emails.length)h+=(h?'<br>':'')+emails.map(linkMail618).join('');if(!h&&c.contact)h=e618(c.contact);return h||'—'}
  function managersHtml618(c){
    if(chain618(c)==='lidl'){
      const fm=`<div class="fm-block"><div class="fm-role">FM</div><div class="fm-name">${e618(c.facilityManager||'—')}</div><div class="quick-links">${fmLinks618(c.facilityManagerLandline,c.facilityManagerMobile,c.facilityManagerEmail)||'<span class="small">χωρίς τηλέφωνο/email</span>'}</div></div>`;
      const fma=`<div class="fm-block"><div class="fm-role">FMA</div><div class="fm-name">${e618(c.facilityAssistant||'—')}</div><div class="quick-links">${fmLinks618(c.facilityAssistantLandline,c.facilityAssistantMobile,c.facilityAssistantEmail)||'<span class="small">χωρίς τηλέφωνο/email</span>'}</div></div>`;
      return fm+fma;
    }
    let arr=[];if(c.contact)arr.push(['Υπεύθυνος',c.contact,c.phone,c.email]);if(c.hotelGeneralManager)arr.push(['Γεν. Διευθυντής',c.hotelGeneralManager,c.hotelGeneralManagerPhone,c.hotelGeneralManagerEmail]);if(c.hotelMaintenanceManager)arr.push(['Υπεύθ. Συντήρησης',c.hotelMaintenanceManager,c.hotelMaintenancePhone,c.hotelMaintenanceEmail]);(c.extraContacts||[]).slice(0,2).forEach(x=>arr.push([x.role||'Υπεύθυνος',x.name,x.phone,x.email]));
    return arr.length?arr.map(x=>`<div class="fm-block"><div class="fm-role">${e618(x[0])}</div><div class="fm-name">${e618(x[1]||'—')}</div><div class="quick-links">${[linkTel618(x[2]),linkMail618(x[3])].filter(Boolean).join('')}</div></div>`).join(''):'—';
  }
  function updateSummary618(list){const el=$('contactFilterSummary');if(!el)return;const fms=[...new Set(list.map(c=>c.facilityManager).filter(Boolean))],fmas=[...new Set(list.map(c=>c.facilityAssistant).filter(Boolean))],owners=[...new Set(list.map(c=>c.maintenanceOwner||c.hotelMaintenanceManager).filter(Boolean))];const short=a=>a.length?a.slice(0,8).map(e618).join(', ')+(a.length>8?` +${a.length-8}`:''):'—';el.innerHTML=`<b>${list.length}</b> επαφές / καταστήματα &nbsp;•&nbsp; <b>FM:</b> ${short(fms)} &nbsp;•&nbsp; <b>FMA:</b> ${short(fmas)} &nbsp;•&nbsp; <b>Συντηρητές:</b> ${short(owners)}`}
  function updateManagerDirectory618(list){const el=$('contactManagerDirectory');if(!el)return;const chain=$('cliChainFilter')?.value||'all',region=$('cliRegionFilter')?.value||'',fmf=$('cliFMFilter')?.value||'',fmaf=$('cliFMAFilter')?.value||'';const show=chain==='lidl'||!!region||!!fmf||!!fmaf;if(!show){el.classList.remove('show');el.innerHTML='';return}const groups=new Map();list.filter(c=>chain618(c)==='lidl'&&(c.facilityManager||c.facilityAssistant)).forEach(c=>{const key=(c.facilityManager||'')+'|'+(c.facilityAssistant||'');if(!groups.has(key))groups.set(key,[]);groups.get(key).push(c)});const cards=[...groups.values()].map(rows=>{const first=rows[0],pick=f=>rows.map(x=>x[f]).find(Boolean)||'',reg=[...new Set(rows.map(c=>regionDisplay618(c)).filter(Boolean))].join(', ');return `<div class="manager-card"><div class="manager-card-head">${e618(reg||'Lidl')} • ${rows.length} καταστ.</div><div class="manager-pair"><div><span class="fm-role">FM</span><b>${e618(first.facilityManager||'—')}</b><div class="quick-links">${fmLinks618(pick('facilityManagerLandline'),pick('facilityManagerMobile'),pick('facilityManagerEmail'))||'<span class="small">Δεν έχουν καταχωρηθεί τηλέφωνο/email</span>'}</div></div><div><span class="fm-role">FMA</span><b>${e618(first.facilityAssistant||'—')}</b><div class="quick-links">${fmLinks618(pick('facilityAssistantLandline'),pick('facilityAssistantMobile'),pick('facilityAssistantEmail'))||'<span class="small">Δεν έχουν καταχωρηθεί τηλέφωνο/email</span>'}</div></div></div></div>`}).join('');el.innerHTML=cards;el.classList.toggle('show',!!cards)}

  window.setContactChainFilter=function(v,btn){if($('cliChainFilter'))$('cliChainFilter').value=v;document.querySelectorAll('.contact-quick').forEach(b=>b.classList.toggle('active',b.dataset.chain===v));renderClients()};
  window.clearContactFilters=function(){if($('cliSearch'))$('cliSearch').value='';if($('cliChainFilter'))$('cliChainFilter').value='all';['cliRegionFilter','cliFMFilter','cliFMAFilter','cliOwnerFilter'].forEach(id=>{if($(id))$(id).value=''});document.querySelectorAll('.contact-quick').forEach(b=>b.classList.toggle('active',b.dataset.chain==='all'));renderClients()};

  window.renderClients=function(){
    populateFilters618();
    const q=($('cliSearch')?.value||'').trim().toLowerCase(),chain=$('cliChainFilter')?.value||'all',region=$('cliRegionFilter')?.value||'',fm=$('cliFMFilter')?.value||'',fma=$('cliFMAFilter')?.value||'',owner=$('cliOwnerFilter')?.value||'';
    document.querySelectorAll('.contact-quick').forEach(b=>b.classList.toggle('active',b.dataset.chain===chain));
    let list=(Array.isArray(C)?C:[]).filter(c=>{
      if(q&&!allSearch618(c).includes(q))return false;
      const ch=chain618(c);if(chain!=='all'&&ch!==chain)return false;
      if(!regionMatches618(c,region))return false;
      if(fm&&String(c.facilityManager||'')!==fm)return false;
      if(fma&&String(c.facilityAssistant||'')!==fma)return false;
      if(owner&&String(c.maintenanceOwner||c.hotelMaintenanceManager||'')!==owner)return false;
      if(status==='active'&&c.active===false)return false;
      if(status==='inactive'&&c.active!==false)return false;
      return true;
    });
    list.sort((a,b)=>rank618(a)-rank618(b)||(String(a.regionCode||'').localeCompare(String(b.regionCode||''),undefined,{numeric:true}))||(a.name||'').localeCompare(b.name||'','el'));
    window.__clientsCache=list;updateSummary618(list);updateManagerDirectory618(list);const body=$('clientsBody');if(!body)return;
    body.innerHTML=list.length?list.map((c,i)=>{const ch=chain618(c),major=ch!=='other',reg=regionDisplay618(c)||c.city||'—',ownerName=c.maintenanceOwner||c.hotelMaintenanceManager||'—';return `<tr class="${major?'major-contact':''}"><td><b class="client-name-main">${e618(c.name||'—')}</b>${major?'<span class="major-badge">ΒΑΣΙΚΟΣ</span>':''}<div class="client-sub">${e618([c.storeNo,c.city,c.address].filter(Boolean).join(' • '))}</div></td><td><b>${e618(chainLabel618(c))}</b><div class="client-sub">${e618(reg)}</div>${c.regionCode?`<span class="wh-badge">WH ${e618(c.regionCode)}</span>`:''}</td><td>${managersHtml618(c)}</td><td><div class="contact-main-lines">${mainContactHtml618(c)}</div></td><td><span class="owner-strong">${e618(ownerName)}</span></td><td><div class="actions"><button class="btn primary" type="button" onclick="viewClientAt(${i})">👁️ Προβολή</button><button class="btn light" type="button" onclick="editClientAt(${i})">✏️ Επεξεργασία</button></div></td></tr>`}).join(''):'<tr><td colspan="6">Δεν βρέθηκαν επαφές με αυτά τα φίλτρα.</td></tr>';
  };

  // Επιβάλλουμε τις συμφωνημένες αντιστοιχίες WH και στα ήδη αποθηκευμένα δεδομένα.
  try{let changed=false;(Array.isArray(C)?C:[]).forEach(c=>{const code=String(c.regionCode||'').trim();if(WH618[code]&&c.region!==WH618[code]){c.region=WH618[code];changed=true}(c.sites||[]).forEach(s=>{const sc=String(s.regionCode||'').trim();if(WH618[sc]&&s.region!==WH618[sc]){s.region=WH618[sc];changed=true}})});if(changed)save()}catch(e){}
  populateFilters618();renderClients();
})();
