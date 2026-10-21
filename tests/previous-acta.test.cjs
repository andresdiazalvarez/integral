const test=require('node:test'),assert=require('node:assert/strict'),PCI=require('../informes/core.js'),previous=require('../informes/previous-acta.js');
const item=(str,x,y,width=80)=>({str,width,transform:[9,0,0,9,x,800-y]});
const current={revision:'3 RT',start:'2026-10-21',end:'2026-10-23'};
test('actualiza la revisión y las fechas sin alterar la fecha de la última revisión',()=>{
 const plan=previous.plan([item('Revisión: 2 RT',40,80),item('Fecha última revisión: 02/09/2026',40,110),item('Fecha inicio',40,200),item('Fecha final',180,200),item('Nº operarios',320,200),item('20/07/2026',40,220),item('22/07/2026',180,220)],595,800,current);
 assert.equal(plan.revisions,1);assert.equal(plan.starts,1);assert.equal(plan.ends,1);
 assert.deepEqual(plan.edits.filter(x=>x.text).map(x=>x.text),['3 RT','21/10/2026','23/10/2026']);
});
test('rellena las fechas vacías de la tabla y deja en blanco el bloque de firmas anterior',()=>{
 const plan=previous.plan([item('Fecha inicio',40,200),item('Fecha final',180,200),item('Nº operarios',320,200),item('Firma del técnico cualificado',40,400),item('Firma de la propiedad',320,400),item('La Propiedad y su representante designado',40,480)],595,800,current);
 assert.equal(plan.starts,1);assert.equal(plan.ends,1);assert.ok(plan.edits.some(x=>x.clear&&x.y>400));
});
test('actualizar el acta anterior solo requiere el PDF, la revisión y ambas fechas',()=>{
 const d={mode:'previous',previousFile:'pdf-original',...current,modules:{}};
 assert.deepEqual(PCI.validate(d,[],[],[]).errors,[]);
 assert.ok(PCI.validate({...d,start:''},[],[],[]).errors.some(x=>x.includes('inicio')));
 assert.ok(PCI.validate({...d,end:'2026-10-20'},[],[],[]).errors.some(x=>x.includes('anterior')));
});
