import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createServer } from '../../../scripts/test-server.mjs';
const root = fileURLToPath(new URL('../../../', import.meta.url));
const server = await createServer({ root, server: { middlewareMode: true }, appType: 'custom' });
const originalFetch = globalThis.fetch;
after(async () => { globalThis.fetch = originalFetch; await server.close(); });
const { computeFreeRoll: free, computeRollSimulation: compute } = await server.ssrLoadModule('/src/core/roll/compute-roll-simulation.ts');
const input = { effectiveRadiusOfGyration: Math.sqrt(9.80665), dampingRatio: 0, initialHeelDeg: 3, durationSeconds: 2 * Math.PI };
const close = (a,b,tolerance=1e-9) => assert.ok(Math.abs(a-b)<tolerance, `${a} != ${b}`);
test('undamped exact cosine response, period and initial velocity', () => {
 const result=free(1,input);close(result.naturalPeriodSeconds,2*Math.PI);
 close(result.points[0].heelDeg,3);close(result.points[0].angularVelocityDegPerSecond,0);
 close(result.points[150].heelDeg,0);close(result.points[150].angularVelocityDegPerSecond,-3);
 close(result.points[300].heelDeg,-3);close(result.points.at(-1).heelDeg,3);
});
test('damped period and peak decay match independent analytical values', () => {
 const ratio=.2, period=2*Math.PI/Math.sqrt(1-ratio**2);
 const result=free(1,{...input,dampingRatio:ratio,durationSeconds:period});
 close(result.dampedPeriodSeconds,period);close(result.points.at(-1).heelDeg,3*Math.exp(-ratio*period));
 close(result.points.at(-1).angularVelocityDegPerSecond,0);
});
test('energy is conserved without damping and decreases with damping', () => {
 for(const dampingRatio of [0,.05,.9,.999999]) {
  const points=free(1,{...input,dampingRatio}).points;
  let previous=Infinity;
  for(const point of points) {
   const energy=(point.heelDeg**2+point.angularVelocityDegPerSecond**2)/2;
   if(dampingRatio===0)close(energy,4.5); else assert.ok(energy<=previous+1e-10);
   previous=energy;
  }
 }
});
test('negative initial heel mirrors response; zero stays at rest', () => {
 const positive=free(1,input),negative=free(1,{...input,initialHeelDeg:-3}),zero=free(1,{...input,initialHeelDeg:0});
 positive.points.forEach((point,index)=>close(point.heelDeg,-negative.points[index].heelDeg));
 assert.ok(zero.points.every(point=>point.heelDeg===0 && point.angularVelocityDegPerSecond===0));
});
test('period scales with inertia and inverse square root of GM', () => {
 const period=free(1,input).naturalPeriodSeconds;
 close(free(4,input).naturalPeriodSeconds,period/2);
 close(free(1,{...input,effectiveRadiusOfGyration:input.effectiveRadiusOfGyration*2}).naturalPeriodSeconds,period*2);
});
test('invalid GM, parameters and excessive sampling rejected', () => {
 for(const gm of [0,-1,NaN,Infinity]) assert.throws(()=>free(gm,input));
 for(const [key, values] of Object.entries({ effectiveRadiusOfGyration:[0,-1,Infinity,1e-12], dampingRatio:[-1,1,2,NaN],initialHeelDeg:[5.01,-5.01,Infinity],durationSeconds:[0,-1,601,NaN] })) for(const value of values)assert.throws(()=>free(1,{...input,[key]:value}));
});
const basePath=`${root}/public/built-in-ship-models/training-pontoon-100x20`;
const manifest=JSON.parse(await readFile(`${basePath}/manifest.json`,'utf8'));
const csv=await readFile(`${basePath}/hydrostatics/upright-hydrostatics.csv`,'utf8');
const ship={manifest,baseUrl:'/fixture/'};
const condition={...manifest.defaultCondition,draft:undefined,displacementTonnes:6150,freeSurfaceMomentTransverse:615};
test('loading mass and FSM produce corrected GM once and change roll period',async()=>{
 globalThis.fetch=async()=>new Response(csv);
 const result=await compute(ship,condition,input);
 close(result.gmTransverseCorrected,1.5+400/36-5-.1);
 close(result.naturalPeriodSeconds,2*Math.PI*input.effectiveRadiusOfGyration/Math.sqrt(9.80665*result.gmTransverseCorrected));
 close(result.hydrostatics.condition.vcg,5);
 const raw=await compute(ship,{...condition,freeSurfaceMomentTransverse:0},input);
 assert.ok(result.naturalPeriodSeconds>raw.naturalPeriodSeconds);
});
test('listed, trimmed, unstable and unsupported conditions fail',async()=>{
 globalThis.fetch=async()=>new Response(csv);
 for(const change of [{tcg:.1},{trimDeg:1},{heelDeg:1},{vcg:30}]) await assert.rejects(compute(ship,{...condition,...change},input));
 await assert.rejects(compute({...ship,manifest:{...manifest,resources:[]}},condition,input));
});
