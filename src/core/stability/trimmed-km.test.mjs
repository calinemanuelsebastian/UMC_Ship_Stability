import {test,after} from 'node:test';import assert from 'node:assert/strict';import{readFile}from'node:fs/promises';import{createServer}from'../../../scripts/test-server.mjs';
const s=await createServer({server:{middlewareMode:true},appType:'custom'});after(()=>s.close());
const {parseTrimmedTable,interpolateTrimmedKm}=await s.ssrLoadModule('/src/core/trim/trimmed-table.ts');
const {computeConstantLcb}=await s.ssrLoadModule('/src/core/stability/constant-lcb.ts');const {assessIntact}=await s.ssrLoadModule('/src/core/stability/intact-assessment.ts');const {mountShipBundle}=await s.ssrLoadModule('/src/app/ship-package.ts');
const root='validation-references/reviewed-apples-vessel/';const d=JSON.parse(await readFile(root+'trimmed-table.json','utf8'));
test('all 720 KM source knots are preserved',()=>{parseTrimmedTable(d);for(const t of d.tables)for(const r of t.rows)assert.equal(interpolateTrimmedKm(d,r.displacementTonnes,t.trimMetres),r.kmTransverse);});
test('KM interpolation does not bridge missing data or extrapolate',()=>{
 const x=structuredClone(d);const row=x.tables[0].rows[0];delete x.tables[1].rows[0].kmTransverse;
 assert.equal(interpolateTrimmedKm(x,row.displacementTonnes,-2),row.kmTransverse);
 delete x.tables[0].rows[0].kmTransverse;assert.equal(interpolateTrimmedKm(x,row.displacementTonnes,-2),undefined);
 assert.equal(interpolateTrimmedKm(d,1,0),undefined);assert.equal(interpolateTrimmedKm(d,13000,.7),undefined);
 x.tables[0].rows[1].kmTransverse=NaN;assert.throws(()=>parseTrimmedTable(x));
});
test('manual example GM matches printed precision and FSM is subtracted once',async()=>{
 const manifest=JSON.parse(await readFile(root+'manifest.json','utf8')),files={};for(const r of manifest.resources)if(r.path)files[r.path]={encoding:'utf8',data:await readFile(root+r.path,'utf8')};const ship=mountShipBundle({manifest,files});
 try{const c={displacementTonnes:13201.307,waterDensity:1.025,vcg:4.647,lcg:58.731,tcg:.004,freeSurfaceMomentTransverse:0};const a=await computeConstantLcb(ship,c,{initialTrimMetres:-.774});
 assert.equal(a.gmAtTrim.correctedGm.toFixed(3),'3.005');assert.equal(a.gmAtTrim.kmTransverse.toFixed(3),'7.652');
 const b=await computeConstantLcb(ship,{...c,vcg:4.62,freeSurfaceMomentTransverse:(4.647-4.62)*c.displacementTonnes},{initialTrimMetres:-.774});assert.ok(Math.abs(a.gmAtTrim.correctedGm-b.gmAtTrim.correctedGm)<1e-12);
 assert.equal(assessIntact(a).find(r=>r.id==='gm').status,'Meets numerical minimum');
 assert.equal(assessIntact({...a,gmAtTrim:{...a.gmAtTrim,correctedGm:.1}}).find(r=>r.id==='gm').status,'Below numerical minimum');
 }finally{ship.release();}
});
