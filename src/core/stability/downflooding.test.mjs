import {test,after} from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {createServer} from '../../../scripts/test-server.mjs';
const server=await createServer({server:{middlewareMode:true},appType:'custom'});after(()=>server.close());
const {parseFloodData,screenDownflooding}=await server.ssrLoadModule('/src/core/stability/downflooding.ts');
const {heelEquilibrium}=await server.ssrLoadModule('/src/core/stability/heel-equilibrium.ts');
const data=parseFloodData(JSON.parse(await readFile('validation-references/reviewed-apples-vessel/downflooding-samples.json','utf8')));
test('source knots and reached threshold are retained without inventing missing values',()=>{
 const s=screenDownflooding(data,14557.991,-2,1.025);
 assert.equal(s.firstReachedAngle,50);assert.equal(s.samples.find(x=>x.opening.endsWith('SB')&&x.heelDegrees===50).thresholdTonnes,14557.991);
 assert.equal(s.samples.find(x=>x.opening.endsWith('PS')&&x.heelDegrees===60).status,'unknown');
 assert.equal(screenDownflooding(data,3500,0,1.025).firstReachedAngle,undefined);
 assert.match(screenDownflooding(data,3500,0,1.025).message,/unresolved/);
});
test('interpolation does not cross missing cells; exact trim knots do not borrow adjacent missing cells',()=>{
 const s=screenDownflooding(data,13000,-1.75,1.025);
 assert.equal(s.samples.find(x=>x.opening.endsWith('SB')&&x.heelDegrees===50).thresholdTonnes,null);
 assert.equal(s.samples.find(x=>x.opening.endsWith('SB')&&x.heelDegrees===60).thresholdTonnes,(11821.368+12179.644)/2);
 assert.equal(screenDownflooding(data,13739.468,.62,1.025).firstReachedAngle,60);
 for(const [m,t,rho] of [[NaN,0,1.025],[15000,0,1.025],[4000,-2.1,1.025],[4000,0,1]])assert.throws(()=>screenDownflooding(data,m,t,rho));
});
test('malformed or mismatched grids are rejected',()=>{
 for(const mutate of [d=>d.sets[0].openings[0].samples[0].floodingDisplacementTonnes=0,d=>d.sets[1].openings[0].samples.pop(),d=>d.sets[1].openings[0].name='other']){const d=structuredClone(data);mutate(d);assert.throws(()=>parseFloodData(d));}
});
test('a root at or beyond flooding evidence cannot drive the 3D attitude',()=>{
 const points=[0,20,40,60].map(heelDeg=>({heelDeg,gzCorrected:heelDeg-55}));
 assert.equal(heelEquilibrium({points}).equilibrium.heelDeg,55);
 const blocked=heelEquilibrium({points,downflooding:{firstReachedAngle:50}});
 assert.equal(blocked.equilibrium,undefined);assert.match(blocked.message,/threshold/);
});
test('annotated KG dataset preserves special draught knots and source precision',async()=>{
 const kg=JSON.parse(await readFile('validation-references/reviewed-apples-vessel/annotated-kg-limits.json','utf8'));
 assert.equal(kg.rows.length,71);assert.equal(kg.rows.find(r=>r.draftMouldedMetres===6.560).minimumGmMetres,.340);
 assert.equal(kg.rows.find(r=>r.draftMouldedMetres===8).maximumVcgMetres,7.392);
 assert.ok(kg.rows.every(r=>r.criterion==='DAM-GM'&&r.sourceTokens.length===6));
 assert.deepEqual(kg.corrections,[]);
});
