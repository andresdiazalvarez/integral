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
    const center=[d.code,d.centerName].map(PCI.reportText).filter(Boolean).join(' · ');pdf.setFont('helvetica','bold');pdf.setFontSize(9);const centerSize=Math.min(9,178/Math.max(pdf.getTextWidth(center),1)*9);line(pdf,center,16,35,centerSize,true);
    line(pdf,[[d.revision,d.year].filter(Boolean).join(' · '),d.actaNumber?'Acta '+d.actaNumber:''].filter(Boolean).join('   |   '),16,41,9);
    if(d.partial)line(pdf,'BORRADOR · DATOS INCOMPLETOS / SIN VALIDAR',16,46,7,true);
  }
  function start(pdf,d,title,first=false){if(!first)pdf.addPage();head(pdf,d,title);return 48;}
  function table(pdf,headings,rows,y,options={}){pdf.autoTable({startY:y,head:headings.length?[headings]:undefined,body:rows,margin:{left:16,right:16,top:48,bottom:19},styles:{font:'helvetica',fontSize:9,cellPadding:2.4,overflow:'linebreak',lineColor:[190,200,210],lineWidth:.15},headStyles:{fillColor:blue,fontSize:9},alternateRowStyles:{fillColor:[247,249,251]},rowPageBreak:'avoid',showHead:'everyPage',didDrawPage:data=>{if(data.pageNumber>1&&options.draft)head(pdf,options.draft,options.title||'CONTINUACIÓN');},...options});return pdf.lastAutoTable.finalY+6;}
  function band(pdf,title,y){if(y>245)y=start(pdf,pdf.pciDraft,pdf.pciTitle);pdf.setFillColor(...blue);pdf.rect(16,y,178,7,'F');pdf.setTextColor(255);pdf.setFont('helvetica','bold');pdf.setFontSize(Math.min(10,172/Math.max(pdf.getTextWidth(title),1)*10));pdf.text(title,18,y+4.8);return y+10;}
  function fields(pdf,rows,y,d,title){const values=rows.map(([label,value])=>[label,PCI.reportText(value)]).filter(([,value])=>value);return values.length?table(pdf,[],values,y,{columnStyles:{0:{cellWidth:62,fontStyle:'bold'}},draft:d,title}):y;}
  function correctiveHeader(pdf,d,title){
    const page=pdf.internal.getCurrentPageInfo().pageNumber;pdf.pciCompactHeaders=pdf.pciCompactHeaders||new Set();if(pdf.pciCompactHeaders.has(page))return;pdf.pciCompactHeaders.add(page);
    pdf.setFont('helvetica','bold');pdf.setFontSize(15);pdf.setTextColor(0);pdf.text(title,105,18,{align:'center'});
    pdf.setFont('helvetica','normal');pdf.setFontSize(8);const context=[d.code,d.centerName,[d.revision,d.year].filter(Boolean).join(' · ')].filter(Boolean).join(' · ');const size=Math.min(8,178/Math.max(pdf.getTextWidth(context),1)*8);line(pdf,context,16,25,size);
    if(d.partial)line(pdf,'BORRADOR · DATOS INCOMPLETOS / SIN VALIDAR',16,30,7,true);
  }
  function correctiveTables(pdf,d,module,groups,y,pageTitle,compactHeader=true){
    const drawHeader=()=>compactHeader?correctiveHeader(pdf,d,pageTitle):head(pdf,d,pageTitle),top=compactHeader?35:48;
    const numberHeading=module==='correctivos'?'Nº EXTINTOR':module==='bie'?'Nº BIE':'Nº HIDRANTE';
    for(const group of groups){if(y>246){pdf.addPage();drawHeader();y=top;}
      pdf.autoTable({startY:y,margin:{left:16,right:16,top,bottom:19},theme:'grid',
        head:[[{content:group.title,colSpan:4,styles:{fillColor:[35,95,153],textColor:255,halign:'left',fontSize:9,fontStyle:'bold',minCellHeight:8}}],
          ['EDIFICIO / DEPENDENCIA',numberHeading,'MODELO','INCIDENCIA']],
        body:group.rows.map(r=>[r.building,r.number,r.model,r.incidence].map(PCI.reportText)),
        styles:{font:'helvetica',fontSize:8,textColor:0,fillColor:255,lineColor:0,lineWidth:.15,cellPadding:1.8,minCellHeight:7,overflow:'linebreak'},
        headStyles:{fillColor:[220,234,246],textColor:0,fontStyle:'bold',fontSize:7,halign:'center'},
        columnStyles:{0:{cellWidth:45},1:{cellWidth:23},2:{cellWidth:53},3:{cellWidth:57}},
        showHead:'everyPage',rowPageBreak:'avoid',willDrawPage:drawHeader});
      y=pdf.lastAutoTable.finalY+4;
    }
    return y;
  }
  async function image(pdf,src,x,y,w,h,align='center'){
    if(!src||!/^data:image\//.test(src))throw Error('Falta una imagen o su referencia no contiene la fotografía.');
    const img=await new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(Error('No se pudo leer una fotografía.'));image.src=src;});
    const canvas=document.createElement('canvas');canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;canvas.getContext('2d').drawImage(img,0,0);const ratio=Math.min(w/canvas.width,h/canvas.height);const iw=canvas.width*ratio,ih=canvas.height*ratio;
    const top=y+(align==='top'?0:(h-ih)/2);
    pdf.addImage(canvas.toDataURL('image/jpeg',.9),'JPEG',x+(w-iw)/2,top,iw,ih);
    return {bottom:top+ih};
  }
  async function acta(d,signatures){
    const pdf=doc(),ink=[30,91,151],left=14.5,width=181;
    const value=PCI.reportText;
    function header(){
      if(window.PCIActaBrand)pdf.addImage(window.PCIActaBrand,'PNG',left,7,width,width*117/624);
      pdf.setDrawColor(...ink);pdf.setLineWidth(.4);pdf.line(left,43,195.5,43);pdf.setLineWidth(.2);pdf.line(left,280,195.5,280);
    }
    function page(){pdf.addPage();header();}
    function section(text,y){pdf.setFillColor(...ink);pdf.rect(left,y,width,4.4,'F');pdf.setFont('helvetica','bold');pdf.setFontSize(8);pdf.setTextColor(255);pdf.text(text,left+2,y+3.2);return y+9;}
    function grid(headings,rows,y,options={}){
      if(!rows.length)return y;
      pdf.autoTable({startY:y,head:headings.length?[headings]:undefined,body:rows,theme:'grid',margin:{left,right:14.5,top:52,bottom:22},
        styles:{font:'times',fontSize:8,textColor:40,cellPadding:2,lineColor:[180,180,180],lineWidth:.15,overflow:'linebreak'},
        headStyles:{font:'helvetica',fontSize:7.5,fontStyle:'bold',fillColor:ink,textColor:255},
        showHead:'everyPage',rowPageBreak:'avoid',willDrawPage:info=>{if(info.pageNumber>1)header();},...options});return pdf.lastAutoTable.finalY+5;
    }
    function detail(rows,y){for(const [label,raw] of rows){const text=value(raw);if(!text)continue;const lines=pdf.splitTextToSize(text,width-52);const h=Math.max(6,lines.length*3.5+2);if(y+h>267){page();y=53;}pdf.setFont('helvetica','bold');pdf.setFontSize(7.5);pdf.setTextColor(20);pdf.text(label,left,y);pdf.setFont('helvetica','normal');pdf.text(lines,left+49,y);y+=h;}return y+3;}
    const pe=({Trimestral:'T',Semestral:'S',Anual:'A',Trienal:'TR',Quinquenal:'Q',Decenal:'D'})[d.periodicity]||value(d.periodicity),review=[d.revision,d.year].filter(Boolean).join(' · ');
    header();let y=49;
    const reference=[d.actaNumber?'Ref: ACTA Nº '+d.actaNumber:'',d.code,d.centerName,d.issued?'Fecha: '+d.issued:'',pe?'PE: '+pe:''].filter(Boolean).join('   |   ');
    if(reference){pdf.setFont('helvetica','normal');pdf.setFontSize(7);pdf.setTextColor(65);const lines=pdf.splitTextToSize(reference,width);pdf.text(lines,left,y);y+=lines.length*3.5+3;}
    y=section('1. NOTIFICACIONES PREVIAS',y);
    const notifications=[['¿Ha notificado el mantenedor el comienzo de trabajos?',value(d.notified)],['¿Se ha informado a la compañía aseguradora?',value(d.insurer)]].filter(r=>r[1]);
    y=grid([],notifications,y,{columnStyles:{0:{cellWidth:145},1:{cellWidth:36}}});
    y=section('2. DATOS DE LA PROPIEDAD / USUARIO / TITULAR',y+3);
    y=detail([['Nombre / razón social:',d.holderName],['CIF / NIF:',d.holderTax],['Localización / Edificio:',d.installationBuilding||d.centerName],['Dirección:',d.holderAddress],['Ciudad:',d.holderCity],['Representante / Responsable:',d.representative],['Responsable mantenimiento:',d.presentResponsible],['Contacto:',d.holderContact]],y+2);
    y=section('3. DATOS DE LA EMPRESA MANTENEDORA (RD 513/2017)',y+3);
    y=detail([['Nombre:',d.companyName],['CIF:',d.companyTax],['Nº Registro / habilitación:',d.companyRegistration],['Dirección / teléfono:',d.companyAddress],['Correo-e:',d.companyEmail]],y+2);
    if(value(d.companySpecialties)){pdf.setFont('helvetica','bold');pdf.setFontSize(7.5);pdf.setTextColor(...ink);pdf.text('Instalaciones para las que está habilitada:',left,y);y+=4;y=grid([],[[d.companySpecialties]],y);}
    if(value(d.technicians)){pdf.setFont('helvetica','bold');pdf.setFontSize(7.5);pdf.setTextColor(...ink);pdf.text('Operario(s) cualificado(s) responsable(s):',left,y+2);y=grid(['Nombre y apellidos / Compañía / Nº Certificado'],[[d.technicians]],y+7);}
    page();y=section('4. DATOS DE LA INSTALACIÓN',51);
    y=detail([['Localización / Edificio:',d.installationBuilding||d.installationName||d.centerName],['Dirección:',d.installationAddress],['Fecha última revisión:',d.lastReview],['Revisión:',review],['Revisiones trimestrales por:',d.quarterlyBy]],y+2);
    y=section('5. DATOS GENERALES - VERIFICACIONES',y+2);
    const verifications=checks.map((text,i)=>({text,...d.checks?.[i]})).filter(r=>value(r.value)||value(r.comment));
    y=grid(['PE','VERIFICACIÓN','SÍ','NO','N/A'],verifications.map(r=>[pe,r.text+(value(r.comment)?'\n'+r.comment:''),r.value==='Sí'?'X':'',r.value==='No'?'X':'',r.value==='N/A'?'X':'']),y,{columnStyles:{0:{cellWidth:13},1:{cellWidth:130},2:{cellWidth:13},3:{cellWidth:13},4:{cellWidth:12}},alternateRowStyles:{fillColor:[241,241,241]}});
    detail([['Empresa último mantenimiento:',d.previousCompany]],y+8);
    page();y=section('6. INSTALACIONES Y EQUIPOS SOMETIDOS A MANTENIMIENTO',51);
    const pairs=[['Detección y alarma','Abastecimiento de agua'],['Reserva de agua','Sala de bombas / tuberías / válvulas'],['Equipos de bombeo','Hidrantes'],['Extintores','BIE 25 mm'],['BIE 45 mm','BIE alta presión'],['Columna seca','Rociadores húmedos'],['Rociadores secos','Rociadores de preacción'],['Rociadores de diluvio','Agua nebulizada'],['Espuma física','Polvo'],['Agentes gaseosos','Aerosoles condensados'],['Control de humos y calor','Otros / innovadores'],['Señalización luminiscente','']];
    y=grid([],pairs.map(pair=>pair.flatMap(label=>[d.installations?.includes(label)?'X':'',label])),y,{styles:{font:'times',fontSize:8,textColor:20,lineColor:0,lineWidth:.2,cellPadding:2.3,minCellHeight:9},columnStyles:{0:{cellWidth:12},1:{cellWidth:78.5},2:{cellWidth:12},3:{cellWidth:78.5}}});
    y=section('7. TIEMPOS DE EJECUCIÓN',y+12);
    grid(['Fecha inicio','Fecha final','Nº operarios','Horas revisión'],[[[d.start,d.startTime].filter(Boolean).join(' '),[d.end,d.endTime].filter(Boolean).join(' '),d.operators||'',[d.hours,d.hours?d.hoursBasis:''].filter(Boolean).join(' · ')]],y,{columnStyles:{0:{cellWidth:45.25},1:{cellWidth:45.25},2:{cellWidth:45.25},3:{cellWidth:45.25}},bodyStyles:{minCellHeight:12,fillColor:[244,244,244]}});
    page();y=section('8. CORRECTIVOS URGENTES / OBSERVACIONES Y DEFICIENCIAS',51);
    const notes=[d.urgentNotes,d.technicalNotes].map(value).filter(Boolean).join('\n\n');
    y=grid(['CORRECTIVOS URGENTES / OBSERVACIONES / DEFICIENCIAS'],[[notes]],y,{bodyStyles:{minCellHeight:67}});
    if(value(d.finalState))y=grid([],[["Tras las pruebas realizadas el sistema quedó:\n"+d.finalState]],y,{bodyStyles:{fillColor:[215,230,242],font:'helvetica',fontStyle:'bold',minCellHeight:17}});
    if(y>174){page();y=53;}
    pdf.setFont('helvetica','italic');pdf.setFontSize(7);pdf.setTextColor(100);pdf.text('Verificar las operaciones específicas del fabricante no recogidas en el acta de mantenimiento.',left,y+2);y+=11;
    y=section('9. FIRMAS',y);
    const signRows=[[ [d.techSigner,d.techSignerCompany].map(value).filter(Boolean).join('\n'),[d.ownerSigner,d.ownerRole].map(value).filter(Boolean).join('\n') ]];
    const signTop=y+7;
    y=grid(['Firma del técnico cualificado','Firma de la propiedad'],signRows,y,{headStyles:{fillColor:[215,230,242],textColor:ink,font:'helvetica',fontStyle:'bold'},columnStyles:{0:{cellWidth:90.5},1:{cellWidth:90.5}},bodyStyles:{minCellHeight:37,valign:'bottom'}});
    if(signatures.tech)await image(pdf,signatures.tech,left+3,signTop,84,21);
    if(signatures.owner)await image(pdf,signatures.owner,left+93.5,signTop,84,21);
    pdf.setFont('helvetica','italic');pdf.setFontSize(6.5);pdf.setTextColor(100);const notice='La Propiedad y su representante designado tienen conocimiento de la responsabilidad de tomar las acciones correctoras pertinentes para que las instalaciones estén en condiciones de funcionamiento.';pdf.text(pdf.splitTextToSize(notice,width),left,y+2);y+=14;
    if(y>261){page();y=53;}section('10. ANEXOS. INFORME CHECK LIST EQUIPOS.',y);
    for(let n=1;n<=pdf.getNumberOfPages();n++){pdf.setPage(n);pdf.setFillColor(255);pdf.rect(0,0,210,42,'F');header();}
    return pdf.output('arraybuffer');
  }

  async function equipment(d,module,records,excludedPhotos,issues){
    const layout=PCI.photoLayout(d.photosPerPage);
    const {correctiveRecords,photoPages}=PCI.equipmentPlan(module,records,issues,excludedPhotos,layout.perPage);
    const pdf=doc(),title='CORRECTIVOS DE '+PCI.names[module].toUpperCase();correctiveHeader(pdf,d,title);
    const groups=PCI.correctiveGroups(module,correctiveRecords);
    correctiveTables(pdf,d,module,groups,35,title);
    if(!groups.length)line(pdf,'No constan correctivos en los registros seleccionados.',16,41,10);
    // El anexo siempre empieza después de todos los datos, en página nueva.
    for(const photos of photoPages){start(pdf,d,PCI.names[module].toUpperCase()+' · FOTOGRAFÍAS');
      const gap=4,width=87,rowHeight=(226-(layout.rows-1)*gap)/layout.rows;
      for(let row=0;row<layout.rows;row++){
        const items=photos.slice(row*2,row*2+2);if(!items.length)break;
        pdf.setFont('helvetica','normal');pdf.setFontSize(7);
        const captions=items.map(({record:r,index})=>[[PCI.reportText(r.number)?'Equipo '+PCI.reportText(r.number):'', 'Foto '+(index+1)].filter(Boolean).join(' · '),[r.building,r.location].map(PCI.reportText).filter(Boolean).join(' / ')].flatMap(t=>pdf.splitTextToSize(t,width)));
        const captionHeight=Math.max(...captions.map(lines=>lines.length))*2.85+3;
        if(captionHeight>rowHeight*.45)throw Error('Identificación demasiado extensa para la cuadrícula de fotos: '+items[0].record.key);
        const top=49+row*(rowHeight+gap);
        for(let col=0;col<items.length;col++){
          const {src}=items[col],x=16+col*(width+gap);
          line(pdf,captions[col],x,top+2.5,7);
          await image(pdf,src,x,top+captionHeight,width,rowHeight-captionHeight,'center');
        }
      }
    }
    return pdf.output('arraybuffer');
  }
  function correctives(d,issues,records){const pdf=doc();let y=start(pdf,d,'RELACIÓN FINAL DE CORRECTIVOS',true);
    for(const module of Object.keys(PCI.names)){const current=issues.filter(x=>x.module===module);if(!current.length)continue;if(y>230)y=start(pdf,d,'RELACIÓN FINAL DE CORRECTIVOS');y=band(pdf,PCI.names[module].toUpperCase(),y);
      if(module!=='sistemas'){y=correctiveTables(pdf,d,module,PCI.correctiveGroups(module,records.filter(r=>r.module===module),current),y,'RELACIÓN FINAL DE CORRECTIVOS',false);continue;}
      const groups=module==='sistemas'?[['Centrales de detección con averías, alarmas o desconexiones',current.filter(x=>/detecci/i.test(x.type||''))],['Sistemas de extinción con incidencias',current.filter(x=>/extinci/i.test(x.type||''))],['Grupo de presión y red de agua contra incendios',current.filter(x=>/presi|redes/i.test(x.type||''))],['Otros sistemas',current.filter(x=>!/detecci|extinci|presi|redes/i.test(x.type||''))]]:[['',current]];
      for(const [label,rows] of groups){if(!rows.length)continue;if(label){if(y>245)y=start(pdf,d,'RELACIÓN FINAL DE CORRECTIVOS');line(pdf,label,16,y,10,true);y+=6;}y=table(pdf,['Edificio / dependencia','Número / equipo','Incidencia / procedencia'],rows.map(x=>[PCI.reportText(x.building),PCI.reportText(x.number),x.text+(x.status==='antecedente'?'\nANTECEDENTE '+(x.previousRevision||'')+' · pendiente de comprobación':'')]),y,{columnStyles:{0:{cellWidth:44},1:{cellWidth:34}},draft:d,title:'RELACIÓN FINAL DE CORRECTIVOS'});}}
    if(!issues.length)fields(pdf,[['Incidencias','No constan incidencias en los datos seleccionados. No equivale a certificación de conformidad.']],y,d,'RELACIÓN FINAL DE CORRECTIVOS');return pdf.output('arraybuffer');}
  async function parse(blob){return pdfjsLib.getDocument({data:new Uint8Array(await blob.arrayBuffer())}).promise;}
  async function thumbnails(blob,host,selected=null,onToggle=null){const parsed=await parse(blob);host.replaceChildren();for(let n=1;n<=parsed.numPages;n++){const page=await parsed.getPage(n);const viewport=page.getViewport({scale:.24});const canvas=document.createElement('canvas');canvas.width=viewport.width;canvas.height=viewport.height;await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;const button=document.createElement(onToggle?'button':'div');button.className='thumb'+(!selected||selected.includes(n-1)?' selected':'');button.append(canvas,document.createTextNode('Página '+n));if(onToggle){button.type='button';button.setAttribute('aria-pressed',String(selected.includes(n-1)));button.onclick=()=>onToggle(n-1);}host.append(button);}await parsed.destroy();}
  async function extract(blob){const parsed=await parse(blob);let text='';for(let n=1;n<=parsed.numPages;n++){const page=await parsed.getPage(n);text+=(await page.getTextContent()).items.map(i=>i.str).join(' ')+'\n';}const count=parsed.numPages;await parsed.destroy();return {text,count};}
  async function mergePart(target,bytes,pages){const source=await PDFLib.PDFDocument.load(PCI.pdfBytes(bytes));const indices=pages||source.getPageIndices();const copies=await target.copyPages(source,indices);copies.forEach(p=>target.addPage(p));return copies.length;}
  async function generate(data,progress){
    const {draft:d,records,systems,files,issues,signatures}=data;const target=await PDFLib.PDFDocument.create();const manifest=[];
    async function append(label,bytes,pages){const start=target.getPageCount()+1;const count=await mergePart(target,bytes,pages);manifest.push({label,start,end:start+count-1});}
    if(d.mode==='previous'){if(!data.previousActa)throw Error('Falta el acta de la revisión anterior.');const updated=await window.PCIPreviousActa.update(data.previousActa,d,progress);await append('Acta actualizada · '+d.revision,await updated.arrayBuffer());}else{progress('Generando acta nueva…');await append('Acta de mantenimiento',await acta(d,signatures));}
    for(const file of files.filter(f=>f.role==='observations'))await append('Observaciones técnicas del acta: '+file.name,await file.blob.arrayBuffer(),file.pages);
    for(const module of ['correctivos','bie','hidrantes'])if(d.modules[module]){progress('Generando '+PCI.names[module]+'…');await append(PCI.names[module],await equipment(d,module,records.filter(r=>r.module===module),d.excludedPhotos||[],issues));}
    if(d.modules.sistemas){const items=new Map([...systems.map(s=>[s.key,{kind:'saved',...s}]),...files.filter(f=>f.role==='systems').map(f=>[f.id,{kind:'pdf',...f}])]);const order=[...(d.systemOrder||[]),...items.keys()].filter((key,i,all)=>all.indexOf(key)===i&&items.has(key));
      for(const key of order){const item=items.get(key);progress('Incorporando sistemas: '+item.name+'…');if(item.kind==='saved'){const blob=await data.exportSystem(item.id,item.excludedEntryIds||[]);await append('Sistemas: '+item.name,await blob.arrayBuffer());}else{if(item.historical){const cover=doc();let y=start(cover,d,'ANTECEDENTE DE SISTEMAS',true);fields(cover,[['Documento histórico',item.name],['Revisión de origen',item.previousRevision||'No indicada'],['Alcance','Páginas históricas pendientes de comprobación. No acreditan pruebas de la revisión actual.']],y,d,'ANTECEDENTE');await append('Identificación de antecedente',cover.output('arraybuffer'));}await append('Sistemas: '+item.name,await item.blob.arrayBuffer(),item.pages);}}
    }
    progress('Consolidando correctivos y paginación…');await append('Relación final de correctivos',correctives(d,issues,records));
    const font=await target.embedFont(PDFLib.StandardFonts.Helvetica);const count=target.getPageCount();target.getPages().forEach((p,i)=>{const {width}=p.getSize();p.drawRectangle({x:width-132,y:3,width:128,height:12,color:PDFLib.rgb(1,1,1)});p.drawText(`PCI ${i+1} / ${count}`,{x:width-118,y:6,size:8,font,color:PDFLib.rgb(.15,.24,.34)});if(d.partial)p.drawText('BORRADOR - DATOS INCOMPLETOS / SIN VALIDAR',{x:18,y:6,size:7,font,color:PDFLib.rgb(.4,.4,.4)});});
    target.setTitle(`${d.centerName} · ${d.revision} · ${d.year}`);target.setAuthor(d.author);target.setSubject('Informe PCI · INTEGRAL');target.setProducer('INTEGRAL · Generador PCI v1');
    const bytes=await target.save();return {blob:new Blob([bytes],{type:'application/pdf'}),manifest,count};
  }
  return {checks,installations,thumbnails,extract,generate};
})();
