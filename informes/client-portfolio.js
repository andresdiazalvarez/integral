/* Número general y selección estricta de cliente para todo el informe PCI. */
(function(root){
  const key='clientPortfolio',selectionKey='selectedClientReport';let cached={clients:[],nextNumber:1};
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/\s+/g,' ');
  function clientName(value){const name=String(value||'').trim();return /^(sin cliente|no informado|sin cabecera|sistemas?)$/i.test(norm(name))?'':name;}
  function same(client,name){return [client.name,...(client.aliases||[])].some(n=>norm(n)===norm(name)&&norm(name));}
  function owner(row,module,sources){const report=sources.reportLists?.[module]?.find(r=>r.id===row._reportId);return clientName(report?.client)||clientName(row.cliente);}
  function entries(report){return report.sourceEntries?.length?report.sourceEntries:(report.systems||[]).map((s,i)=>({...s.data,...s,id:s.id||'legacy:'+i,meta:s.meta||s.data?.meta||{}}));}
  function systemOwner(entry,report){return clientName(entry.meta?.client)||clientName(report.client)||clientName(report.header);}
  function discover(sources,PCI){
    const names=new Set();for(const module of ['correctivos','bie','hidrantes']){for(const r of sources.reportLists?.[module]||[])if(clientName(r.client))names.add(r.client.trim());for(const row of sources[module]||[]){const name=owner(row,module,sources);if(name)names.add(name);}}
    for(const report of PCI.systemReportSources(sources.sistemas)){const list=entries(report);if(list.length)for(const entry of list){const name=systemOwner(entry,report);if(name)names.add(name);}else{const name=clientName(report.header);if(name)names.add(name);}}
    return [...names];
  }
  function reconcile(state,names,id=()=>crypto.randomUUID()){
    const result=structuredClone(state||{clients:[],nextNumber:1});result.clients=result.clients||[];result.nextNumber=Math.max(Number(result.nextNumber)||1,1,...result.clients.map(c=>Number(c.number)+1));
    for(const name of names){if(!clientName(name)||result.clients.some(c=>same(c,name)))continue;result.clients.push({id:id(),number:result.nextNumber++,name:name.trim(),createdAt:new Date().toISOString()});}return result;
  }
  function archived(name){return cached.clients.some(c=>c.deletedAt&&same(c,name));}
  function scope(sources,client,PCI){
    const records=[],systems=[],unassigned=[];
    for(const module of ['correctivos','bie','hidrantes'])for(const [i,row]of(sources[module]||[]).entries()){
      const name=owner(row,module,sources);if(!name){unassigned.push({module,id:row.id});continue;}if(same(client,name)){const record=PCI.equipment(module,row,i);record.client=client.name;records.push(record);}
    }
    for(const report of PCI.systemReportSources(sources.sistemas)){
      const raw=entries(report),chosen=[],excluded=[];
      for(const entry of raw){const name=systemOwner(entry,report);if(!name)unassigned.push({module:'sistemas',id:entry.id});if(name&&same(client,name))chosen.push(entry);else excluded.push(entry.id);}
      if(!chosen.length){if(!raw.length&&same(client,clientName(report.header)))unassigned.push({module:'sistemas',id:report.id,reason:'sin contenido legible'});continue;}
      if(excluded.some(id=>!id))throw Error('Un informe mezcla clientes y tiene sistemas sin identificador. Guarda sus sistemas con un cliente e identificador antes de generar.');
      systems.push({key:'sistemas:'+report.id,id:report.id,module:'sistemas',name:'Informe '+client.number+' · '+client.name+' · '+(report.sourceKind==='current'?'trabajo abierto':'sistemas guardados'),client:client.name,building:chosen.map(e=>e.meta?.building).filter(Boolean).join(' / '),number:String(report.number||''),revision:report.revisionNumber,source:report,clientEntries:chosen,excludedEntryIds:excluded,signature:PCI.signature(report)});
    }
    const fingerprint=PCI.signature({records:records.map(r=>[r.key,r.signature]).sort(),systems:systems.map(r=>[r.key,r.signature,r.clientEntries.map(e=>e.id)]).sort()});
    return {records,systems,unassigned,fingerprint};
  }
  async function mutate(change){
    // Abrir la base con su esquema existente antes de la transacción única.
    await root.PCIData.get(key);
    const db=await new Promise((resolve,reject)=>{const q=indexedDB.open('integral-pci-meta-v1');q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error);});
    try{return await new Promise((resolve,reject)=>{const tx=db.transaction('meta','readwrite'),store=tx.objectStore('meta'),q=store.get(key);let result;q.onsuccess=()=>{try{cached=reconcile(q.result,[]);result=change(cached);store.put(cached,key);}catch(e){reject(e);tx.abort();}};tx.oncomplete=()=>resolve(result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('No se pudo guardar el informe del cliente.'));});}finally{db.close();}
  }
  async function load(){cached=await root.PCIData.get(key)||{clients:[],nextNumber:1};return cached;}
  async function sync(sources){const names=discover(sources,root.PCI);await mutate(state=>{Object.assign(state,reconcile(state,names));});return cached;}
  async function create(name){name=clientName(name);if(!name)throw Error('Indica el nombre del cliente.');let client;await mutate(state=>{client=state.clients.find(c=>same(c,name));if(client?.deletedAt)throw Error('Este cliente está eliminado. Recupéralo para conservar su número.');if(!client){client={id:crypto.randomUUID(),number:state.nextNumber++,name,createdAt:new Date().toISOString()};state.clients.push(client);}});return client;}
  async function choose(id){await load();const client=cached.clients.find(c=>c.id===id&&!c.deletedAt);if(!client)throw Error('Selecciona un informe de cliente disponible.');await root.PCIData.set(selectionKey,id);return client;}
  async function selected(){await load();const id=await root.PCIData.get(selectionKey);return cached.clients.find(c=>c.id===id&&!c.deletedAt)||null;}
  async function remove(id){await mutate(state=>{const client=state.clients.find(c=>c.id===id);if(!client)throw Error('No se encuentra el cliente.');client.deletedAt=new Date().toISOString();});if(await root.PCIData.get(selectionKey)===id)await root.PCIData.set(selectionKey,null);}
  async function restore(id){await mutate(state=>{const client=state.clients.find(c=>c.id===id);if(client)delete client.deletedAt;});}
  const api={norm,clientName,same,owner,entries,systemOwner,discover,reconcile,scope,archived,load,sync,create,choose,selected,remove,restore};root.PCIClientPortfolio=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
