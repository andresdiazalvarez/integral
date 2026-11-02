const test=require('node:test'),assert=require('node:assert/strict'),reports=require('../informes/client-reports.js'),PCI=require('../informes/core.js');
test('los datos existentes se agrupan por cliente sin perder equipos ni fotografías',()=>{
 let id=0;const photo='data:image/png;base64,ejemplo';const original=[{id:'1',cliente:'Cliente A',edificio:'Uno',photos:[photo]},{id:'2',cliente:'Cliente A',edificio:'Dos'},{id:'1',cliente:'Cliente B'}];
 const result=reports.migrate(original,[],()=>String(++id));
 assert.equal(result.reports.length,2);assert.equal(result.records.length,3);assert.equal(result.records[0]._reportId,result.records[1]._reportId);assert.notEqual(result.records[0]._reportId,result.records[2]._reportId);assert.deepEqual(result.records[0].photos,[photo]);assert.equal(original[0]._reportId,undefined);
 const again=reports.migrate(result.records,result.reports,()=>{throw Error('No debe duplicar informes');});assert.equal(again.reports.length,2);
});
test('guardar un informe mantiene intactos los equipos de los otros clientes',()=>{
 const all=[{id:'repetido',_reportId:'a',cliente:'A'},{id:'repetido',_reportId:'b',cliente:'B',photos:['foto']}];
 const saved=reports.merge(all,'a',[{id:'nuevo',cliente:'A'}]);assert.deepEqual(saved[0],all[1]);assert.equal(saved[1]._reportId,'a');assert.equal(all.length,2);
 assert.notEqual(PCI.identity('bie',all[0]),PCI.identity('bie',all[1]));
});
test('dos informes del mismo cliente conservan sus identidades al volver a abrir',()=>{
 const list=[{id:'uno',client:'Cliente A'},{id:'dos',client:'Cliente A'}],rows=[{id:'1',cliente:'Cliente A',_reportId:'dos'}];
 const migrated=reports.migrate(rows,list);assert.equal(migrated.reports.length,2);assert.equal(migrated.records[0]._reportId,'dos');
});
