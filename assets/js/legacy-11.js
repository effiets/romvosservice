
/* v6.5.19 — καθαρές Επαφές, λειτουργική Προβολή και μόνο αριθμός φίλτρου */
(function(){
  const WH619={'310':'Θεσσαλονίκης','340':'Αθήνας','350':'Τρικάλων','380':'Πάτρας'};
  const q619=id=>document.getElementById(id);
  const esc619=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const norm619=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const lines619=v=>Array.isArray(v)?v.map(x=>String(x||'').trim()).filter(Boolean):String(v||'').split(/\r?\n|;/).map(x=>x.trim()).filter(Boolean);
  const chain619=c=>{const s=norm619((c?.category||'')+' '+(c?.name||''));if(s.includes('lidl'))return'lidl';if(s.includes('μασουτ')||s.includes('masout'))return'masoutis';if(s.includes('electra')||s.includes('ηλεκτρα'))return'electra';return'other'};
  const rank619=c=>({lidl:0,masoutis:1,electra:2,other:3}[chain619(c)]??3);
  const chainLabel619=c=>({lidl:'Lidl',masoutis:'Μασούτης',electra:'Electra Hotels',other:(c?.category||'Λοιπή επαφή')}[chain619(c)]||'Λοιπή επαφή');
  const regionName619=c=>{const code=String(c?.regionCode||'').trim();return WH619[code]||(c?.region||'').trim()||''};
  const regionDisplay619=c=>{const code=String(c?.regionCode||'').trim(),r=regionName619(c);return code?(r?`${r} (WH ${code})`:`WH ${code}`):(r||'')};
  const cleanTel619=v=>String(v||'').replace(/[^0-9+]/g,'');
  const tel619=v=>{v=String(v||'').trim();return v?`<a href="tel:${esc619(cleanTel619(v))}">☎ ${esc619(v)}</a>`:''};
  const mail619=v=>{v=String(v||'').trim();return v?`<a href="mailto:${esc619(v)}">✉ ${esc619(v)}</a>`:''};
  const quick619=(p1,p2,e)=>[tel619(p1),tel619(p2),mail619(e)].filter(Boolean).join(' ');
  const allData619=()=>Array.isArray(typeof C!=='undefined'?C:null)?C:[];

  const searchBlob619=c=>{
    const sites=(c?.sites||[]).map(s=>Object.values(s||{}).join(' ')).join(' ');
    const extras=(c?.extraContacts||[]).map(x=>typeof x==='string'?x:Object.values(x||{}).join(' ')).join(' ');
    return norm619([
      c?.name,c?.category,c?.storeNo,c?.city,c?.address,c?.phone,c?.email,c?.contact,
      c?.regionCode,regionName619(c),c?.facilityManager,c?.facilityManagerLandline,
      c?.facilityManagerMobile,c?.facilityManagerEmail,c?.facilityAssistant,
      c?.facilityAssistantLandline,c?.facilityAssistantMobile,c?.facilityAssistantEmail,
      c?.maintenanceOwner,c?.hotelGeneralManager,c?.hotelGeneralManagerPhone,
      c?.hotelGeneralManagerEmail,c?.hotelMaintenanceManager,c?.hotelMaintenancePhone,
      c?.hotelMaintenanceEmail,c?.hotelSubcontractor,c?.hotelSubcontractorPhone,
      c?.hotelSubcontractorEmail,...lines619(c?.extraPhones),...lines619(c?.extraEmails),
      extras,sites
    ].filter(Boolean).join(' '));
  };

  function setOptions619(id,items,placeholder,fmt){
    const el=q619(id);if(!el)return;
    const cur=el.value;
    const vals=[...new Set(items.filter(Boolean).map(x=>String(x).trim()).filter(Boolean))]
      .sort((a,b)=>a.localeCompare(b,'el',{numeric:true}));
    el.innerHTML=`<option value="">${esc619(placeholder)}</option>`+
      vals.map(v=>`<option value="${esc619(v)}">${esc619(fmt?fmt(v):v)}</option>`).join('');
    if(vals.includes(cur))el.value=cur;
  }

  function populateFilters619(){
    const list=allData619(), regions=[];
    list.forEach(c=>{
      const code=String(c.regionCode||'').trim(),r=regionName619(c);
      if(code)regions.push('WH:'+code); else if(r)regions.push('REG:'+r);
    });
    setOptions619('cliRegionFilter',regions,'Όλες οι Περιφέρειες',v=>{
      if(v.startsWith('WH:')){const code=v.slice(3);return `WH ${code} — ${WH619[code]||''}`.trim()}
      return v.slice(4);
    });
    setOptions619('cliFMFilter',list.map(c=>c.facilityManager),'Όλοι οι FM');
    setOptions619('cliFMAFilter',list.map(c=>c.facilityAssistant),'Όλοι οι FMA');
    setOptions619('cliOwnerFilter',list.map(c=>c.maintenanceOwner||c.hotelMaintenanceManager),'Όλοι οι συντηρητές');
  }

  function regionMatches619(c,v){
    if(!v)return true;
    if(v.startsWith('WH:'))return String(c.regionCode||'').trim()===v.slice(3);
    if(v.startsWith('REG:'))return regionName619(c)===v.slice(4);
    return true;
  }

  function managers619(c){
    if(chain619(c)==='lidl'){
      return `<div class="fm-block"><div class="fm-role">FM</div><div class="fm-name">${esc619(c.facilityManager||'—')}</div><div class="quick-links">${quick619(c.facilityManagerLandline,c.facilityManagerMobile,c.facilityManagerEmail)||'<span class="small">χωρίς τηλέφωνο/email</span>'}</div></div>
      <div class="fm-block"><div class="fm-role">FMA</div><div class="fm-name">${esc619(c.facilityAssistant||'—')}</div><div class="quick-links">${quick619(c.facilityAssistantLandline,c.facilityAssistantMobile,c.facilityAssistantEmail)||'<span class="small">χωρίς τηλέφωνο/email</span>'}</div></div>`;
    }
    let a=[];
    if(c.contact)a.push(['Υπεύθυνος',c.contact,c.phone,c.email]);
    if(c.hotelGeneralManager)a.push(['Γεν. Διευθυντής',c.hotelGeneralManager,c.hotelGeneralManagerPhone,c.hotelGeneralManagerEmail]);
    if(c.hotelMaintenanceManager)a.push(['Υπεύθ. Συντήρησης',c.hotelMaintenanceManager,c.hotelMaintenancePhone,c.hotelMaintenanceEmail]);
    (Array.isArray(c.extraContacts)?c.extraContacts:[]).slice(0,2).forEach(x=>a.push([x.role||'Υπεύθυνος',x.name,x.phone,x.email]));
    return a.length?a.map(x=>`<div class="fm-block"><div class="fm-role">${esc619(x[0])}</div><div class="fm-name">${esc619(x[1]||'—')}</div><div class="quick-links">${[tel619(x[2]),mail619(x[3])].filter(Boolean).join(' ')}</div></div>`).join(''):'—';
  }

  function mainContact619(c){
    const phones=[c.phone,...lines619(c.extraPhones)].filter(Boolean);
    const emails=[c.email,...lines619(c.extraEmails)].filter(Boolean);
    return [phones.map(tel619).join(' '),emails.map(mail619).join(' ')].filter(Boolean).join('<br>')||'—';
  }

  function filtersActive619(){
    return !!(
      (q619('cliSearch')?.value||'').trim() ||
      ((q619('cliChainFilter')?.value||'all')!=='all') ||
      (q619('cliRegionFilter')?.value||'') ||
      (q619('cliFMFilter')?.value||'') ||
      (q619('cliFMAFilter')?.value||'') ||
      (q619('cliOwnerFilter')?.value||'') ||
      ((q619('cliStatusFilter')?.value||'active')!=='active')
    );
  }

  function showCount619(n){
    const el=q619('contactFilterCount');if(!el)return;
    if(!filtersActive619()){el.style.display='none';el.textContent='';return}
    el.style.display='block';
    el.innerHTML=`<b>${n}</b>${n===1?'κατάστημα':'καταστήματα'}`;
  }

  window.setContactChainFilter=function(v){
    if(q619('cliChainFilter'))q619('cliChainFilter').value=v;
    document.querySelectorAll('.contact-quick').forEach(b=>b.classList.toggle('active',b.dataset.chain===v));
    window.renderClients();
  };

  window.clearContactFilters=function(){
    if(q619('cliSearch'))q619('cliSearch').value='';
    if(q619('cliChainFilter'))q619('cliChainFilter').value='all';
    ['cliRegionFilter','cliFMFilter','cliFMAFilter','cliOwnerFilter'].forEach(id=>{if(q619(id))q619(id).value=''});
    if(q619('cliStatusFilter'))q619('cliStatusFilter').value='active';
    document.querySelectorAll('.contact-quick').forEach(b=>b.classList.toggle('active',b.dataset.chain==='all'));
    window.renderClients();
  };

  window.renderClients=function(){
    populateFilters619();
    const q=norm619((q619('cliSearch')?.value||'').trim());
    const chain=q619('cliChainFilter')?.value||'all';
    const region=q619('cliRegionFilter')?.value||'';
    const fm=q619('cliFMFilter')?.value||'';
    const fma=q619('cliFMAFilter')?.value||'';
    const owner=q619('cliOwnerFilter')?.value||'';
    const status=q619('cliStatusFilter')?.value||'active';

    document.querySelectorAll('.contact-quick').forEach(b=>b.classList.toggle('active',b.dataset.chain===chain));

    let list=allData619().filter(c=>{
      if(q&&!searchBlob619(c).includes(q))return false;
      const ch=chain619(c);
      if(chain!=='all'&&ch!==chain)return false;
      if(!regionMatches619(c,region))return false;
      if(fm&&String(c.facilityManager||'')!==fm)return false;
      if(fma&&String(c.facilityAssistant||'')!==fma)return false;
      if(owner&&String(c.maintenanceOwner||c.hotelMaintenanceManager||'')!==owner)return false;
      // v6.5.27 — πραγματικό φίλτρο κατάστασης. Τιμές χωρίς active θεωρούνται ενεργές.
      const inactive=(c.active===false || c.active===0 || String(c.active).trim().toLowerCase()==='false');
      if(status==='active'&&inactive)return false;
      if(status==='inactive'&&!inactive)return false;
      return true;
    });

    list.sort((a,b)=>rank619(a)-rank619(b)||
      String(a.regionCode||'').localeCompare(String(b.regionCode||''),undefined,{numeric:true})||
      (a.name||'').localeCompare(b.name||'','el'));

    window.__clientsCache=list;
    showCount619(list.length);

    const body=q619('clientsBody');if(!body)return;
    body.innerHTML=list.length?list.map((c,i)=>{
      const major=chain619(c)!=='other';
      const inactive=c.active===false;
      const reg=regionDisplay619(c)||c.city||'—';
      const ownerName=c.maintenanceOwner||c.hotelMaintenanceManager||'—';
      return `<tr class="${major?'major-contact ':''}${inactive?'inactive-contact':''}">
        <td><b class="client-name-main">${esc619(c.name||'—')}</b>${major?'<span class="major-badge">ΒΑΣΙΚΟΣ</span>':''}${inactive?'<span class="inactive-badge">ΑΝΕΝΕΡΓΟ</span>':''}<div class="client-sub">${esc619([c.storeNo,c.city,c.address].filter(Boolean).join(' • '))}</div>${inactive?'<div class="inactive-note">Εκτός λίστας συντήρησης</div>':''}</td>
        <td><b>${esc619(chainLabel619(c))}</b><div class="client-sub">${esc619(reg)}</div>${c.regionCode?`<span class="wh-badge">WH ${esc619(c.regionCode)}</span>`:''}</td>
        <td>${managers619(c)}</td>
        <td><div class="contact-main-lines">${mainContact619(c)}</div></td>
        <td><span class="owner-strong">${esc619(ownerName)}</span></td>
        <td><div class="actions"><button class="btn primary" type="button" onclick="viewClientAt(${i})">👁️ Προβολή</button><button class="btn light" type="button" onclick="editClientAt(${i})">✏️ Επεξεργασία</button></div></td>
      </tr>`;
    }).join(''):'<tr><td colspan="6">Δεν βρέθηκαν επαφές με αυτά τα φίλτρα.</td></tr>';
  };

  const viewItem619=(label,val,raw=false)=>`<div class="contact-view-item"><b>${esc619(label)}</b><span>${raw?(val||'—'):esc619((val===undefined||val===null||String(val).trim()==='')?'—':String(val))}</span></div>`;
  const viewSection619=(title,items)=>`<div class="contact-view-section"><h3>${esc619(title)}</h3><div class="contact-view-grid">${items.map(x=>viewItem619(x[0],x[1],!!x[2])).join('')}</div></div>`;

  window.viewClientAt=function(i){
    try{
      const c=window.__clientsCache?.[i];if(!c)return;
      const name=q619('contactViewName'),sub=q619('contactViewSubtitle'),body=q619('contactViewBody'),overlay=q619('contactViewOverlay');
      if(!name||!sub||!body||!overlay)return;

      name.textContent=c.name||'Προβολή επαφής';
      sub.textContent=chainLabel619(c)+(c.active===false?' • ΑΝΕΝΕΡΓΟ — εκτός λίστας συντήρησης':' • Ενεργό');

      let h=(c.active===false?'<div class="contact-status-banner inactive">ΑΝΕΝΕΡΓΟ — Το κατάστημα έχει βγει από τη λίστα συντήρησης / αρμοδιότητά μας. Τα στοιχεία του διατηρούνται κανονικά.</div>':'')+viewSection619('Στοιχεία επικοινωνίας',[
        ['Κατάσταση',c.active===false?'Ανενεργό — εκτός λίστας συντήρησης':'Ενεργό — στη λίστα συντήρησης'],
        ['Κύριο τηλέφωνο',tel619(c.phone)||'—',true],
        ['Κύριο Email',mail619(c.email)||'—',true],
        ['Επιπλέον τηλέφωνα',lines619(c.extraPhones).map(tel619).join('<br>')||'—',true],
        ['Επιπλέον Email',lines619(c.extraEmails).map(mail619).join('<br>')||'—',true],
        ['Υπεύθυνος επικοινωνίας',c.contact],
        ['Πόλη',c.city],['Διεύθυνση',c.address],
        ['Περιφέρεια / WH',regionDisplay619(c)],
        ['Υπεύθυνος Συντηρητής',c.maintenanceOwner||c.hotelMaintenanceManager]
      ]);

      if(chain619(c)==='lidl'){
        h+=viewSection619('LIDL — Facility Management',[
          ['Κωδικός καταστήματος',c.storeNo],['WH',c.regionCode],['Περιφέρεια',regionName619(c)],
          ['Facility Manager',c.facilityManager],
          ['FM — Σταθερό',tel619(c.facilityManagerLandline)||'—',true],
          ['FM — Κινητό',tel619(c.facilityManagerMobile)||'—',true],
          ['FM — Email',mail619(c.facilityManagerEmail)||'—',true],
          ['Facility Manager Assistant',c.facilityAssistant],
          ['FMA — Σταθερό',tel619(c.facilityAssistantLandline)||'—',true],
          ['FMA — Κινητό',tel619(c.facilityAssistantMobile)||'—',true],
          ['FMA — Email',mail619(c.facilityAssistantEmail)||'—',true]
        ]);
      }

      if(chain619(c)==='masoutis'){
        h+=viewSection619('Μασούτης — Κατάστημα',[
          ['Αριθμός καταστήματος',c.storeNo],
          ['Περιφέρεια / WH',regionDisplay619(c)],
          ['Υπεύθυνος Συντηρητής',c.maintenanceOwner]
        ]);
      }

      if(chain619(c)==='electra'){
        h+=viewSection619('Electra Hotels — Υπεύθυνοι',[
          ['Γενικός Διευθυντής',c.hotelGeneralManager],
          ['Τηλέφωνο Γενικού Διευθυντή',tel619(c.hotelGeneralManagerPhone)||'—',true],
          ['Email Γενικού Διευθυντή',mail619(c.hotelGeneralManagerEmail)||'—',true],
          ['Υπεύθυνος Συντήρησης',c.hotelMaintenanceManager],
          ['Τηλέφωνο Υπεύθυνου Συντήρησης',tel619(c.hotelMaintenancePhone)||'—',true],
          ['Email Υπεύθυνου Συντήρησης',mail619(c.hotelMaintenanceEmail)||'—',true],
          ['Εκτέλεση εργασιών',c.hotelExecution],['Υπεργολάβος',c.hotelSubcontractor],
          ['Τηλέφωνο Υπεργολάβου',tel619(c.hotelSubcontractorPhone)||'—',true],
          ['Email Υπεργολάβου',mail619(c.hotelSubcontractorEmail)||'—',true]
        ]);
      }

      const extras=Array.isArray(c.extraContacts)?c.extraContacts:[];
      if(extras.length){
        h+=`<div class="contact-view-section"><h3>Υπεύθυνοι / Ρόλοι</h3><div class="contact-view-sites">${extras.map(x=>{
          if(typeof x==='string')return `<div class="contact-view-site"><div>${esc619(x)}</div></div>`;
          return `<div class="contact-view-site"><b>${esc619([x.role,x.name].filter(Boolean).join(' — ')||'Υπεύθυνος')}</b><div>${[tel619(x.phone),mail619(x.email)].filter(Boolean).join(' ')||'—'}</div></div>`;
        }).join('')}</div></div>`;
      }

      const sites=Array.isArray(c.sites)?c.sites:[];
      if(sites.length){
        h+=`<div class="contact-view-section"><h3>Εγκαταστάσεις / Καταστήματα (${sites.length})</h3><div class="contact-view-sites">${sites.map((s,n)=>{
          const title=[s.storeNo&&('Κατ. '+s.storeNo),s.name].filter(Boolean).join(' — ')||('Εγκατάσταση '+(n+1));
          const code=String(s.regionCode||'').trim(),r=WH619[code]||s.region||'';
          const contacts=[s.city,s.address,tel619(s.phone),mail619(s.email),s.contact&&esc619(s.contact)].filter(Boolean).join('<br>');
          return `<div class="contact-view-site"><b>${esc619(title)}</b><div>${contacts||'—'}</div><div class="site-meta"><b>Περιφέρεια:</b> ${esc619(r?`${r}${code?' (WH '+code+')':''}`:(code?'WH '+code:'—'))}<br><b>Υπεύθυνος Συντηρητής:</b> ${esc619(s.maintenanceOwner||'—')}</div></div>`;
        }).join('')}</div></div>`;
      }

      if(c.notes)h+=`<div class="contact-view-section"><h3>Σημειώσεις</h3><div class="contact-view-notes">${esc619(c.notes)}</div></div>`;
      body.innerHTML=h;
      overlay.classList.add('open');
    }catch(err){
      console.error(err);
      alert('Δεν ήταν δυνατή η προβολή της επαφής.');
    }
  };

  window.closeContactView=function(){q619('contactViewOverlay')?.classList.remove('open')};

  // Keep old role values in storage if they exist; they are simply no longer shown.
  try{
    window.getContactRolesFromForm=function(){
      const id=q619('cliId')?.value||'';
      const c=allData619().find(x=>x.id===id);
      return Array.isArray(c?.contactRoles)?c.contactRoles:[];
    };
  }catch(e){}

  try{document.querySelector('.contact-role-box')?.remove()}catch(e){}
  populateFilters619();
  window.renderClients();
})();
