/* Informes independientes por cliente, conservando el almacén original de equipos. */
(function(root){
  const norm=v=>String(v||'').trim().toLocaleLowerCase('es');
  const uid=()=>crypto.randomUUID();
  function migrate(records,reports=[],id=uid){
    const list=reports.map(r=>({...r})),groups=new Map();
    for(const report of list)if(!groups.has(norm(report.client)))groups.set(norm(report.client),report);
    const rows=records.map(row=>{
      let report=row._reportId&&list.find(r=>r.id===row._reportId);
      if(!report){report=groups.get(norm(row.cliente));if(!report){report={id:row._reportId||id(),client:String(row.cliente||'').trim()||'Sin cliente',building:String(row.edificio||''),createdAt:new Date().toISOString()};list.push(report);groups.set(norm(row.cliente),report);}}
      return {...row,_reportId:report.id};
    });return {records:rows,reports:list};
  }
  function merge(all,reportId,rows){return [...all.filter(r=>r._reportId!==reportId),...rows.map(r=>({...r,_reportId:reportId}))];}
  async function create(options){
    const {module,dbName,getRecords,setRecords,enter}=options;
    let reports=[],all=[],active=null,trash=[],working=false,editingId=null;
    if(root.PCIClientPortfolio)await root.PCIClientPortfolio.load();
    const hiddenClient=name=>root.PCIClientPortfolio?.archived(name)||false;
    const hiddenReport=report=>hiddenClient(report.client)||(!root.PCIClientPortfolio?.clientName(report.client)&&all.filter(r=>r._reportId===report.id).some(r=>hiddenClient(r.cliente))); 
    async function transaction(change,write=true){
      const db=await new Promise((resolve,reject)=>{const q=indexedDB.open(dbName);q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error);});
      try{return await new Promise((resolve,reject)=>{
        const tx=db.transaction('state',write?'readwrite':'readonly'),store=tx.objectStore('state'),values={};let count=0,result;
        for(const key of ['records','clientReports','clientReportsTrash']){const q=store.get(key);q.onsuccess=()=>{values[key]=q.result||[];if(++count===3){try{result=change(values);if(write)for(const k of Object.keys(values))store.put(values[k],k);}catch(e){reject(e);tx.abort();}}};}
        tx.oncomplete=()=>resolve(result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('No se pudo guardar el informe.'));
      });}finally{db.close();}
    }
    await transaction(state=>{const migrated=migrate(state.records.length?state.records:getRecords(),state.clientReports);state.records=migrated.records;state.clientReports=migrated.reports;all=state.records;reports=state.clientReports;trash=state.clientReportsTrash;});
    const main=document.querySelector('main'),home=document.createElement('section'),bar=document.createElement('div'),dialog=document.createElement('dialog');
    home.id='clientReportsHome';home.className='client-reports-home';
    home.innerHTML='<h1>Informes de clientes</h1><button type="button" class="primary" id="newClientReport">Preparar informe</button><div id="clientReportList"></div><button type="button" class="secondary" id="restoreClientReport" hidden>Recuperar último informe eliminado</button><p id="clientReportStatus" role="status"></p>';
    bar.className='client-report-bar';bar.hidden=true;bar.innerHTML='<button type="button" class="back">← Informes de clientes</button><strong></strong><button type="button" class="secondary" data-edit-report>Cliente y edificio</button>';
    dialog.innerHTML='<form><h2>Preparar informe</h2><label>Cliente<input name="client" required autocomplete="organization"></label><label>Edificio<input name="building" autocomplete="off"></label><div class="client-report-actions"><button type="submit" class="primary">Crear informe</button><button type="button" class="secondary">Volver</button></div><p role="alert"></p></form>';
    const style=document.createElement('style');style.textContent=`
      #clientReportsHome{max-width:1100px;margin:28px auto;padding:0 18px}#clientReportsHome h1{font-size:clamp(25px,4vw,40px);margin:0 0 20px}
      #clientReportList{display:grid;gap:12px;margin:18px 0}.client-report-row{display:flex;align-items:center;gap:12px;border:1px solid #ccc;border-radius:10px;background:#fff;padding:14px}
      .client-report-name{flex:1;border:0;background:none;text-align:left;font-size:18px;font-weight:700;color:#15384e;cursor:pointer;min-width:0;overflow-wrap:anywhere}
      .client-report-actions{display:flex;gap:8px;flex-wrap:wrap}.client-report-actions button{width:auto;margin:0;min-height:42px;padding:9px 16px;border-radius:7px;border:1px solid #b9c7d2;cursor:pointer}
      .client-report-delete{background:#d72622!important;color:white!important;border-color:#d72622!important}.client-report-pdf{background:#1262cb;color:white}.client-report-word{background:#fff;color:#17436a}
      .client-report-bar{display:flex;gap:18px;align-items:center;padding:14px 20px;background:#fff;border-bottom:1px solid #ddd}.client-report-bar[hidden],#clientReportsHome[hidden],main[hidden]{display:none!important}
      .client-report-bar button{width:auto;margin:0}.client-report-bar{flex-wrap:wrap}dialog{border:1px solid #bbc5cd;border-radius:12px;padding:24px;max-width:520px;width:90vw}dialog::backdrop{background:#0006}dialog input{box-sizing:border-box;width:100%;padding:12px;margin:6px 0 15px;border:1px solid #aaa;border-radius:7px}
      @media(max-width:600px){.client-report-row{align-items:stretch;flex-direction:column}.client-report-name{min-height:42px}.client-report-actions button{flex:1}}
    `;document.head.append(style);main.before(home,bar);document.body.append(dialog);
    const status=home.querySelector('#clientReportStatus');
    function render(){
      const list=home.querySelector('#clientReportList');list.replaceChildren();
      for(const report of reports.filter(r=>!hiddenReport(r))){const row=document.createElement('article');row.className='client-report-row';const name=document.createElement('button');name.type='button';name.className='client-report-name';name.textContent=report.client;name.onclick=()=>run(()=>open(report.id));
        const actions=document.createElement('div');actions.className='client-report-actions';
        for(const [label,kind,fn]of [['PDF','pdf',()=>exportReport(report,'pdf')],['Word','word',()=>exportReport(report,'word')],['Eliminar','delete',()=>remove(report)]]){const b=document.createElement('button');b.type='button';b.textContent=label;b.className='client-report-'+kind;b.onclick=()=>run(fn);actions.append(b);}row.append(name,actions);list.append(row);}
      if(!list.childNodes.length){const p=document.createElement('p');p.textContent='Todavía no hay informes. Pulsa «Preparar informe». ';list.append(p);}
      home.querySelector('#restoreClientReport').hidden=!trash.length;
    }
    async function run(fn){if(working)return;working=true;home.querySelectorAll('button').forEach(b=>b.disabled=true);try{await fn();}catch(e){status.textContent=e.message;console.error(e);}finally{working=false;home.querySelectorAll('button').forEach(b=>b.disabled=false);}}
    async function persist(rows){
      if(!active)return;
      const report=active;
      await transaction(state=>{if(!state.clientReports.some(r=>r.id===report.id))throw Error('Este informe fue eliminado en otra ventana. Vuelve a la lista de clientes.');state.records=merge(state.records,report.id,rows);all=state.records;reports=state.clientReports;trash=state.clientReportsTrash;});
    }
    async function open(id){
      if(root.PCIClientPortfolio)await root.PCIClientPortfolio.load();
      if(active)await persist(getRecords());
      await transaction(state=>{all=state.records;reports=state.clientReports;trash=state.clientReportsTrash;},false);
      active=reports.find(r=>r.id===id);if(!active)throw Error('No se encuentra el informe.');
      if(hiddenReport(active)){active=null;throw Error('Este cliente está eliminado. Recupéralo desde Inicio.');}
      setRecords(all.filter(r=>r._reportId===id));for(const input of main.querySelectorAll('input[id^="filter"]'))input.value='';for(const [id,value]of [['seenFilter','all'],['sortOrder','none']]){const select=document.getElementById(id);if(select)select.value=value;}
      main.hidden=false;home.hidden=true;bar.hidden=false;bar.querySelector('strong').textContent=active.client;enter();window.scrollTo(0,0);
    }
    async function showHome(){if(active)await persist(getRecords());active=null;setRecords([]);main.hidden=true;home.hidden=false;bar.hidden=true;render();window.scrollTo(0,0);}
    async function remove(report){
      if(!confirm('¿Eliminar el informe de '+report.client+' y sus equipos? Podrás recuperarlo desde esta pantalla.'))return;
      await transaction(state=>{const found=state.clientReports.find(r=>r.id===report.id);if(!found)return;const rows=state.records.filter(r=>r._reportId===report.id);state.clientReportsTrash.push({report:found,records:rows,deletedAt:new Date().toISOString()});state.clientReports=state.clientReports.filter(r=>r.id!==report.id);state.records=state.records.filter(r=>r._reportId!==report.id);reports=state.clientReports;all=state.records;trash=state.clientReportsTrash;});render();status.textContent='Informe eliminado. Puedes recuperarlo con el botón inferior.';
    }
    async function restore(){await transaction(state=>{const item=state.clientReportsTrash.pop();if(item){state.clientReports.push(item.report);state.records.push(...item.records);}reports=state.clientReports;all=state.records;trash=state.clientReportsTrash;});render();status.textContent='Informe recuperado.';}
    const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    async function exportReport(report,format){
      if(root.PCIClientPortfolio)await root.PCIClientPortfolio.load();
      if(hiddenReport(report))throw Error('Este cliente está eliminado. Recupéralo desde Inicio.');
      status.textContent='Preparando '+format.toUpperCase()+' de '+report.client+'…';
      await transaction(state=>{all=state.records;},false);
      const rows=all.filter(r=>r._reportId===report.id).map(r=>options.clean?options.clean(r):r).map((r,i)=>PCI.equipment(module,r,i));
      const issues=PCI.consolidate(rows),plan=PCI.equipmentPlan(module,rows,issues,[],6),groups=PCI.correctiveGroups(module,plan.correctiveRecords),d={centerName:report.client,code:report.building,revision:'',year:'',actaNumber:'',photosPerPage:6};
      let blob;
      if(format==='pdf'){const bytes=await PCIPdf.equipmentReport(d,module,rows,[],issues);blob=new Blob([bytes],{type:'application/pdf'});}
      else{const tables=groups.map(g=>'<h2>'+esc(g.title)+'</h2><table><tr><th>Edificio / dependencia</th><th>Número</th><th>Modelo</th><th>Incidencia</th></tr>'+g.rows.map(r=>'<tr>'+[r.building,r.number,r.model,r.incidence].map(v=>'<td>'+esc(v)+'</td>').join('')+'</tr>').join('')+'</table>').join('');
        const photos=plan.photoPages.map(page=>'<section class="photos">'+page.map(p=>'<div class="photo"><p>'+esc([p.record.building,p.record.number,p.record.location].filter(Boolean).join(' · '))+'</p><img src="'+p.src+'"></div>').join('')+'</section>').join('');
        blob=new Blob(['\ufeff<!doctype html><html><head><meta charset="utf-8"><style>@page{size:A4;margin:16mm}body{font:10pt Arial}h1{text-align:center;color:#205e99}h2{font-size:11pt;background:#205e99;color:white;padding:6pt}table{border-collapse:collapse;width:100%;margin-bottom:12pt}td,th{border:1px solid #111;padding:5pt}th{background:#dceaf6}.photos{page-break-before:always}.photo{display:inline-block;vertical-align:top;width:47%;margin:1%;height:76mm;page-break-inside:avoid}.photo img{max-width:100%;max-height:60mm}</style></head><body><h1>'+esc(report.client)+'</h1><h2>'+esc(PCI.names[module])+'</h2>'+tables+photos+'</body></html>'],{type:'application/msword;charset=utf-8'});
      }
      const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=report.client.replace(/[^\p{L}\p{N} -]/gu,'_')+' - '+PCI.names[module]+(format==='pdf'?'.pdf':'.doc');link.click();setTimeout(()=>URL.revokeObjectURL(url),60000);status.textContent=format.toUpperCase()+' preparado: '+report.client;
    }
    function reportDialog(report=null){editingId=report?.id||null;const form=dialog.querySelector('form');form.reset();form.elements.client.value=report?.client==='Sin cliente'?'':report?.client||'';form.elements.building.value=report?.building||'';form.querySelector('h2').textContent=report?'Cliente y edificio':'Preparar informe';form.querySelector('[type=submit]').textContent=report?'Guardar datos':'Crear informe';dialog.querySelector('[role=alert]').textContent='';dialog.showModal();if(!report&&root.PCIClientPortfolio)root.PCIClientPortfolio.selected().then(client=>{if(dialog.open&&!editingId&&!form.elements.client.value)form.elements.client.value=client?.name||'';}).catch(console.error);}
    home.querySelector('#newClientReport').onclick=()=>reportDialog();bar.querySelector('[data-edit-report]').onclick=()=>reportDialog(active);dialog.querySelector('button[type=button]').onclick=()=>dialog.close();
    dialog.querySelector('form').onsubmit=async event=>{event.preventDefault();const form=event.currentTarget,client=form.elements.client.value.trim(),building=form.elements.building.value.trim();if(!client||form.dataset.saving)return;form.dataset.saving='true';form.querySelector('[type=submit]').disabled=true;try{if(root.PCIClientPortfolio){await root.PCIClientPortfolio.load();if(hiddenClient(client))throw Error('Este cliente está eliminado. Recupéralo desde Inicio.');}const report={id:editingId||uid(),client,building,createdAt:new Date().toISOString()};if(editingId&&active)await persist(getRecords());await transaction(state=>{const old=state.clientReports.find(r=>r.id===report.id);if(old){state.records=state.records.map(r=>r._reportId!==report.id?r:{...r,cliente:!r.cliente||norm(r.cliente)===norm(old.client)?client:r.cliente,edificio:!r.edificio||r.edificio===old.building?building:r.edificio});Object.assign(old,{client,building});}else state.clientReports.push(report);reports=state.clientReports;});if(active?.id===report.id)active=null;dialog.close();await run(()=>open(report.id));}catch(e){dialog.querySelector('[role=alert]').textContent=e.message;}finally{delete form.dataset.saving;form.querySelector('[type=submit]').disabled=false;}};
    bar.querySelector('button').onclick=()=>run(showHome);home.querySelector('#restoreClientReport').onclick=()=>run(restore);
    const oldCleanup=document.getElementById('clearFinishedReportsBtn');if(oldCleanup)oldCleanup.hidden=true;
    main.hidden=true;setRecords([]);render();
    window.addEventListener('focus',()=>root.PCIClientPortfolio?.load().then(()=>{if(active&&hiddenReport(active)){active=null;setRecords([]);main.hidden=true;home.hidden=false;bar.hidden=true;}render();}).catch(console.error));
    window.addEventListener('message',event=>{if(event.origin!==location.origin||event.source!==window.parent||event.data?.type!=='integral:portfolio-selection')return;root.PCIClientPortfolio?.load().then(()=>{if(active&&hiddenReport(active)){active=null;setRecords([]);main.hidden=true;home.hidden=false;bar.hidden=true;}render();}).catch(console.error);});
    return {persist,get active(){return active;},showHome};
  }
  const api={migrate,merge,create};root.ClientReports=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
