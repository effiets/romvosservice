
/* v6.5.16 — Επαφές: μόνο Lidl / Μασούτης / Electra στην οθόνη, χωρίς οικονομικά στοιχεία */
(function(){
  function chainOfContact(c){
    try{ if(typeof clientChain==='function') return clientChain(c); }catch(e){}
    const s=((c?.category||'')+' '+(c?.name||'')).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    if(s.includes('lidl'))return 'lidl';
    if(s.includes('μασουτ')||s.includes('masout'))return 'masoutis';
    if(s.includes('electra'))return 'electra';
    return '';
  }
  function chainLabel(c){
    const ch=chainOfContact(c);
    return ch==='lidl'?'LIDL':ch==='masoutis'?'Μασούτης':ch==='electra'?'Electra Hotels':(c?.category||'—');
  }
  function value(v){return (v===undefined||v===null||String(v).trim()==='')?'—':String(v)}
  function item(label,val){return `<div class="contact-view-item"><b>${esc(label)}</b><span>${esc(value(val))}</span></div>`}
  function section(title,items){const rows=items.filter(x=>x&&x[0]);return `<div class="contact-view-section"><h3>${esc(title)}</h3><div class="contact-view-grid">${rows.map(x=>item(x[0],x[1])).join('')}</div></div>`}
  function contactSearchBlob(c){
    const sites=(c?.sites||[]).map(s=>Object.values(s||{}).join(' ')).join(' ');
    return [c?.name,c?.category,c?.phone,c?.email,c?.contact,c?.city,c?.address,c?.storeNo,c?.region,c?.maintenanceOwner,
      c?.facilityManager,c?.facilityManagerLandline,c?.facilityManagerMobile,c?.facilityManagerEmail,
      c?.facilityAssistant,c?.facilityAssistantLandline,c?.facilityAssistantMobile,c?.facilityAssistantEmail,
      c?.hotelGeneralManager,c?.hotelGeneralManagerPhone,c?.hotelGeneralManagerEmail,c?.hotelMaintenanceManager,
      c?.hotelMaintenancePhone,c?.hotelMaintenanceEmail,c?.hotelSubcontractor,c?.hotelSubcontractorPhone,
      c?.hotelSubcontractorEmail,c?.notes,sites].filter(Boolean).join(' ').toLowerCase();
  }

  // Οριστική λειτουργική προβολή της λίστας. Δεν διαγράφει καμία άλλη επαφή από το C/localStorage.
  renderClients=function(){
    const q=($('cliSearch')?.value||'').trim().toLowerCase();
    const list=(Array.isArray(C)?C:[])
      .filter(c=>['lidl','masoutis','electra'].includes(chainOfContact(c)))
      .filter(c=>!q||contactSearchBlob(c).includes(q))
      .sort((a,b)=>(a.name||'').localeCompare(b.name||'','el'));
    window.__clientsCache=list;
    const body=$('clientsBody');if(!body)return;
    body.innerHTML=list.length?list.map((c,i)=>{
      const ch=chainOfContact(c);
      const area=[c.region,c.city].filter(Boolean).join(' • ')||'—';
      const fm=ch==='lidl'?c.facilityManager:'';
      const fmInfo=ch==='lidl'?[c.facilityManagerLandline,c.facilityManagerMobile,c.facilityManagerEmail].filter(Boolean).join(' • '):'';
      const fa=ch==='lidl'?c.facilityAssistant:'';
      const faInfo=ch==='lidl'?[c.facilityAssistantLandline,c.facilityAssistantMobile,c.facilityAssistantEmail].filter(Boolean).join(' • '):'';
      const maint=ch==='electra'?(c.hotelMaintenanceManager||c.maintenanceOwner):(c.maintenanceOwner||'');
      const sub=[c.address,c.email].filter(Boolean).join(' • ');
      return `<tr>
        <td><b class="client-name-main">${esc(c.name||'—')}</b><div class="client-sub">${esc(sub)}</div></td>
        <td><b>${esc(chainLabel(c))}</b><div class="client-sub">${esc(area)}</div></td>
        <td>${esc(c.phone||c.hotelMaintenancePhone||'—')}</td>
        <td><span class="client-person">${esc(fm||'—')}</span><div class="client-contact-small">${esc(fmInfo)}</div></td>
        <td><span class="client-person">${esc(fa||'—')}</span><div class="client-contact-small">${esc(faInfo)}</div></td>
        <td>${esc(maint||'—')}</td>
        <td><div class="actions"><button class="btn primary" type="button" onclick="viewClientAt(${i})">👁️ Προβολή</button><button class="btn light" type="button" onclick="editClientAt(${i})">✏️ Επεξεργασία</button></div></td>
      </tr>`;
    }).join(''):'<tr><td colspan="7">Δεν υπάρχουν καταχωρημένοι πελάτες Lidl, Μασούτης ή Electra.</td></tr>';
  };

  window.viewClientAt=function(i){
    const c=window.__clientsCache?.[i];if(!c)return;
    const ch=chainOfContact(c);
    $('contactViewName').textContent=c.name||'Προβολή επαφής';
    $('contactViewSubtitle').textContent=chainLabel(c)+(c.active===false?' • Ανενεργός':'');
    let html='';
    html+=section('Βασικά στοιχεία',[
      ['Τηλέφωνο',c.phone],['Email',c.email],['Υπεύθυνος επικοινωνίας',c.contact],['Πόλη',c.city],['Διεύθυνση',c.address],['Περιοχή / Περιφέρεια',c.region]
    ]);
    if(ch==='lidl'){
      html+=section('LIDL — Υπεύθυνοι',[
        ['Κωδικός καταστήματος',c.storeNo],['Υπεύθυνος Συντήρησης',c.maintenanceOwner],
        ['Facility Manager',c.facilityManager],['FM — Σταθερό',c.facilityManagerLandline],['FM — Κινητό',c.facilityManagerMobile],['FM — Email',c.facilityManagerEmail],
        ['Facility Manager Assistant',c.facilityAssistant],['Assistant — Σταθερό',c.facilityAssistantLandline],['Assistant — Κινητό',c.facilityAssistantMobile],['Assistant — Email',c.facilityAssistantEmail]
      ]);
    }else if(ch==='masoutis'){
      html+=section('Μασούτης — Υπεύθυνοι',[
        ['Αριθμός καταστήματος',c.storeNo],['Τηλέφωνο καταστήματος',c.phone],['Υπεύθυνος Συντήρησης / Ανάδοχος',c.maintenanceOwner]
      ]);
    }else if(ch==='electra'){
      html+=section('Electra Hotels — Υπεύθυνοι',[
        ['Γενικός Διευθυντής',c.hotelGeneralManager],['Τηλέφωνο Γενικού Διευθυντή',c.hotelGeneralManagerPhone],['Email Γενικού Διευθυντή',c.hotelGeneralManagerEmail],
        ['Υπεύθυνος Συντήρησης',c.hotelMaintenanceManager],['Τηλέφωνο Υπεύθυνου Συντήρησης',c.hotelMaintenancePhone],['Email Υπεύθυνου Συντήρησης',c.hotelMaintenanceEmail],
        ['Εκτέλεση εργασιών',c.hotelExecution],['Υπεργολάβος',c.hotelSubcontractor],['Τηλέφωνο Υπεργολάβου',c.hotelSubcontractorPhone],['Email Υπεργολάβου',c.hotelSubcontractorEmail]
      ]);
    }
    const sites=Array.isArray(c.sites)?c.sites:[];
    if(sites.length){
      html+=`<div class="contact-view-section"><h3>Εγκαταστάσεις / Καταστήματα (${sites.length})</h3><div class="contact-view-sites">${sites.map((s,n)=>{
        const title=[s.storeNo&&('Κατ. '+s.storeNo),s.name].filter(Boolean).join(' — ')||('Εγκατάσταση '+(n+1));
        const lines=[s.city,s.address,s.phone,s.contact].filter(Boolean);
        return `<div class="contact-view-site"><b>${esc(title)}</b><div>${lines.map(esc).join('<br>')}</div></div>`;
      }).join('')}</div></div>`;
    }
    if(c.notes){html+=`<div class="contact-view-section"><h3>Σημειώσεις</h3><div class="contact-view-notes">${esc(c.notes)}</div></div>`}
    $('contactViewBody').innerHTML=html;
    $('contactViewOverlay').classList.add('open');
  };
  window.closeContactView=function(){$('contactViewOverlay')?.classList.remove('open')};

  // Ακόμη κι αν κληθεί παλιό ιστορικό από άλλο σημείο, ποτέ οικονομικές στήλες.
  window.openClientHist=function(name){
    const k=clientKey(name),list=(Array.isArray(J)?J:[]).filter(j=>clientKey(j.client)===k).sort((a,b)=>(b.date||'').localeCompare(a.date||''));
    if($('clientHistTitle'))$('clientHistTitle').textContent='Ιστορικό: '+name;
    if($('clientHistBody'))$('clientHistBody').innerHTML=list.length?list.map(j=>`<tr><td>${esc(j.code||'')}</td><td>${esc(j.date||'Ουρά')}</td><td>${esc(j.type||j.task||'—')}</td><td><span class="badge ${statusClass(j.status)}">${esc(j.status||'—')}</span></td></tr>`).join(''):'<tr><td colspan="4">Καμία εργασία.</td></tr>';
    $('clientHistModal')?.classList.add('open');
  };

  // Τα ΑΦΜ/ΔΟΥ διατηρούνται στα αποθηκευμένα δεδομένα για ασφάλεια αλλά δεν εμφανίζονται πουθενά στην ενότητα Επαφές.
  renderClients();
})();
