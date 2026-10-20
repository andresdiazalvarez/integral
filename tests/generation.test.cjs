const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const source=fs.readFileSync(require('node:path').join(__dirname,'../informes/ui.js'),'utf8');
const build=source.slice(source.indexOf('async function build('),source.indexOf('function fileName('));
const warnings=source.slice(source.indexOf('function warnings('),source.indexOf('function renderSummary('));
test('el borrador advierte sobre registros ausentes, pero bloquea registros modificados',()=>{
  const context=vm.createContext({draft:{pdfs:[],excludedIssues:[]},bindings:{'hidrantes:antiguo':{centerId:'c',revisionId:'r',signature:'a'}},catalog:[],
    centerId:()=> 'c',revisionId:()=> 'r',selectedRecords:()=>[],selectedSystems:()=>[],entries:()=>[],finalIssues:()=>[],plannedPhotos:()=>[],systemLocalOnly:false,
    PCI:{validate:()=>({errors:[],warnings:[]})},
  });
  vm.runInContext(warnings,context);
  assert.equal(context.warnings(true).errors.length,0);
  assert.ok(context.warnings(true).warnings.some(x=>x.includes('no se incorporan')));
  assert.equal(context.warnings(false).errors.length,1);
  context.catalog=[{key:'hidrantes:antiguo',signature:'modificado'}];
  assert.equal(context.warnings(true).errors.length,1);
});
for(const mode of ['pending','failed'])test(`el PDF se puede descargar aunque las miniaturas estén ${mode}`,async()=>{
  const nodes=new Map();const node=id=>{if(!nodes.has(id))nodes.set(id,{disabled:true,replaceChildren(){}});return nodes.get(id);};
  const draft={pdfs:[]};const messages=[];
  const context=vm.createContext({busy:false,saveTimer:null,draft,result:null,resultUrl:'',
    warnings:()=>({errors:[]}),renderSummary(){},clearTimeout,structuredClone,
    $:node,saveDraft:async()=>{},selectedRecords:()=>[],selectedSystems:()=>[],verifySources:async()=>{},finalIssues:()=>[],
    exportSystem(){},PCI:{forExport:x=>x},PCIPdf:{generate:async()=>({blob:{},count:4}),thumbnails:()=>mode==='pending'?new Promise(()=>{}):Promise.reject(Error('Fallo de miniaturas'))},
    document:{createElement:()=>({childNodes:[]})},URL:{createObjectURL:()=> 'blob:test',revokeObjectURL(){}},
    say:message=>messages.push(message),fileName:()=> 'test.pdf',console:{warn(){}},
  });
  vm.runInContext(build,context);await context.build(true);await new Promise(resolve=>setImmediate(resolve));
  assert.equal(node('download').disabled,false);
  assert.equal(node('download').textContent,'Descargar borrador PDF');
  assert.equal(context.result.snapshot,JSON.stringify(draft));
  assert.equal(context.busy,false);
  assert.ok(messages.some(x=>x.includes('PDF listo')));
});
