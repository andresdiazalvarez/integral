/* Selección del informe general desde Inicio. */
(async function(){
  const host=document.getElementById('client-portfolio'),status=host.querySelector('[role=status]');let state,selected,busy=false;
  function announce(){for(const frame of document.querySelectorAll('iframe'))frame.contentWindow.postMessage({type:'integral:portfolio-selection'},location.origin);}
  async function refresh(){state=await PCIClientPortfolio.sync(await PCIData.sources());selected=await PCIClientPortfolio.selected();render();}
  function render(){
    const list=host.querySelector('[data-client-list]');list.replaceChildren();
    for(const client of state.clients.filter(c=>!c.deletedAt).sort((a,b)=>a.number-b.number)){
      const row=document.createElement('article');row.className='portfolio-row';if(selected?.id===client.id)row.classList.add('selected');
      const label=document.createElement('strong');label.textContent='Informe '+client.number+' · '+client.name;
      const select=document.createElement('button');select.textContent=selected?.id===client.id?'Seleccionado':'Seleccionar';select.disabled=selected?.id===client.id;select.onclick=()=>run(async()=>{selected=await PCIClientPortfolio.choose(client.id);render();announce();status.textContent='Informe '+client.number+' seleccionado. Ya puedes ir a «Generar informe PCI».';});
      const remove=document.createElement('button');remove.textContent='Eliminar';remove.className='delete-client';remove.onclick=()=>run(async()=>{if(!confirm('¿Eliminar el informe '+client.number+' y el cliente '+client.name+' de toda la aplicación? Sus datos quedarán archivados y podrás recuperarlos.'))return;await PCIClientPortfolio.remove(client.id);await refresh();announce();status.textContent='Cliente e informe eliminados. Puedes recuperarlos con el botón inferior.';});
      row.append(label,select,remove);list.append(row);
    }
    if(!list.childNodes.length){const p=document.createElement('p');p.textContent='Crea un informe de cliente para comenzar.';list.append(p);}
    host.querySelector('[data-restore-client]').hidden=!state.clients.some(c=>c.deletedAt);
    document.getElementById('selected-client-report').textContent=selected?'Informe '+selected.number+' · '+selected.name:'Selecciona un informe de cliente en Inicio';
  }
  async function run(fn){if(busy)return;busy=true;try{await fn();}catch(e){status.textContent=e.message;}finally{busy=false;}}
  host.querySelector('form').onsubmit=event=>{event.preventDefault();const input=event.currentTarget.elements.client;run(async()=>{const client=await PCIClientPortfolio.create(input.value);selected=await PCIClientPortfolio.choose(client.id);input.value='';await refresh();announce();});};
  host.querySelector('[data-refresh-clients]').onclick=()=>run(refresh);
  host.querySelector('[data-restore-client]').onclick=()=>run(async()=>{const client=[...state.clients].filter(c=>c.deletedAt).sort((a,b)=>b.deletedAt.localeCompare(a.deletedAt))[0];if(client){await PCIClientPortfolio.restore(client.id);await refresh();announce();status.textContent='Cliente recuperado con el mismo número de informe.';}});
  addEventListener('focus',()=>run(refresh));
  addEventListener('hashchange',()=>{if(!location.hash||location.hash==='#inicio')run(refresh);});
  addEventListener('message',event=>{if(event.origin===location.origin&&event.data?.type==='integral:portfolio-updated')run(refresh);});
  await refresh();
})().catch(e=>{document.querySelector('#client-portfolio [role=status]').textContent=e.message;});
