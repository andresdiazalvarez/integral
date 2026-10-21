const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const PCI=require('../informes/core.js'),jspdf=require('../informes/vendor/jspdf.umd.min.js'),PDFLib=require('../informes/vendor/pdf-lib.min.js');
require('../informes/vendor/jspdf.plugin.autotable.min.js').applyPlugin(jspdf.jsPDF);
test('el acta usa las cuatro páginas del modelo sin necesitar datos administrativos',async()=>{
  const context=vm.createContext({window:{},pdfjsLib:{GlobalWorkerOptions:{}},jspdf,PDFLib,PCI,Blob,Uint8Array,ArrayBuffer});
  for(const file of ['acta-brand.js','pdf-service.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../informes',file),'utf8'),context);
  const result=await context.window.PCIPdf.generate({draft:PCI.forExport({modules:{},checks:{},installations:[]},true),records:[],systems:[],files:[],issues:[],signatures:{}},()=>{});
  assert.equal(result.manifest[0].start,1);assert.equal(result.manifest[0].end,4);
  const pdf=await PDFLib.PDFDocument.load(new Uint8Array(await result.blob.arrayBuffer()));
  assert.equal(pdf.getPageCount(),5);
});
test('el acta anterior actualizada se coloca antes de los informes',async()=>{
  const context=vm.createContext({window:{PCIPreviousActa:{update:async(blob,d)=>{assert.equal(d.revision,'3 RT');return blob;}}},pdfjsLib:{GlobalWorkerOptions:{}},jspdf,PDFLib,PCI,Blob,Uint8Array,ArrayBuffer});
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../informes/pdf-service.js'),'utf8'),context);
  const input=await PDFLib.PDFDocument.create();input.addPage();input.addPage();const previousActa=new Blob([await input.save()],{type:'application/pdf'});
  const result=await context.window.PCIPdf.generate({draft:PCI.forExport({mode:'previous',revision:'3 RT',start:'2026-10-21',end:'2026-10-23',modules:{},checks:{},installations:[]},true),previousActa,records:[],systems:[],files:[],issues:[],signatures:{}},()=>{});
  assert.equal(result.manifest[0].label,'Acta actualizada · 3 RT');assert.equal(result.manifest[0].end,2);
  assert.equal(result.manifest[1].label,'Relación final de correctivos');assert.equal(result.manifest[1].start,3);
});
