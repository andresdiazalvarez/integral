const test=require('node:test'),assert=require('node:assert/strict'),Portfolio=require('../informes/client-portfolio.js'),PCI=require('../informes/core.js');
const client={id:'a',number:1,name:'Cliente A'};
function sources(){return {reportLists:{bie:[{id:'report-a',client:'Cliente A'}]},correctivos:[{id:'ext-a',cliente:'Cliente A'},{id:'ext-b',cliente:'Cliente B'}],bie:[{id:'bie-a',_reportId:'report-a',cliente:'Cliente A'},{id:'bie-b',cliente:'Cliente B'}],hidrantes:[{id:'hid-a',cliente:'Cliente A'}],sistemas:{savedReports:[{id:'mixed',header:'Informe con varios clientes',sourceEntries:[{id:'central-a',type:'Detección',meta:{client:'Cliente A'}},{id:'extincion-b',type:'Extinción',meta:{client:'Cliente B'}}]}],current:{header:'Cliente A',entries:[{id:'presion-a',type:'Grupo de presión',meta:{client:'Cliente A'}}]}}};}
test('cada cliente tiene un solo número general aunque exista en varios módulos',()=>{
 let id=0;const state=Portfolio.reconcile(null,Portfolio.discover(sources(),PCI),()=>String(++id));assert.equal(state.clients.length,2);assert.deepEqual(state.clients.map(c=>c.number),[1,2]);
 const next=Portfolio.reconcile(state,['cliente a','Cliente B','Cliente C'],()=>String(++id));assert.equal(next.clients.length,3);assert.equal(next.clients[2].number,3);
});
test('incluye todos los equipos y sistemas del cliente sin incorporar los de otro cliente',()=>{
 const result=Portfolio.scope(sources(),client,PCI);assert.deepEqual(result.records.map(r=>r.id),['ext-a','bie-a','hid-a']);assert.equal(result.systems.length,2);
 assert.deepEqual(result.systems.flatMap(r=>r.clientEntries.map(e=>e.id)),['central-a','presion-a']);assert.deepEqual(result.systems[0].excludedEntryIds,['extincion-b']);assert.equal(result.unassigned.length,0);
 const other=Portfolio.scope(sources(),{id:'b',name:'Cliente B'},PCI);assert.deepEqual(other.records.map(r=>r.id),['ext-b','bie-b']);assert.deepEqual(other.systems[0].clientEntries.map(e=>e.id),['extincion-b']);
});
test('no confunde nombres de clientes parecidos',()=>{assert.equal(Portfolio.same(client,'Cliente A 2'),false);assert.equal(Portfolio.same(client,' CLIENTE  A '),true);});
test('detecta un sistema nuevo para impedir descargar un informe que lo omita',()=>{
 const data=sources(),before=Portfolio.scope(data,client,PCI).fingerprint;data.sistemas.current.entries.push({id:'redes-a',meta:{client:'Cliente A'},type:'Redes'});assert.notEqual(Portfolio.scope(data,client,PCI).fingerprint,before);
});
test('un cliente eliminado no reaparece al descubrir sus registros y no se reutiliza su número',()=>{
 const state={nextNumber:3,clients:[{id:'a',name:'Cliente A',number:1,deletedAt:'2026-11-02'},{id:'b',name:'Cliente B',number:2}]};const updated=Portfolio.reconcile(state,['Cliente A','Cliente C'],()=> 'c');assert.equal(updated.clients.length,3);assert.ok(updated.clients[0].deletedAt);assert.equal(updated.clients[2].number,3);
});
test('señala los datos sin cliente en lugar de omitirlos silenciosamente',()=>{const data=sources();data.sistemas.current.header='';data.sistemas.current.entries.push({id:'desconocido',type:'Detección',meta:{}});assert.ok(Portfolio.scope(data,client,PCI).unassigned.some(r=>r.id==='desconocido'));});
test('el PDF de Sistemas filtra el otro cliente y usa la cabecera y número generales',async()=>{
 const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),source=fs.readFileSync(path.join(__dirname,'../modulos/sistemas/index.html'),'utf8');const start=source.indexOf('window.integralExportReport = async');const end=source.indexOf('\n    };',start)+7;
 const state={current:{header:'Cliente A',entries:[{id:'a',meta:{client:'Cliente A'}},{id:'b',meta:{client:'Cliente B'}}],notes:'Notas compartidas'},savedReports:[]};
 const context=vm.createContext({window:{},loadStateFromDb:async()=>state,appState:state,PCI,cloneData:structuredClone,buildFullHtml:report=>report,downloadPdfFromHtml:async report=>report});vm.runInContext(source.slice(start,end),context);
 const exported=await context.window.integralExportReport('__pci_current__',['a'],'Cliente B',2);assert.equal(exported.header,'Cliente B');assert.equal(exported.number,2);assert.equal(exported.sourceEntries.length,1);assert.equal(exported.sourceEntries[0].id,'b');assert.equal(exported.notes,'');assert.equal(state.current.entries.length,2);assert.equal(state.current.header,'Cliente A');
});
test('las exclusiones antiguas no pueden dejar fuera sistemas del cliente seleccionado',()=>{
 const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),source=fs.readFileSync(path.join(__dirname,'../informes/ui.js'),'utf8');const start=source.indexOf('function selectedRecords()'),end=source.indexOf('function renderModules()',start);const scope=Portfolio.scope(sources(),client,PCI);
 const context=vm.createContext({draft:{clientReportId:'a',modules:{},excludedRecords:scope.systems.map(r=>r.key),excludedSystemEntries:['central-a','presion-a']},clientScope:scope});vm.runInContext(source.slice(start,end),context);
 assert.equal(context.selectedRecords().length,3);assert.equal(context.selectedSystems().length,2);assert.deepEqual(Array.from(context.entries(),r=>r.entry.id),['central-a','presion-a']);
});
test('cambiar el cliente de un informe de módulo invalida la cobertura previa',()=>{
 const data=sources(),before=Portfolio.scope(data,client,PCI).fingerprint;data.reportLists.bie[0].client='Cliente B';const after=Portfolio.scope(data,client,PCI);assert.notEqual(after.fingerprint,before);assert.ok(!after.records.some(r=>r.id==='bie-a'));
});
