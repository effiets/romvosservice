

/* v6.2 — Επαφές και ειδικές φόρμες ανά κατηγορία */
function getContactRolesFromForm(){const r=[];if($('cliRoleCustomer')?.checked)r.push('Πελάτης');if($('cliRolePartner')?.checked)r.push('Συνεργάτης');if($('cliRoleTechnician')?.checked)r.push('Τεχνικός');if($('cliRoleSupplier')?.checked)r.push('Προμηθευτής');if($('cliRoleOther')?.checked)r.push('Άλλο');return r}
function setContactRolesToForm(r){r=Array.isArray(r)?r:[];$('cliRoleCustomer').checked=r.includes('Πελάτης');$('cliRolePartner').checked=r.includes('Συνεργάτης');$('cliRoleTechnician').checked=r.includes('Τεχνικός');$('cliRoleSupplier').checked=r.includes('Προμηθευτής');$('cliRoleOther').checked=r.includes('Άλλο')}
function inferContactRoles(c){if(Array.isArray(c.contactRoles)&&c.contactRoles.length)return c.contactRoles;return ['Πελάτης']}
function toggleContactSections(){const cat=$('cliCategory')?.value||'';$('lidlFields')?.classList.toggle('show',cat==='LIDL');$('masoutisFields')?.classList.toggle('show',cat==='Μασούτης');$('electraFields')?.classList.toggle('show',cat==='Electra Hotels')}
toggleElectraFields=function(){toggleContactSections()};
const _v62EditClientAt=editClientAt;editClientAt=function(i){_v62EditClientAt(i);const c=window.__clientsCache[i];setContactRolesToForm(inferContactRoles(c));$('cliMasStoreNo').value=c.category==='Μασούτης'?(c.storeNo||''):'';$('cliMasPhone').value=c.category==='Μασούτης'?(c.phone||''):'';$('cliMasMaintenanceOwner').value=c.category==='Μασούτης'?(c.maintenanceOwner||''):'';toggleContactSections()};
const _v62ClearClient=clearClient;clearClient=function(){_v62ClearClient();setContactRolesToForm([]);if($('cliMasStoreNo'))$('cliMasStoreNo').value='';if($('cliMasPhone'))$('cliMasPhone').value='';if($('cliMasMaintenanceOwner'))$('cliMasMaintenanceOwner').value='';toggleContactSections()};
const _v62SaveClient=saveClient;saveClient=function(){const category=$('cliCategory').value;if(category==='Μασούτης'){$('cliStoreNo').value=$('cliMasStoreNo').value.trim();$('cliPhone').value=$('cliMasPhone').value.trim();$('cliMaintenanceOwner').value=$('cliMasMaintenanceOwner').value.trim()}if(category==='Μασούτης'||category==='Electra Hotels'){['cliFacilityManager','cliFMLandline','cliFMMobile','cliFMEmail','cliFacilityAssistant','cliFALandline','cliFAMobile','cliFAEmail'].forEach(id=>$(id).value='')}const id=$('cliId').value,n=$('cliName').value.trim(),roles=getContactRolesFromForm();_v62SaveClient();const c=id?C.find(x=>x.id===id):C.find(x=>clientCanonicalName(x.name)===clientCanonicalName(n));if(c){c.contactRoles=roles;save();render()}};
const _v62RenderClients=renderClients;renderClients=function(){_v62RenderClients();document.querySelectorAll('#clientsBody tr').forEach((tr,i)=>{const c=window.__clientsCache?.[i],td=tr.querySelector('td');if(!c||!td||td.querySelector('.contact-role-badges'))return;const d=document.createElement('div');d.className='contact-role-badges small';d.style.marginTop='3px';d.textContent=inferContactRoles(c).join(' • ');td.appendChild(d)})};
C.forEach(c=>{if(!Array.isArray(c.contactRoles))c.contactRoles=inferContactRoles(c)});save();toggleContactSections();render();

window.addEventListener('load',()=>{
  setTimeout(()=>document.getElementById('romvosSplash')?.classList.add('hide'),1100);
});
