// Selección explícita para evitar generar solo el acta cuando existen equipos disponibles.
let pendingGeneration=null;
function inclusionStats(){
  const records=selectedRecords(),systems=selectedSystems(),issues=finalIssues();
  const correctiveRecords=['correctivos','bie','hidrantes'].reduce((n,module)=>n+PCI.equipmentPlan(module,records.filter(r=>r.module===module),issues,draft.excludedPhotos||[]).correctiveRecords.length,0);
  return {available:allRecords.length,assigned:assigned().filter(r=>r.module!=='sistemas').length,included:records.length,systems:systems.length,systemsAvailable:systemReports.length,currentSystems:systemReports.filter(r=>r.source.sourceKind==='current').reduce((n,r)=>n+(r.source.sourceEntries||[]).length,0),correctives:correctiveRecords,photos:plannedPhotos(records,issues).length};
}
function renderInclusionStatus(){
  if(!draft)return;const s=inclusionStats(),box=$('inclusion-status');
  box.innerHTML=`<strong>${s.available} equipos disponibles · ${s.assigned} asignados · ${s.included} incluidos en el informe</strong><p>${s.correctives} equipos con correctivos · ${s.photos} fotos que se exportarán · ${s.systems} informes de Sistemas incluidos / ${s.systemsAvailable} disponibles${s.currentSystems?' ('+s.currentSystems+' sistemas en el trabajo abierto)':''}.</p>${s.systemsAvailable&&!s.systems?'<p class="warning">Hay informes de Sistemas disponibles que todavía no están incluidos. Pulsa «Incorporar equipos al informe» para seleccionarlos.</p>':''}${s.available&&!s.included?'<p class="warning">Hay equipos guardados, pero ninguno está incluido en el PDF. Pulsa «Incorporar equipos al informe».</p>':''}`;
  $('include-data').textContent=s.included?'Revisar equipos incluidos en el informe':'Incorporar equipos al informe';
}
function openInclusion(generateMode=null){
  pendingGeneration=generateMode;const groups=PCI.inclusionGroups(catalog,bindings,centerId(),revisionId(),draft.id);
  $('inclusion-groups').innerHTML=groups.map((g,i)=>`<label class="inclusion-group"><input type="checkbox" data-inclusion-group="${i}" ${groups.length===1&&g.available.length?'checked':''} ${!g.available.length?'disabled':''}><span><strong>${esc(g.client||'Sin cliente indicado (incluye el trabajo abierto si aparece Sistemas)')}</strong><small>${g.available.length} registros disponibles para este expediente${g.available.some(key=>catalog.find(r=>r.key===key)?.module==='sistemas')?' · INCLUYE SISTEMAS'+(g.available.some(key=>catalog.find(r=>r.key===key)?.source.sourceKind==='current')?' · Trabajo abierto en Sistemas':''):''}${g.conflicts.length?' · '+g.conflicts.length+' asignados a otro centro/revisión (no se trasladan)':''}</small></span></label>`).join('')||'<p>No hay registros disponibles en los módulos.</p>';
  $('inclusion-confirm').checked=false;$('inclusion-message').textContent='';
  $('include-and-continue').textContent=generateMode===null?'Incorporar seleccionados': 'Incorporar seleccionados y generar PDF';
  $('acta-only').hidden=generateMode===null;
  $('inclusion-context').textContent=`Expediente: ${draft.centerName||'Centro sin informar'} · ${draft.revision||'Revisión sin informar'} · ${draft.year||'Año sin informar'}. Revisa qué registros corresponden a este trabajo. Se pueden dejar los datos administrativos incompletos.`;
  $('inclusion-dialog').showModal();
}
async function requestGeneration(partial){
  if(busy)return;
  await refresh();invalidate();
  if(catalog.length&&!selectedRecords().length&&!selectedSystems().length){openInclusion(partial);return;}
  await build(partial);
}
async function includeChosen(){
  const groups=PCI.inclusionGroups(catalog,bindings,centerId(),revisionId(),draft.id);
  const chosen=[...document.querySelectorAll('[data-inclusion-group]:checked')].flatMap(el=>groups[Number(el.dataset.inclusionGroup)].available);
  if(!chosen.length)throw Error('Selecciona al menos un cliente o grupo de registros.');
  if(!$('inclusion-confirm').checked)throw Error('Confirma que los registros seleccionados corresponden a este trabajo.');
  const nextBindings={...bindings};for(const key of chosen){const row=catalog.find(r=>r.key===key);if(!row)throw Error('Han cambiado los registros. Actualiza los datos.');
    nextBindings[key]={draftId:draft.id,centerId:centerId(),revisionId:revisionId(),signature:row.signature,label:(draft.centerName||'Centro sin informar')+' · '+(draft.revision||'Revisión sin informar')+' · '+(draft.year||''),assignedAt:new Date().toISOString(),assignedBy:draft.author||'No informado'};
  }
  await PCIData.set('bindings',nextBindings);bindings=nextBindings;
  for(const key of chosen){const row=catalog.find(r=>r.key===key);draft.modules[row.module]=true;if(row.module==='correctivos'&&!draft.installations.includes('Extintores'))draft.installations.push('Extintores');if(row.module==='hidrantes'&&!draft.installations.includes('Hidrantes'))draft.installations.push('Hidrantes');draft.excludedRecords=draft.excludedRecords.filter(k=>k!==key);}
  changed();await saveDraft(false);renderSources();renderModules();renderSystems();renderIssues();renderInclusionStatus();
  const mode=pendingGeneration;$('inclusion-dialog').close();show('preview');
  say(`${selectedRecords().length} equipos incorporados al informe. Solo los equipos con correctivos aparecen en las tablas; las fotos siguen las reglas de cada módulo.`);
  if(mode!==null)await build(mode);
}
function wireInclusion(){
  $('include-data').onclick=()=>openInclusion();
  $('close-inclusion').onclick=()=>$('inclusion-dialog').close();
  $('include-and-continue').onclick=async()=>{const button=$('include-and-continue');button.disabled=true;try{await includeChosen();}catch(e){if($('inclusion-dialog').open)$('inclusion-message').textContent=e.message;else error(e);}finally{button.disabled=false;}};
  $('acta-only').onclick=()=>{const mode=pendingGeneration;$('inclusion-dialog').close();build(mode).catch(error);};
}
