window.PCIPdf=(()=>{
  pdfjsLib.GlobalWorkerOptions.workerSrc='./vendor/pdf.worker.min.js';
  const blue=[32,94,153], gray=[230,237,243];
  const checks=[
    'Instalación registrada ante la administración competente',
    'Documentación de la instalación entregada a la mantenedora',
    'Instrucciones de mantenimiento entregadas por el instalador',
    'Existencia de proyecto firmado por técnico competente',
    'Conformidad de los equipos instalados con el proyecto',
    'Identificación documental de la ubicación de cada equipo',
    'Modificaciones desde la última revisión conformes al proyecto correspondiente',
    'Evaluación técnica favorable para equipos innovadores sin norma'
  ];
  const installations=['Detección y alarma','Abastecimiento de agua','Reserva de agua','Sala de bombas / tuberías / válvulas','Equipos de bombeo','Hidrantes','Extintores','BIE 25 mm','BIE 45 mm','BIE alta presión','Columna seca','Rociadores húmedos','Rociadores secos','Rociadores de preacción','Rociadores de diluvio','Agua nebulizada','Espuma física','Polvo','Agentes gaseosos','Aerosoles condensados','Control de humos y calor','Otros / innovadores','Señalización luminiscente'];
  function doc(){return new jspdf.jsPDF({unit:'mm',format:'a4',compress:true});}
  function line(pdf,text,x,y,size=10,bold=false){pdf.setFont('helvetica',bold?'bold':'normal');pdf.setFontSize(size);pdf.setTextColor(35);pdf.text(Array.isArray(text)?text.map(String):String(text||''),x,y);}
  function head(pdf,d,title){
    pdf.pciDraft=d;pdf.pciTitle=title;
    pdf.setTextColor(...blue);pdf.setFont('helvetica','bold');pdf.setFontSize(18);pdf.text('SYCOGROUP',16,19);pdf.setFontSize(11);pdf.text(title,194,18,{align:'right'});
    pdf.setFont('helvetica','normal');pdf.setFontSize(8);pdf.setTextColor(35);pdf.text('Instalaciones de protección contra incendios',194,24,{align:'right'});
    pdf.setDrawColor(...blue);pdf.line(16,29,194,29);
    const center=(d.code?d.code+' · ':'')+d.centerName;pdf.setFont('helvetica','bold');pdf.setFontSize(9);const centerSize=Math.min(9,178/Math.max(pdf.getTextWidth(center),1)*9);line(pdf,center,16,35,centerSize,true);
    line(pdf,`${d.revision} · ${d.year}   |   Acta ${d.actaNumber}`,16,41,9);
    if(d.partial)line(pdf,'BORRADOR · DATOS INCOMPLETOS / SIN VALIDAR',16,46,7,true);
  }
  function start(pdf,d,title,first=false){if(!first)pdf.addPage();head(pdf,d,title);return 48;}
  function table(pdf,headings,rows,y,options={}){pdf.autoTable({startY:y,head:headings.length?[headings]:undefined,body:rows,margin:{left:16,right:16,top:48,bottom:19},styles:{font:'helvetica',fontSize:9,cellPadding:2.4,overflow:'linebreak',lineColor:[190,200,210],lineWidth:.15},headStyles:{fillColor:blue,fontSize:9},alternateRowStyles:{fillColor:[247,249,251]},rowPageBreak:'avoid',showHead:'everyPage',didDrawPage:data=>{if(data.pageNumber>1&&options.draft)head(pdf,options.draft,options.title||'CONTINUACIÓN');},...options});return pdf.lastAutoTable.finalY+6;}
  function band(pdf,title,y){if(y>245)y=start(pdf,pdf.pciDraft,pdf.pciTitle);pdf.setFillColor(...blue);pdf.rect(16,y,178,7,'F');pdf.setTextColor(255);pdf.setFont('helvetica','bold');pdf.setFontSize(Math.min(10,172/Math.max(pdf.getTextWidth(title),1)*10));pdf.text(title,18,y+4.8);return y+10;}
  function fields(pdf,rows,y,d,title){return table(pdf,[],rows.map(([label,value])=>[label,PCI.text(value)||'No informado']),y,{columnStyles:{0:{cellWidth:62,fontStyle:'bold'}},draft:d,title});}
  async function image(pdf,src,x,y,w,h,align='center'){
    if(!src||!/^data:image\//.test(src))throw Error('Falta una imagen o su referencia no contiene la fotografía.');
    const img=await new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(Error('No se pudo leer una fotografía.'));image.src=src;});
    const canvas=document.createElement('canvas');canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;canvas.getContext('2d').drawImage(img,0,0);const ratio=Math.min(w/canvas.width,h/canvas.height);const iw=canvas.width*ratio,ih=canvas.height*ratio;
    const top=y+(align==='top'?0:(h-ih)/2);
    pdf.addImage(canvas.toDataURL('image/jpeg',.9),'JPEG',x+(w-iw)/2,top,iw,ih);
    return {bottom:top+ih};
  }
  async function acta(d,signatures){
    const pdf=doc();let y=start(pdf,d,'ACTA DE MANTENIMIENTO',true);
    y=fields(pdf,[['Número de acta',d.actaNumber],['Contrato / referencia',d.contract],['Periodicidad',d.periodicity],['Fecha de emisión',d.issued]],y,d,'ACTA DE MANTENIMIENTO');
    y=band(pdf,'1. NOTIFICACIONES PREVIAS',y);
    y=fields(pdf,[['Comienzo de trabajos notificado',d.notified||'No verificado'],['Aseguradora informada',d.insurer||'No verificado']],y,d,'ACTA DE MANTENIMIENTO');
    y=band(pdf,'2. PROPIEDAD / USUARIO / TITULAR',y);
    y=fields(pdf,[['Nombre / razón social',d.holderName],['CIF / NIF',d.holderTax],['Domicilio',d.holderAddress],['Ciudad / provincia',d.holderCity],['Representante',d.representative],['Responsable presente',d.presentResponsible],['Contacto',d.holderContact]],y,d,'ACTA DE MANTENIMIENTO');
    y=band(pdf,'3. EMPRESA MANTENEDORA Y PERSONAL',y);
    fields(pdf,[['Denominación social',d.companyName],['CIF',d.companyTax],['Registro / habilitación',d.companyRegistration],['Dirección / teléfono',d.companyAddress],['Correo electrónico',d.companyEmail],['Especialidades habilitadas',d.companySpecialties],['Técnicos / empresa / acreditación / función',d.technicians]],y,d,'ACTA DE MANTENIMIENTO');
    y=start(pdf,d,'ACTA DE MANTENIMIENTO');y=band(pdf,'4. DATOS DE LA INSTALACIÓN',y);
    y=fields(pdf,[['Nombre oficial',d.installationName||d.centerName],['Edificio / localización',d.installationBuilding],['Dirección',d.installationAddress],['Fecha última revisión',d.lastReview],['Revisión actual',d.revision+' · '+d.year],['Revisiones trimestrales por',d.quarterlyBy],['Mantenimiento anterior / habilitación',d.previousCompany]],y,d,'ACTA DE MANTENIMIENTO');
    y=band(pdf,'5. VERIFICACIONES GENERALES',y);
    table(pdf,['Verificación','Resultado','Comentario'],checks.map((text,i)=>[text,d.checks?.[i]?.value||'No verificado',d.checks?.[i]?.comment||'']),y,{columnStyles:{0:{cellWidth:95},1:{cellWidth:27}},draft:d,title:'ACTA DE MANTENIMIENTO'});
    y=start(pdf,d,'ACTA DE MANTENIMIENTO');y=band(pdf,'6. INSTALACIONES Y EQUIPOS MANTENIDOS',y);
    const installationRows=[];for(let i=0;i<installations.length;i+=2){const a=installations[i],b=installations[i+1];installationRows.push([`${d.installations?.includes(a)?'[X]':'[ ]'} ${a}`,b?`${d.installations?.includes(b)?'[X]':'[ ]'} ${b}`:'']);}
    y=table(pdf,['Instalación / equipo','Instalación / equipo'],installationRows,y,{columnStyles:{0:{cellWidth:89},1:{cellWidth:89}},draft:d,title:'ACTA DE MANTENIMIENTO'});
    y=band(pdf,'7. TIEMPOS DE EJECUCIÓN',y);
    fields(pdf,[['Inicio de trabajos',d.start+' '+(d.startTime||'')],['Fin de trabajos',d.end+' '+(d.endTime||'')],['Nº de operarios',d.operators],['Horas de revisión',d.hours?d.hours+' · '+d.hoursBasis:'No informadas']],y,d,'ACTA DE MANTENIMIENTO');
    y=start(pdf,d,'ACTA DE MANTENIMIENTO');y=band(pdf,'8. OBSERVACIONES Y ESTADO FINAL',y);
    y=fields(pdf,[['Correctivos urgentes / observaciones',d.urgentNotes||'Ver relación final de correctivos.'],['Estado tras las pruebas',d.finalState||'No verificado'],['Observaciones técnicas',d.technicalNotes]],y,d,'ACTA DE MANTENIMIENTO');
    if(y>185)y=start(pdf,d,'ACTA DE MANTENIMIENTO');
    y=band(pdf,'9. FIRMAS',y);
    table(pdf,['Técnico cualificado','Propiedad'],[[d.techSigner||'Sin identificar',d.ownerSigner||'Sin identificar'],['Empresa: '+(d.techSignerCompany||''),'Cargo: '+(d.ownerRole||'')]],y,{columnStyles:{0:{cellWidth:89}},draft:d,title:'ACTA DE MANTENIMIENTO'});
    y=pdf.lastAutoTable.finalY+3;pdf.setDrawColor(180);pdf.rect(16,y,86,35);pdf.rect(108,y,86,35);
    if(signatures.tech)await image(pdf,signatures.tech,18,y+2,82,31);
    if(signatures.owner)await image(pdf,signatures.owner,110,y+2,82,31);
    y+=42;line(pdf,'Las imágenes de firma no constituyen firma digital certificada.',16,y,8);
    if(y+35>275)y=start(pdf,d,'ACTA DE MANTENIMIENTO');else y+=8;
    y=band(pdf,'10. ANEXOS',y);fields(pdf,[['Documentación adjunta','Equipos, fotografías, sistemas y relación final de correctivos, según selección del expediente.']],y,d,'ACTA DE MANTENIMIENTO');
    return pdf.output('arraybuffer');
  }
  async function equipment(d,module,records,excludedPhotos,issues){
    const {correctiveRecords,photoPages}=PCI.equipmentPlan(module,records,issues,excludedPhotos);
    const pdf=doc();let y=start(pdf,d,PCI.names[module].toUpperCase(),true);
    line(pdf,`${correctiveRecords.length} equipos con correctivos de ${records.length} registros seleccionados.`,16,y,10);y+=8;
    if(!correctiveRecords.length)y=fields(pdf,[['Correctivos','No constan correctivos en los registros seleccionados. No equivale a conformidad verificada.']],y,d,PCI.names[module].toUpperCase());
    for(const record of correctiveRecords){
      if(y>238)y=start(pdf,d,PCI.names[module].toUpperCase());
      y=band(pdf,`${PCI.names[module]} · ${record.number||'Sin número'} · ${record.building||'Edificio no indicado'}`,y);
      const r=record.source;
      const rows=[['Identificación / ubicación',[record.number,r.numeroSerie,record.location||'No indicada'].filter(Boolean).join(' / ')],['Modelo / tipo',r.modelo||r.tipo],['Fabricante / señal',[r.fabricanteMarca,r.senal].filter(Boolean).join(' / ')],['Fabricación / retimbrado',[r.fechaFabricacion,r.fechaProximoRetimbrado].filter(Boolean).join(' / ')]];
      if(module==='bie')rows.push(['Operaciones / revisión / estado',[r.operacionesRealizadas,r.tipoRevision,r.estadoEquipo].filter(Boolean).join(' / ')],['Caducidad 20 años',r.cadu20A]);
      rows.push(['Observaciones',r.observaciones],['Incidencias documentadas',record.defects.join('\n')||'No constan defectos registrados; no equivale a conformidad verificada.'],['Visto (dato de origen)',r.visto?'Sí':'No'],['Referencia de origen',record.key]);
      if(r.checklist&&Object.keys(r.checklist).length)rows.push(['Comprobaciones de origen',Object.entries(r.checklist).map(([k,v])=>k+': '+PCI.text(v)).join(' / ')]);
      y=fields(pdf,rows,y,d,PCI.names[module].toUpperCase());
    }
    const defectGroups=new Map();correctiveRecords.forEach(r=>r.defects.forEach(t=>{if(!defectGroups.has(t))defectGroups.set(t,[]);defectGroups.get(t).push(r);}));
    if(defectGroups.size){y=start(pdf,d,PCI.names[module].toUpperCase()+' · INCIDENCIAS');for(const [label,group] of defectGroups){y=fields(pdf,[[label,group.map(r=>`${r.building||'No indicado'} / ${r.number||'Sin número'} / ${r.location||'No indicada'}`).join('\n')]],y,d,'INCIDENCIAS');}}
    // El anexo siempre empieza después de todos los datos, en página nueva.
    for(const pair of photoPages){start(pdf,d,PCI.names[module].toUpperCase()+' · FOTOGRAFÍAS');
      pdf.setFont('helvetica','normal');pdf.setFontSize(9);
      const captions=pair.map(({record:r,index})=>[`Equipo ${r.number||'Sin número'} · Foto ${index+1}`,r.building||'Edificio no indicado',r.location||'Ubicación no indicada'].flatMap(t=>pdf.splitTextToSize(t,85)));
      const photoTop=56+Math.max(4,...captions.map(lines=>lines.length))*4;
      for(let i=0;i<pair.length;i++){
        const {record:r,src,index}=pair[i],x=16+i*91;
        const wrapped=captions[i];
        if(wrapped.length>13)throw Error('Identificación demasiado extensa para el anexo fotográfico: '+r.key);
        line(pdf,wrapped,x,54,9);
        const placed=await image(pdf,src,x,photoTop,87,258-photoTop,'top');
        pdf.setFontSize(6);const origin=pdf.splitTextToSize('Origen: '+r.key,87);if(origin.length>4)throw Error('Referencia de foto demasiado extensa: '+r.key);line(pdf,origin,x,placed.bottom+5,6);
      }
    }
    return pdf.output('arraybuffer');
  }
  function correctives(d,issues){const pdf=doc();let y=start(pdf,d,'RELACIÓN FINAL DE CORRECTIVOS',true);
    for(const module of Object.keys(PCI.names)){const current=issues.filter(x=>x.module===module);if(!current.length)continue;if(y>230)y=start(pdf,d,'RELACIÓN FINAL DE CORRECTIVOS');y=band(pdf,PCI.names[module].toUpperCase(),y);
      const groups=module==='sistemas'?[['Centrales de detección con averías, alarmas o desconexiones',current.filter(x=>/detecci/i.test(x.type||''))],['Sistemas de extinción con incidencias',current.filter(x=>/extinci/i.test(x.type||''))],['Grupo de presión y red de agua contra incendios',current.filter(x=>/presi|redes/i.test(x.type||''))],['Otros sistemas',current.filter(x=>!/detecci|extinci|presi|redes/i.test(x.type||''))]]:[['',current]];
      for(const [label,rows] of groups){if(!rows.length)continue;if(label){if(y>245)y=start(pdf,d,'RELACIÓN FINAL DE CORRECTIVOS');line(pdf,label,16,y,10,true);y+=6;}y=table(pdf,['Edificio / dependencia','Número / equipo','Incidencia / procedencia'],rows.map(x=>[x.building||'No indicado',x.number||'No indicado',x.text+(x.status==='antecedente'?'\nANTECEDENTE '+(x.previousRevision||'')+' · pendiente de comprobación':'')]),y,{columnStyles:{0:{cellWidth:44},1:{cellWidth:34}},draft:d,title:'RELACIÓN FINAL DE CORRECTIVOS'});}}
    if(!issues.length)fields(pdf,[['Incidencias','No constan incidencias en los datos seleccionados. No equivale a certificación de conformidad.']],y,d,'RELACIÓN FINAL DE CORRECTIVOS');return pdf.output('arraybuffer');}
  async function parse(blob){return pdfjsLib.getDocument({data:new Uint8Array(await blob.arrayBuffer())}).promise;}
  async function thumbnails(blob,host,selected=null,onToggle=null){const parsed=await parse(blob);host.replaceChildren();for(let n=1;n<=parsed.numPages;n++){const page=await parsed.getPage(n);const viewport=page.getViewport({scale:.24});const canvas=document.createElement('canvas');canvas.width=viewport.width;canvas.height=viewport.height;await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;const button=document.createElement(onToggle?'button':'div');button.className='thumb'+(!selected||selected.includes(n-1)?' selected':'');button.append(canvas,document.createTextNode('Página '+n));if(onToggle){button.type='button';button.setAttribute('aria-pressed',String(selected.includes(n-1)));button.onclick=()=>onToggle(n-1);}host.append(button);}await parsed.destroy();}
  async function extract(blob){const parsed=await parse(blob);let text='';for(let n=1;n<=parsed.numPages;n++){const page=await parsed.getPage(n);text+=(await page.getTextContent()).items.map(i=>i.str).join(' ')+'\n';}const count=parsed.numPages;await parsed.destroy();return {text,count};}
  async function mergePart(target,bytes,pages){const source=await PDFLib.PDFDocument.load(bytes);const indices=pages||source.getPageIndices();const copies=await target.copyPages(source,indices);copies.forEach(p=>target.addPage(p));return copies.length;}
  async function generate(data,progress){
    const {draft:d,records,systems,files,issues,signatures}=data;const target=await PDFLib.PDFDocument.create();const manifest=[];
    async function append(label,bytes,pages){const start=target.getPageCount()+1;const count=await mergePart(target,bytes,pages);manifest.push({label,start,end:start+count-1});}
    progress('Generando acta nueva…');await append('Acta de mantenimiento',await acta(d,signatures));
    for(const file of files.filter(f=>f.role==='observations'))await append('Observaciones técnicas del acta: '+file.name,await file.blob.arrayBuffer(),file.pages);
    for(const module of ['correctivos','bie','hidrantes'])if(d.modules[module]){progress('Generando '+PCI.names[module]+'…');await append(PCI.names[module],await equipment(d,module,records.filter(r=>r.module===module),d.excludedPhotos||[],issues));}
    if(d.modules.sistemas){const items=new Map([...systems.map(s=>[s.key,{kind:'saved',...s}]),...files.filter(f=>f.role==='systems').map(f=>[f.id,{kind:'pdf',...f}])]);const order=[...(d.systemOrder||[]),...items.keys()].filter((key,i,all)=>all.indexOf(key)===i&&items.has(key));
      for(const key of order){const item=items.get(key);progress('Incorporando sistemas: '+item.name+'…');if(item.kind==='saved'){const blob=await data.exportSystem(item.id,item.excludedEntryIds||[]);await append('Sistemas: '+item.name,await blob.arrayBuffer());}else{if(item.historical){const cover=doc();let y=start(cover,d,'ANTECEDENTE DE SISTEMAS',true);fields(cover,[['Documento histórico',item.name],['Revisión de origen',item.previousRevision||'No indicada'],['Alcance','Páginas históricas pendientes de comprobación. No acreditan pruebas de la revisión actual.']],y,d,'ANTECEDENTE');await append('Identificación de antecedente',cover.output('arraybuffer'));}await append('Sistemas: '+item.name,await item.blob.arrayBuffer(),item.pages);}}
    }
    progress('Consolidando correctivos y paginación…');await append('Relación final de correctivos',correctives(d,issues));
    const font=await target.embedFont(PDFLib.StandardFonts.Helvetica);const count=target.getPageCount();target.getPages().forEach((p,i)=>{const {width}=p.getSize();p.drawRectangle({x:width-132,y:3,width:128,height:12,color:PDFLib.rgb(1,1,1)});p.drawText(`PCI ${i+1} / ${count}`,{x:width-118,y:6,size:8,font,color:PDFLib.rgb(.15,.24,.34)});if(d.partial)p.drawText('BORRADOR - DATOS INCOMPLETOS / SIN VALIDAR',{x:18,y:6,size:7,font,color:PDFLib.rgb(.4,.4,.4)});});
    target.setTitle(`${d.centerName} · ${d.revision} · ${d.year}`);target.setAuthor(d.author);target.setSubject('Informe PCI · INTEGRAL');target.setProducer('INTEGRAL · Generador PCI v1');
    const bytes=await target.save();return {blob:new Blob([bytes],{type:'application/pdf'}),manifest,count};
  }
  return {checks,installations,thumbnails,extract,generate};
})();
