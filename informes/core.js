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
    [['centerName','Centro'],['revision','Revisión'],['year','Año'],['actaNumber','Número de acta'],['start','Fecha de inicio'],['end','Fecha de fin'],['issued','Fecha de emisión'],['author','Usuario que genera el informe']].forEach(([key,label])=>{if(!text(draft[key]).trim())errors.push('Falta: '+label);});
    if(draft.start&&draft.end&&draft.start>draft.end)errors.push('La fecha de fin es anterior a la de inicio.');
    if(draft.year&&!/^\d{4}$/.test(text(draft.year)))errors.push('El año debe tener cuatro cifras.');
    if(draft.operators&&(!/^\d+$/.test(text(draft.operators))||+draft.operators<1))errors.push('El número de operarios debe ser un entero positivo.');
    if(!draft.validated)errors.push('Confirma la revisión de los datos y comprobaciones actuales.');
    if(draft.mode==='previous'&&!draft.previousFile)errors.push('Selecciona el acta anterior.');
    if(draft.mode==='previous'&&!draft.previousReviewed)errors.push('Confirma los datos administrativos recuperados del acta anterior.');
    if(!draft.holderName||!draft.companyName)errors.push('Completa el titular y la empresa mantenedora.');
    if(draft.hours&&!draft.hoursBasis)errors.push('Indica si las horas son totales o por operario.');
    if(draft.signaturePresent&&!draft.signatureConfirmed)errors.push('Confirma la autorización de las imágenes de firma.');
    if(!draft.systemReviewConfirmed&&systems.length)errors.push('Revisa las incidencias de Sistemas, incluidas las descripciones libres.');
    for(const key of ['correctivos','bie','hidrantes','sistemas']){const count=key==='sistemas'?systems.length+pdfs.length:records.filter(r=>r.module===key).length;if(draft.modules?.[key]&&!count)errors.push(names[key]+': seleccionado sin datos.');if(!draft.modules?.[key])warnings.push(names[key]+': no se incorpora al expediente.');}
    if(!draft.finalState)warnings.push('Estado final no verificado.');
    if(!draft.technicians)warnings.push('No se han identificado técnicos responsables.');
    if(draft.modules?.hidrantes)warnings.push('El módulo Hidrantes de origen conserva campos de extintores: verifica que sus datos correspondan a hidrantes.');
    const candidates=new Map();records.forEach(r=>{const k=JSON.stringify([r.module,r.building,r.number,r.source.numeroSerie,r.location]);if(candidates.has(k))warnings.push('Posible equipo repetido: '+names[r.module]+' / '+r.building+' / '+r.number+'. Conservado para revisión.');candidates.set(k,true);if(r.client&&norm(r.client)!==norm(draft.sourceClient||draft.centerName)&&!(draft.aliases||[]).some(a=>norm(a)===norm(r.client)))warnings.push('Cliente de origen discordante: '+r.client+' ('+r.key+').');r.photos.forEach((p,i)=>{if(p&&!/^data:image\//.test(p)&&!/^blob:/.test(p))warnings.push('Referencia de foto sin imagen: '+r.key+' / foto '+(i+1));});});
    if(pdfs.some(p=>p.historical))warnings.push('Hay páginas históricas: se identificarán como antecedentes sin alterar su contenido.');
    return {errors:[...new Set(errors)],warnings:[...new Set(warnings)]};
  }
  const api={names,text,norm,identity,signature,defects,equipment,selectRecords,systemDefects,consolidate,parsePages,validate};
  if(typeof module!=='undefined')module.exports=api;else root.PCI=api;
})(typeof window!=='undefined'?window:globalThis);
