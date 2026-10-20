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
