import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createServer} from '../../../scripts/test-server.mjs';
const server=await createServer({server:{middlewareMode:true},appType:'custom'});
const originalFetch=globalThis.fetch;
after(async()=>{globalThis.fetch=originalFetch;await server.close();});
const {findHeelEquilibria:solve}=await server.ssrLoadModule('/src/core/stability/heel-equilibrium.ts');
const {heeledBox}=await server.ssrLoadModule('/src/visualization/ship-scene-data.ts');
const points=values=>values.map(([heelDeg,gzCorrected])=>({heelDeg,gzCorrected,kn:0,gz:gzCorrected}));
test('classifies stable and unstable crossings without selecting capsizing root',()=>{
 const r=solve(points([[-10,-1],[0,0],[10,1],[20,-1]]));
 assert.equal(r.equilibrium.heelDeg,0);assert.equal(r.roots[1].stability,'unstable');
});
test('signed interpolated equilibrium and ambiguity',()=>{
 assert.equal(solve(points([[-10,-2],[0,-1],[10,1]])).equilibrium.heelDeg,5);
 assert.equal(solve(points([[-10,-1],[0,1],[10,2]])).equilibrium.heelDeg,-5);
 assert.equal(solve(points([[-20,-1],[-10,1],[0,0],[10,-1],[20,1]])).equilibrium,undefined);
});
test('neutral, boundary and absent roots are not reported as stable',()=>{
 for(const p of [[[-1,0],[0,0],[1,0]],[[-1,0],[0,1],[1,2]],[[-1,1],[0,2],[1,3]],[[-1,1],[0,0],[1,1]]]) assert.equal(solve(points(p)).equilibrium,undefined);
 assert.throws(()=>solve(points([[0,0],[0,1],[1,2]])));
});
test('heeled box conserves volume and places both intersections on horizontal water',()=>{
 const hull={length:100,beam:20,depth:8};
 for(const angle of [-90,-30,-5,0,5,30,90])for(const draft of [1,3,5]){
 const r=heeledBox(hull,draft,angle);assert.ok(Math.abs(r.area-20*draft)<1e-8);
 for(const [y,z] of r.ends)assert.ok(Math.abs(y*Math.cos(r.angle)-z*Math.sin(r.angle)+r.heave)<1e-8);
 }
});
test('training hull: signed transverse offsets yield opposite stable angles; FSM increases heel',async()=>{
 const {computeStabilityCurves}=await server.ssrLoadModule('/src/core/stability/compute-stability-curves.ts');
 const base='public/built-in-ship-models/training-pontoon-100x20';
 const manifest=JSON.parse(await readFile(`${base}/manifest.json`,'utf8'));
 const csv=await readFile(`${base}/stability/cross-curves.csv`,'utf8');globalThis.fetch=async()=>new Response(csv);
 const condition={...manifest.defaultCondition,draft:undefined,displacementTonnes:6150,tcg:0.2};
 const run=async(c)=>solve((await computeStabilityCurves({manifest,baseUrl:'/fixture/'},c)).points).equilibrium.heelDeg;
 const starboard=await run(condition),port=await run({...condition,tcg:-0.2}),wet=await run({...condition,freeSurfaceMomentTransverse:6150});
 assert.ok(starboard>0 && starboard<2);assert.ok(Math.abs(starboard+port)<1e-9);assert.ok(wet>starboard);
 assert.equal(await run({...condition,tcg:0}),0);
});
test('large-angle longitudinal teaching sections conserve volume and intersect the sea plane',()=>{
 const section={length:20,beam:100,depth:8};
 for(const degrees of [-45,-30,0,30,45])for(const draft of [1,3,5]){
  const r=heeledBox(section,draft,degrees);
  assert.ok(Math.abs(r.area*20-100*20*draft)<1e-7);
  for(const [y,x] of r.ends)assert.ok(Math.abs(-x*Math.sin(r.angle)+y*Math.cos(r.angle)+r.heave)<1e-8);
 }
});
test('tangent sampled zero is indeterminate, not neutral',()=>{
 const result=solve(points([[-1,1],[0,0],[1,1]]));
 assert.equal(result.roots[0].stability,'one-sided / indeterminate');
 assert.deepEqual(result.neutralIntervals,[]);
});
test('flat intervals are merged and prevent selecting a unique attitude',()=>{
 const result=solve(points([[-3,-1],[-2,1],[-1,0],[0,0],[1,0],[2,1]]));
 assert.deepEqual(result.neutralIntervals,[{fromDeg:-1,toDeg:1}]);
 assert.equal(result.equilibrium,undefined);
 assert.equal(result.roots.length,1);
});
