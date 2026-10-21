/* Normalización sin modificar los registros originales. Compatible con navegador y node:test. */
(function(root){
  const names={correctivos:'Extintores',bie:'BIE',hidrantes:'Hidrantes',sistemas:'Sistemas'};
  const text=v=>v==null?'':String(v);
  const norm=v=>text(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[.\s]+$/g,'').replace(/\s+/g,' ').trim();
  function signature(row){const value=JSON.stringify(row);let a=2166136261,b=5381;for(let i=0;i<value.length;i++){a=Math.imul(a^value.charCodeAt(i),16777619);b=Math.imul(b,33)^value.charCodeAt(i);}return `${value.length}:${(a>>>0).toString(16)}:${(b>>>0).toString(16)}`;}
  function identity(module,row,index=0){return module+':'+(row.id||JSON.stringify([row.cliente,row.edificio,row.ubicacion,row.localizacion,row.cantidad,row.numeroSerie,index]));}
  function defects(row){
    const result=[];const add=value=>{const s=text(value).trim();if(s&&!result.some(x=>norm(x)===norm(s)))result.push(s);};
    (Array.isArray(row.defectos)?row.defectos:[]).forEach(add);
    // Las banderas originales importadas se conservan si existen. Una nota libre no es por sí sola una avería.
    Object.entries(row.incidencias||{}).forEach(([key,value])=>{if(value===true||norm(value)==='si')add(key);});
    return result;
  }
  function equipment(module,row,index=0){return {key:identity(module,row,index),module,id:text(row.id),source:row,client:text(row.cliente),building:text(row.edificio),number:text(row.cantidad||row.numeroHidrante),location:[row.ubicacion,row.localizacion].filter(Boolean).join(' / '),defects:defects(row),photos:Array.isArray(row.photos)?row.photos:[],signature:signature(row)};}
  const issueLabels=['Con averías','Alarmas','Mal estado','Bombas desconectadas','No hay pulsadores','No hay sirenas'];
  function systemDefects(entry){
    const found=[];
    // El módulo usa muchas casillas como tema revisado, no como defecto. Solo estas señalan incidencias.
    issueLabels.forEach(label=>{if(entry.checks?.[label])found.push({text:entry.checkNotes?.[label]||label,label});});
    (entry.pciDefects||[]).forEach(value=>found.push({text:text(value),label:text(value)}));
    return found.filter((x,i,a)=>a.findIndex(y=>norm(y.text)===norm(x.text))===i);
  }
  function selectRecords(records,bindings,centerId,revisionId){return records.filter(r=>{const b=bindings[r.key];return b?.centerId===centerId&&b?.revisionId===revisionId&&b.signature===r.signature;});}
  function consolidate(records,systems=[],prior=[]){
    const list=[];const keys=new Set();
    function add(issue){const key=JSON.stringify([issue.module,issue.key,norm(issue.text),issue.status||'actual']);if(!keys.has(key)){keys.add(key);list.push(issue);}}
    records.forEach(r=>r.defects.forEach(value=>add({module:r.module,key:r.key,building:r.building,number:r.number,text:value,status:'actual',origin:r.key})));
    systems.forEach(s=>systemDefects(s.entry).forEach(d=>add({module:'sistemas',key:s.key,building:s.entry.meta?.building||'',number:s.entry.meta?.syco||s.entry.type,text:d.text,status:'actual',origin:s.key,type:s.entry.type})));
    prior.forEach(x=>add({...x,status:'antecedente',origin:x.origin||'selección manual'}));
    return list.sort((a,b)=>Object.keys(names).indexOf(a.module)-Object.keys(names).indexOf(b.module)||text(a.building).localeCompare(text(b.building),'es',{numeric:true})||text(a.number).localeCompare(text(b.number),'es',{numeric:true}));
  }
  function parsePages(input,count){
    if(!text(input).trim())return Array.from({length:count},(_,i)=>i);
    const pages=[];
    text(input).split(',').forEach(part=>{const match=part.trim().match(/^(\d+)(?:\s*-\s*(\d+))?$/);if(!match)throw Error('Rango de páginas no válido: '+part);const start=+match[1],end=+(match[2]||match[1]);if(start<1||end>count||end<start)throw Error('Página fuera de rango: '+part);for(let n=start;n<=end;n++){if(pages.includes(n-1))throw Error('Página repetida: '+n);pages.push(n-1);}});
    return pages;
  }
  function validate(draft,records,systems,pdfs){
    const errors=[],warnings=[];
    const missing=draft.allowIncomplete?warnings:errors;
    (draft.mode==='previous'?[['revision','Revisión actual'],['start','Fecha de inicio'],['end','Fecha de fin']]:[['centerName','Centro'],['revision','Revisión'],['year','Año'],['actaNumber','Número de acta'],['start','Fecha de inicio'],['end','Fecha de fin'],['issued','Fecha de emisión'],['author','Usuario que genera el informe']]).forEach(([key,label])=>{if(!text(draft[key]).trim())(draft.mode==='previous'?errors:missing).push('Falta: '+label);});
    if(draft.start&&draft.end&&draft.start>draft.end)errors.push('La fecha de fin es anterior a la de inicio.');
    if(draft.year&&!/^\d{4}$/.test(text(draft.year)))errors.push('El año debe tener cuatro cifras.');
    if(draft.operators&&(!/^\d+$/.test(text(draft.operators))||+draft.operators<1))errors.push('El número de operarios debe ser un entero positivo.');
    if(draft.mode!=='previous'&&!draft.validated)missing.push('Confirma la revisión de los datos y comprobaciones actuales.');
    if(draft.mode==='previous'&&!draft.previousFile)errors.push('Selecciona el acta anterior.');

    if(draft.mode!=='previous'&&(!draft.holderName||!draft.companyName))missing.push('Completa el titular y la empresa mantenedora.');
    if(draft.hours&&!draft.hoursBasis)missing.push('Indica si las horas son totales o por operario.');
    if(draft.signaturePresent&&!draft.signatureConfirmed)errors.push('Confirma la autorización de las imágenes de firma.');
    if(!draft.systemReviewConfirmed&&draft.modules?.sistemas&&(systems.length||pdfs.length))missing.push('Revisa las incidencias de Sistemas, incluidos los PDF externos y las descripciones libres.');
    for(const key of ['correctivos','bie','hidrantes','sistemas']){const count=key==='sistemas'?systems.length+pdfs.length:records.filter(r=>r.module===key).length;if(draft.modules?.[key]&&!count)missing.push(names[key]+': seleccionado sin datos.');if(!draft.modules?.[key])warnings.push(names[key]+': no se incorpora al expediente.');}
    if(!draft.finalState)warnings.push('Estado final no verificado.');
    if(!draft.technicians)warnings.push('No se han identificado técnicos responsables.');
    const candidates=new Map();records.forEach(r=>{const k=JSON.stringify([r.module,r.building,r.number,r.source.numeroSerie,r.location]);if(candidates.has(k))warnings.push('Posible equipo repetido: '+names[r.module]+' / '+r.building+' / '+r.number+'. Conservado para revisión.');candidates.set(k,true);if((draft.sourceClient||draft.centerName)&&r.client&&norm(r.client)!==norm(draft.sourceClient||draft.centerName)&&!(draft.aliases||[]).some(a=>norm(a)===norm(r.client)))warnings.push('Cliente de origen discordante: '+r.client+'. Revisa las asignaciones.');r.photos.forEach((p,i)=>{if(p&&!/^data:image\//.test(p)&&!/^blob:/.test(p))warnings.push('Referencia de foto sin imagen: '+r.key+' / foto '+(i+1));});});
    if(pdfs.some(p=>p.historical))warnings.push('Hay páginas históricas: se identificarán como antecedentes sin alterar su contenido.');
    return {errors:[...new Set(errors)],warnings:[...new Set(warnings)]};
  }
  function reportText(value){const s=text(value).trim();return /^(?:no informad[oa]s?|no indicad[oa]s?|no verificado|sin identificar|sin numero|edificio no indicado)$/i.test(norm(s))||/^(\p{L})\1{4,}$/u.test(s)?'':s;}
  function forExport(draft,partial=false){const d=JSON.parse(JSON.stringify(draft));d.partial=partial;for(const key of ['centerName','revision','year','actaNumber','start','end','issued','author'])d[key]=reportText(d[key]);for(const [key,value] of Object.entries(d))if(typeof value==='string')d[key]=reportText(value);for(const key of ['start','end','issued','lastReview'])if(d[key]&&(!/^\d{4}-\d{2}-\d{2}$/.test(d[key])||!Number.isFinite(Date.parse(d[key]))||new Date(d[key]).toISOString().slice(0,10)!==d[key]))d[key]='';if(d.start&&d.end&&d.start>d.end){d.start='';d.end='';}if(d.year&&!/^\d{4}$/.test(String(d.year)))d.year='';if(d.operators&&(!/^\d+$/.test(String(d.operators))||+d.operators<1))d.operators='';if(d.hours&&(!Number.isFinite(Number(d.hours))||+d.hours<0||!d.hoursBasis))d.hours='';return d;}
  function photoLayout(value){const perPage=Number(value)===8?8:6;return {perPage,columns:2,rows:perPage/2};}
  function equipmentPlan(module,records,issues,excludedPhotos=[],perPage=6){
    const correctiveRecords=records.map(record=>({...record,defects:issues===undefined?record.defects:issues.filter(i=>i.module===module&&i.key===record.key&&i.status!=='antecedente').map(i=>i.text)})).filter(r=>r.defects.length);
    const photoRecords=module==='correctivos'?correctiveRecords:records;
    const photos=photoRecords.flatMap(record=>record.photos.map((src,index)=>({record,src,index})).filter(p=>p.src&&!excludedPhotos.includes(record.key+':'+p.index)));
    const size=photoLayout(perPage).perPage;const photoPages=[];for(let i=0;i<photos.length;i+=size)photoPages.push(photos.slice(i,i+size));
    return {correctiveRecords,photoPages};
  }
  function inclusionGroups(catalog,bindings,centerId,revisionId,draftId){
    const groups=new Map();for(const r of catalog){const key=text(r.client).trim();if(!groups.has(key))groups.set(key,{client:key,available:[],conflicts:[]});const b=bindings[r.key];const ownDraft=draftId&&b?.draftId===draftId;const conflict=b&&!ownDraft&&(b.centerId!==centerId||b.revisionId!==revisionId);groups.get(key)[conflict?'conflicts':'available'].push(r.key);}return [...groups.values()];
  }
  function correctiveGroups(module,records,issues){
    const labels=module==='correctivos'?[
      ['EXTINTORES CADUCADOS',['extintor caducado','caducado']],
      ['EXTINTORES DESCARGADOS',['extintor descargado','descargado']],
      ['EXTINTORES SIN PRESIÓN',['extintor sin presión','sin presión']],
      ['EXTINTORES CON PRESIÓN BAJA',['extintor con presión baja','presión baja']],
      ['EXTINTORES CON PRESIÓN ALTA',['extintor con presión alta','presión alta']],
      ['EXTINTORES CON OBSTÁCULOS',['hay un obstáculo','obstáculo']],
      ['EXTINTORES EN EL SUELO',['extintor en el suelo','en el suelo']],
      ['CRISTAL DE ARMARIO ROTO O SIN CRISTAL',['cristal armario roto o sin cristal','cristal del extintor ausente o roto','cristal roto']],
      ['EXTINTORES SIN SEÑAL',['sin señal']],
      ['SEÑAL CADUCADA',['señal caducada']],
      ['EXTINTORES EN MAL ESTADO',['extintor en mal estado','mal estado']],
      ['EXTINTORES RETIMBRADOS',['extintor retimbrado']],
      ['EXTINTORES CARGADOS',['extintor cargado']]
    ]:[];
    const source=issues===undefined?records.flatMap(r=>r.defects.map(value=>({module,key:r.key,building:r.building,number:r.number,text:value,status:'actual'}))):issues.filter(i=>i.module===module);
    const groups=new Map(),seen=new Set();
    for(const issue of source){const record=records.find(r=>r.key===issue.key);const canonical=labels.find(([,aliases])=>aliases.some(a=>norm(a)===norm(issue.text)));const title=canonical?canonical[0]:text(issue.text).toLocaleUpperCase('es');const unique=JSON.stringify([issue.key,norm(issue.text),issue.status||'actual']);if(seen.has(unique))continue;seen.add(unique);
      if(!groups.has(title))groups.set(title,{title,order:canonical?labels.indexOf(canonical):labels.length,rows:[]});groups.get(title).rows.push({key:issue.key,building:issue.building||record?.building||'—',number:issue.number||record?.number||'—',model:text(record?.source?.modelo||record?.source?.tipo)||'—',incidence:issue.text+(issue.status==='antecedente'?'\nANTECEDENTE '+(issue.previousRevision||'')+' · pendiente de comprobación':'' )});
    }
    return [...groups.values()].sort((a,b)=>a.order-b.order);
  }
  function systemReportSources(state={}){
    state=state||{};
    const current=state.current||{},saved=Array.isArray(state.savedReports)?state.savedReports:[];
    const legacy=Object.entries(current.systems||{}).filter(([,data])=>data&&typeof data==='object').map(([type,data])=>({id:'current:'+type,type,meta:{system:type,denomination:type},sections:data.sections||{},checks:data.checks||{},checkNotes:data.checkNotes||{},photos:data.photos||[],mountedHtml:data.mountedHtml||'',mountedText:data.mountedText||''}));
    const entries=Array.isArray(current.entries)&&current.entries.length?current.entries:legacy;
    const hasCurrent=entries.length>0;
    const result=saved.filter(r=>!hasCurrent||!current.editingId||r.id!==current.editingId);
    if(hasCurrent)result.push({...current,id:current.editingId||'__pci_current__',sourceKind:'current',sourceEntries:entries,systems:[],replacesSavedId:current.editingId||null});
    return result;
  }
  function pdfBytes(value){
    if(ArrayBuffer.isView(value))return new Uint8Array(value.buffer,value.byteOffset,value.byteLength);
    if(Object.prototype.toString.call(value)==='[object ArrayBuffer]')return new Uint8Array(value);
    throw Error('No se pudieron leer los bytes del PDF que se incorpora al informe.');
  }
  const api={names,reportText,text,norm,identity,signature,defects,equipment,selectRecords,systemDefects,consolidate,parsePages,validate,forExport,equipmentPlan,inclusionGroups,correctiveGroups,photoLayout,systemReportSources,pdfBytes};
  if(typeof module!=='undefined')module.exports=api;else root.PCI=api;
})(typeof window!=='undefined'?window:globalThis);
