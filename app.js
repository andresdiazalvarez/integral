const modules = {correctivos:'Correctivos',bie:'BIE',hidrantes:'Hidrantes',sistemas:'Sistemas',informes:'Generar informe PCI'};
function navigate(){
  const key=location.hash.slice(1); const active=Object.hasOwn(modules,key);
  document.getElementById('home').hidden=active;
  document.getElementById('workspace').hidden=!active;
  document.querySelectorAll('nav a').forEach(a=>{if(a.hash==='#'+(active?key:'inicio'))a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
  document.querySelectorAll('iframe').forEach(frame=>frame.hidden=frame.dataset.module!==key);
  document.title=active?modules[key]+' · INTEGRAL':'INTEGRAL · Mantenimiento PCI';
  if(!active)return;
  document.getElementById('module-title').textContent=modules[key];
  document.getElementById('module-note').hidden=true;
  if(!document.querySelector('iframe[data-module="'+key+'"]')){
    const frame=document.createElement('iframe');frame.dataset.module=key;frame.title=modules[key];frame.src=key==='informes'?'./informes/index.html?v=15':'./modulos/'+key+'/index.html?v=12';frame.allow='camera; microphone; fullscreen';document.getElementById('frames').append(frame);
  }else if(key==='informes'){document.querySelector('iframe[data-module="informes"]').contentWindow.postMessage({type:'integral:refresh-sources'},location.origin);}
}
function connection(){document.getElementById('connection').textContent=navigator.onLine?'Con conexión':'Sin conexión';}
addEventListener('hashchange',navigate);addEventListener('online',connection);addEventListener('offline',connection);
document.getElementById('fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.getElementById('workspace').requestFullscreen();}catch{document.getElementById('fullscreen').textContent='No disponible';}});
navigate();connection();
if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(console.error);
