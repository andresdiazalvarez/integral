const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),PCI=require('../informes/core.js');
test('generar incorpora los registros disponibles sin revisión ni diálogo',async()=>{
 const rows=[['a','bie'],['b','bie'],['c','bie'],['d','hidrantes']].map(([key,module])=>({key,module,client:'Cliente',signature:'actual'}));
 const original={b:{draftId:'otro',centerId:'otro',revisionId:'otra',signature:'anterior'}};
 const context=vm.createContext({PCI,catalog:rows,bindings:original,draft:{id:'actual',modules:{bie:true,hidrantes:false},excludedRecords:['c']},centerId:()=> 'centro',revisionId:()=> 'revision',PCIData:{set:async()=>{}},saveDraft:async()=>{},renderSources(){},renderModules(){},renderSystems(){},renderIssues(){},renderInclusionStatus(){}});
 const source=fs.readFileSync(path.join(__dirname,'../informes/inclusion.js'),'utf8');
 vm.runInContext(source.slice(source.indexOf('async function incorporateAvailable'),source.indexOf('async function requestGeneration')),context);
 await context.incorporateAvailable();
 assert.equal(context.bindings.a.signature,'actual');assert.equal(context.bindings.a.draftId,'actual');
 assert.equal(context.bindings.b.centerId,'otro');assert.equal(context.bindings.c,undefined);assert.equal(context.bindings.d,undefined);
});
