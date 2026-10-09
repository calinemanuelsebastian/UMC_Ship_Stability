import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createServer} from '../../scripts/test-server.mjs';
const server=await createServer({server:{middlewareMode:true},appType:'custom'});after(()=>server.close());
const {parseHydrostaticTableCsv}=await server.ssrLoadModule('/src/core/hydrostatics/solvers/table/hydrostatic-table-parser.ts');
const base='validation-references/reviewed-apples-vessel/';
const csv=await readFile(base+'upright.csv','utf8'),upright=parseHydrostaticTableCsv(csv).rows,trim=JSON.parse(await readFile(base+'trimmed-table.json','utf8'));
const {cargoWeightGroups}=await server.ssrLoadModule('/src/app/cargo-weight-groups.ts');
test('complete manual tables include light condition and exact summer draft',()=>{
 assert.equal(upright.length,120);assert.equal(trim.tables.length,6);assert.ok(trim.tables.every(t=>t.rows.length===120));
 assert.equal(upright[0].draft,2.5);assert.equal(upright.at(-1).draft,8.4);assert.ok(upright[0].displacementTonnes<3929.6);
 const summer=upright.find(r=>r.draft===8.011);assert.equal(summer.displacementTonnes,13976.39);assert.equal(summer.kmTransverse,7.674);
});
test('corrected LCB and LCF retain original numbers and review log in the same CSV',()=>{
 assert.equal(upright.find(r=>r.draft===5.8).lcb,61.089);assert.equal(upright.find(r=>r.draft===5.85).lcf,57.59);
 assert.match(csv,/previousLcb,previousLcf,correctionLog/);assert.match(csv,/61.122 -> 61.089/);assert.match(csv,/57.667 -> 57.59/);assert.equal(trim.audit.reviewRequired,true);
});
test('upper and lower cargo share a hold group without losing individual masses',()=>{
 const groups=cargoWeightGroups([{id:'a',hold:'Hold 1 Lower',massTonnes:'2'},{id:'b',hold:'Hold 1 Upper',massTonnes:'3'},{id:'c',hold:'Hold 2',massTonnes:'4'}]);
 assert.deepEqual(groups.map(g=>[g.name,g.items.length,g.mass]),[['Cargo hold 1',2,5],['Cargo hold 2',1,4]]);
});
