/* Actualiza una copia visual del acta original; no altera el archivo guardado. */
(function(root){
  const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const date=s=>s?String(s).split('-').reverse().join('/'):'';
  function lines(items,height){
    const rows=[];
    for(const item of items){if(!item.str?.trim())continue;const y=height-item.transform[5];let row=rows.find(r=>Math.abs(r.y-y)<2.5);if(!row){row={y,items:[]};rows.push(row);}row.items.push({text:item.str,x:item.transform[4],y,width:item.width,height:Math.max(5,Math.abs(item.transform[3])||item.height||8)});}
    return rows.sort((a,b)=>a.y-b.y).map(row=>{row.items.sort((a,b)=>a.x-b.x);let text='';const spans=[];for(const item of row.items){if(text)text+=' ';spans.push({...item,start:text.length,end:text.length+item.text.length});text+=item.text;}return {...row,text,spans};});
  }
  function plan(items,width,height,d){
    const rows=lines(items,height),edits=[];let revisions=0,starts=0,ends=0;
    function replace(row,start,length,text){const hit=row.spans.filter(s=>s.end>start&&s.start<start+length);if(!hit.length)return;const first=hit[0],last=hit[hit.length-1];const x=first.x+first.width*Math.max(0,start-first.start)/first.text.length;const right=last.x+last.width*Math.min(last.text.length,start+length-last.start)/last.text.length;edits.push({x,y:row.y,width:Math.max(8,right-x),height:Math.max(...hit.map(s=>s.height)),text});}
    for(const row of rows){
      for(const match of row.text.matchAll(/\b\d+\s*R\s*T\b/gi)){replace(row,match.index,match[0].length,d.revision);revisions++;}
      // Fecha del encabezado y de la hoja técnica. La última revisión se conserva.
      if(!/ultima|inicio|final|fin de|fin:/i.test(norm(row.text))){const match=row.text.match(/\bFecha\s*:\s*(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}|\d{1,2}[\/-]\d{4}|\d{4}-\d{2}-\d{2})/i);if(match){const old=match[1],current=/^\d{1,2}[\/-]\d{4}$/.test(old)?d.end.slice(5,7)+'/'+d.end.slice(0,4):date(d.end);replace(row,match.index+match[0].indexOf(old),old.length,current);}}
    }
    function execution(kind,label,newDate){
      for(const row of rows){const heading=row.spans.find(s=>label.test(norm(s.text)));if(!heading)continue;
        const after=row.spans.filter(s=>s.x>heading.x+heading.width+2);
        const nextHeading=after.find(s=>/fecha|operarios|horas/i.test(norm(s.text)));
        const maxX=nextHeading?nextHeading.x-5:Math.min(width-42,heading.x+125);
        const inline=after.find(s=>/\d{1,4}[\/-]\d{1,2}/.test(s.text)&&(!nextHeading||s.x<nextHeading.x));
        if(inline){replace(row,inline.start,inline.text.length,newDate);kind==='start'?starts++:ends++;continue;}
        const inSame=heading.text.match(/\d{1,4}[\/-]\d{1,2}[\/-]\d{1,4}/);
        if(inSame){replace(row,heading.start+inSame.index,inSame[0].length,newDate);kind==='start'?starts++:ends++;continue;}
        const below=rows.filter(r=>r.y>row.y+3&&r.y<row.y+45).flatMap(r=>r.spans).find(s=>s.x>=heading.x-5&&s.x<maxX&&/\d{1,4}[\/-]\d{1,2}/.test(s.text));
        if(below)edits.push({...below,text:newDate});
        else edits.push({x:heading.x+1,y:row.y+19,width:Math.max(45,maxX-heading.x-3),height:9,text:newDate});
        kind==='start'?starts++:ends++;
      }
    }
    execution('start',/^(?:fecha\s*(?:de\s*)?inicio|inicio de trabajos)\b/,date(d.start));
    execution('end',/^(?:fecha\s*(?:de\s*)?(?:final|fin)|fin de trabajos)\b/,date(d.end));
    // Se vacían los recuadros de firma, incluidas imágenes incrustadas.
    const sign=rows.find(r=>/firma del tecnico|firma del tecnico cualificado|firma del tecnico|firma de la propiedad/i.test(norm(r.text)));
    const responsibility=sign&&rows.find(r=>r.y>sign.y&&/la propiedad y|imagenes de firma/i.test(norm(r.text)));
    if(sign&&responsibility)edits.push({clear:true,x:width*.073,y:sign.y+5,width:width*.854,height:Math.max(10,responsibility.y-sign.y-13)});
    const keeper=rows.find(r=>/^el mantenedor$/i.test(r.text.trim()));
    if(keeper)edits.push({clear:true,x:Math.max(0,width-200),y:Math.max(0,keeper.y-72),width:165,height:62});
    return {edits,revisions,starts,ends};
  }
  async function update(blob,d,progress=()=>{}){
    if(!d.revision||!d.start||!d.end)throw Error('Indica la revisión actual y las fechas de inicio y fin.');
    const parsed=await pdfjsLib.getDocument({data:new Uint8Array(await blob.arrayBuffer())}).promise;
    const output=await PDFLib.PDFDocument.create();const totals={revisions:0,starts:0,ends:0};
    try{for(let n=1;n<=parsed.numPages;n++){
      progress('Actualizando acta anterior: página '+n+' de '+parsed.numPages+'…');
      const page=await parsed.getPage(n),unit=page.getViewport({scale:1}),viewport=page.getViewport({scale:2});
      const content=await page.getTextContent(),changes=plan(content.items,unit.width,unit.height,d);
      for(const key of Object.keys(totals))totals[key]+=changes[key];
      const canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);const ctx=canvas.getContext('2d');
      await page.render({canvasContext:ctx,viewport,annotationMode:1}).promise;
      for(const annotation of await page.getAnnotations()){if(annotation.fieldType!=='Sig'||!annotation.rect)continue;const [x1,y1,x2,y2]=annotation.rect;ctx.fillStyle='white';ctx.fillRect(Math.min(x1,x2)*2,(unit.height-Math.max(y1,y2))*2,Math.abs(x2-x1)*2,Math.abs(y2-y1)*2);}
      for(const edit of changes.edits){ctx.fillStyle='white';if(edit.clear){ctx.fillRect(edit.x*2,edit.y*2,edit.width*2,edit.height*2);continue;}
        ctx.fillRect(edit.x*2-1,(edit.y-edit.height)*2-1,Math.max(edit.width,edit.text.length*edit.height*.52)*2+3,edit.height*2+4);
        ctx.fillStyle='#111';ctx.font=(edit.height*2)+'px Arial';ctx.fillText(edit.text,edit.x*2,edit.y*2);
      }
      const bytes=await (await fetch(canvas.toDataURL('image/png'))).arrayBuffer();const image=await output.embedPng(bytes);const target=output.addPage([unit.width,unit.height]);target.drawImage(image,{x:0,y:0,width:unit.width,height:unit.height});canvas.width=canvas.height=0;page.cleanup();
    }}finally{await parsed.destroy();}
    if(!totals.revisions||!totals.starts||!totals.ends)throw Error('No se han localizado todos los campos de revisión, inicio y fin en este PDF. Usa el acta con texto seleccionable o crea el acta nueva; no se ha incorporado un acta sin actualizar.');
    return new Blob([await output.save()],{type:'application/pdf'});
  }
  const api={plan,lines,update};root.PCIPreviousActa=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
