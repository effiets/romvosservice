
/* v6.5.65 — εμφάνιση διαγραφής μόνο σε υπάρχουσα επαφή */
(function(){
  const oldOpenNew=window.openNewClientEditor;
  if(typeof oldOpenNew==='function') window.openNewClientEditor=function(){oldOpenNew.apply(this,arguments);updateDeleteCurrentClientButton();};
  const oldEdit=window.editClientAt;
  if(typeof oldEdit==='function') window.editClientAt=function(i){oldEdit.apply(this,arguments);updateDeleteCurrentClientButton();};
  const oldClear=window.clearClient;
  if(typeof oldClear==='function') window.clearClient=function(){oldClear.apply(this,arguments);updateDeleteCurrentClientButton();};
  const oldClose=window.closeClientEditor;
  if(typeof oldClose==='function') window.closeClientEditor=function(){oldClose.apply(this,arguments);updateDeleteCurrentClientButton();};
  updateDeleteCurrentClientButton();
})();
