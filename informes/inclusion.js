// Incorporación directa de los registros disponibles del expediente.
function inclusionStats(){
  const records=selectedRecords(),systems=selectedSystems(),issues=finalIssues();
  const correctiveRecords=['correctivos','bie','hidrantes'].reduce((n,module)=>n+PCI.equipmentPlan(module,records.filter(r=>r.module===module),issues,draft.excludedPhotos||[]).correctiveRecords.length,0);
  return {available:allRecords.length,assigned:assigned().filter(r=>r.module!=='sistemas').length,included:records.length,systems:systems.length,systemsAvailable:systemReports.length,currentSystems:systemReports.filter(r=>r.source.sourceKind==='current').reduce((n,r)=>n+(r.source.sourceEntries||[]).length,0),correctives:correctiveRecords,photos:plannedPhotos(records,issues).length};
}
function renderInclusionStatus(){
  if(!draft)return;const s=inclusionStats(),box=$('inclusion-status');
  box.innerHTML=`<strong>${s.available} equipos disponibles · ${s.assigned} asignados · ${s.included} incluidos en el informe</strong><p>${s.correctives} equipos con correctivos · ${s.photos} fotos que se exportarán · ${s.systems} informes de Sistemas incluidos / ${s.systemsAvailable} disponibles${s.currentSystems?' ('+s.currentSystems+' sistemas en el trabajo abierto)':''}.</p>`;
}
async function incorporateAvailable(){
  const keys=new Set(PCI.inclusionGroups(catalog,bindings,centerId(),revisionId(),draft.id).flatMap(g=>g.available));
  const next={...bindings};
  for(const row of catalog){if(!keys.has(row.key)||!draft.modules[row.module]||draft.excludedRecords.includes(row.key))continue;
    next[row.key]={draftId:draft.id,centerId:centerId(),revisionId:revisionId(),signature:row.signature,label:[draft.centerName,draft.revision,draft.year].filter(Boolean).join(' · '),assignedAt:new Date().toISOString(),assignedBy:draft.author||''};
  }
  await PCIData.set('bindings',next);bindings=next;await saveDraft(false);
  renderSources();renderModules();renderSystems();renderIssues();renderInclusionStatus();
}
async function requestGeneration(partial){
  if(busy)return;
  await refresh();invalidate();await incorporateAvailable();await build(partial);
}
function wireInclusion(){renderInclusionStatus();}
