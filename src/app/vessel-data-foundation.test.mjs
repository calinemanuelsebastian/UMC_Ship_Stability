import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createServer} from '../../scripts/test-server.mjs';
const server=await createServer({server:{middlewareMode:true},appType:'custom'});after(()=>server.close());
const {parseShipBundle,mountShipBundle}=await server.ssrLoadModule('/src/app/ship-package.ts');
const {inspectShipPackage}=await server.ssrLoadModule('/src/app/inspect-ship-package.ts');
const {buildEditorPackage}=await server.ssrLoadModule('/src/app/ship-editor.ts');
const {computeUprightHydrostatics}=await server.ssrLoadModule('/src/core/hydrostatics/compute-upright-hydrostatics.ts');
const {sharedResults}=await server.ssrLoadModule('/src/core/calculations/shared-results.ts');
const {parseHydrostaticTableCsv}=await server.ssrLoadModule('/src/core/hydrostatics/solvers/table/hydrostatic-table-parser.ts');
const {parseCrossCurvesCsv}=await server.ssrLoadModule('/src/core/stability/solvers/cross-curves/cross-curves-parser.ts');
async function fixture(root){const manifest=JSON.parse(await readFile(root+'/manifest.json','utf8')),files={};for(const r of manifest.resources)if(r.path)files[r.path]={encoding:'utf8',data:await readFile(root+'/'+r.path,'utf8')};return {format:'umc-ship-package',version:1,manifest,files};}
const vectis=await fixture('validation-references/reviewed-apples-vessel');
const csv='draft,volume,kmTransverse,lcb\n1,720,12.5,30\n2,1440,7,30\n3,2160,5.5,30';
const independent=()=>buildEditorPackage({name:'Independent 60 × 12 barge',id:'independent-60x12',lbp:'60',beam:'12',depth:'5',draft:'2',density:'1.025',mass:'1000',lcg:'30',vcg:'2',tcg:'0'},[],[{kind:'hydrostatics.upright-table',path:'upright.csv',file:{encoding:'utf8',data:csv}}]);
test('unrelated synthetic vessel has data-derived capabilities and independent analytic hydrostatics',async()=>{
 const b=independent(),r=await inspectShipPackage(b);
 assert.equal(r.foundation.capabilities.uprightDisplacement,true);assert.equal(r.foundation.capabilities.transverseGM,true);
 for(const k of ['longitudinalTrim','gzCurves','tankFilling','windProfiles','coupledHeeledDrafts'])assert.equal(r.foundation.capabilities[k],false,k);
 const s=mountShipBundle(b);try{for(const waterDensity of [1,1.025])for(const draft of [1,1.5,2,3]){
  const c={...s.manifest.defaultCondition,waterDensity,draft};const h=await computeUprightHydrostatics(s,c);
  assert.ok(Math.abs(h.displacementTonnes-60*12*draft*waterDensity)<1e-9);
  const inverse=await computeUprightHydrostatics(s,{...c,draft:undefined,displacementTonnes:h.displacementTonnes});assert.ok(Math.abs(inverse.draft-draft)<1e-12);
 }await assert.rejects(computeUprightHydrostatics(s,{...s.manifest.defaultCondition,draft:3.001}),/outside/);
 }finally{s.release();}
});
test('all Vectis resources expose ranges without promoting the visual hull into hydrostatics',async()=>{
 const r=await inspectShipPackage(vectis),f=r.foundation;
 assert.equal(f.tanks.length,68);assert.equal(f.trimmed.slices.length,6);assert.equal(f.crossCurves.kind,'constant-lcb');assert.equal(f.capabilities.coupledHeeledDrafts,false);
 assert.equal(f.capabilities.kgLimitComparison,true);assert.ok(f.flooding.unknownSamples>0);
 assert.equal(f.upright.screening.findings.length,0);
 assert.ok(f.upright.missingFields.includes('kmLongitudinal'));
});
test('invalid source declarations are rejected before a package can be saved',()=>{
 const bad=structuredClone(vectis);bad.manifest.resources.find(r=>r.kind==='stability.constant-lcb-cross-curves').config.referenceWaterDensity=0;
 assert.throws(()=>parseShipBundle(bad),/density/);
});
test('CSV shape, duplicate knots, invalid numerics and impossible signs fail; missing optional data remains unknown',()=>{
 for(const text of ['draft,draft\n1,2','draft,volume\n1,2,3','draft,volume\n1','draft,volume\n1,Infinity','draft,volume\n1,-2','draft,volume\n1,2\n1,3','draft,volume\n,2'])assert.throws(()=>parseHydrostaticTableCsv(text),text);
 assert.equal(parseHydrostaticTableCsv('draft,volume,kb\n1,720,').rows[0].kb,undefined);
 const cc='volume,heelDeg,kn\n100,0,0\n100,10,1\n200,0,0\n200,10,2';
 assert.equal(parseCrossCurvesCsv(cc).rows.length,4);
 for(const text of [cc+'\n200,10,2',cc.replace('200,10,2','200,10,NaN'),cc.replace('\n200,10,2','')])assert.throws(()=>parseCrossCurvesCsv(text));
});
test('resource replacement and explicit refresh invalidate production numerical results',async()=>{
 const b=independent(),s=mountShipBundle(b),p='upright.csv';let replacement;
 try{
  const first=await computeUprightHydrostatics(s,s.manifest.defaultCondition);assert.equal(first.volume,1440);
  replacement=URL.createObjectURL(new Blob([csv.replace('2,1440','2,1500')]));
  s.resourceUrls[p]=replacement;
  const changed=await computeUprightHydrostatics(s,s.manifest.defaultCondition);assert.equal(changed.volume,1500);assert.notEqual(changed,first);
  sharedResults.invalidate(s);assert.notEqual(await computeUprightHydrostatics(s,s.manifest.defaultCondition),changed);
 }finally{s.release();if(replacement)URL.revokeObjectURL(replacement);}
});
