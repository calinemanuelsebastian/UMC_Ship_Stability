import {test,after} from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {createServer} from '../../../scripts/test-server.mjs';
const server=await createServer({server:{middlewareMode:true},appType:'custom'});after(()=>server.close());
const {parseConstantLcb,interpolateConstantLcb,computeConstantLcb}=await server.ssrLoadModule('/src/core/stability/constant-lcb.ts');const {mountShipBundle}=await server.ssrLoadModule('/src/app/ship-package.ts');const {heelEquilibrium}=await server.ssrLoadModule('/src/core/stability/heel-equilibrium.ts');
const root='validation-references/reviewed-apples-vessel/',manifest=JSON.parse(await readFile(root+'manifest.json','utf8')),files={};for(const r of manifest.resources)if(r.path)files[r.path]={encoding:'utf8',data:await readFile(root+r.path,'utf8')};const data=parseConstantLcb(JSON.parse(files['cross-curves-constant-lcb.json'].data));
const c={displacementTonnes:13201.307,waterDensity:1.025,vcg:4.647,lcg:58.731,tcg:.004,freeSurfaceMomentTransverse:0};
test('manual pp12–13 KN and GZ example matches within source precision',async()=>{const ship=mountShipBundle({manifest,files});try{const r=await computeConstantLcb(ship,c,{initialTrimMetres:-.774});const kn=[0,.267,.668,1.335,1.603,2.004,2.678,3.359,4.006,4.623,5.229,6.204,6.798],gz=[-.004,.101,.259,.525,.633,.798,1.085,1.392,1.680,1.955,2.239,2.641,2.772];r.points.forEach((p,i)=>{assert.ok(Math.abs(p.kn-kn[i])<.001);assert.ok(Math.abs(p.gzCorrected-gz[i])<.001);});assert.ok(Math.abs(heelEquilibrium(r).equilibrium.heelDeg-.076318054163)<1e-9);assert.ok(!r.points.some(p=>p.heelDeg<0));}finally{ship.release();}});
test('interpolation retains knots and rejects out-of-range data',()=>{interpolateConstantLcb(data,3500,-2).forEach((v,i)=>assert.ok(v===data.sets[0].rows[0].ordinatesMetres[i]));for(const [m,t] of [[3499,0],[14801,0],[4000,-2.1],[4000,.63],[NaN,0]])assert.throws(()=>interpolateConstantLcb(data,m,t));const bad=structuredClone(data);bad.sets[0].rows[0].ordinatesMetres.pop();assert.throws(()=>parseConstantLcb(bad));});
test('shared LCG determines initial trim; density and longitudinal FSM cannot be silently changed',async()=>{const ship=mountShipBundle({manifest,files});try{const a=await computeConstantLcb(ship,c),b=await computeConstantLcb(ship,{...c,lcg:58.8});assert.notEqual(a.warnings[0],b.warnings[0]);await assert.rejects(computeConstantLcb(ship,{...c,waterDensity:1}),/density/);await assert.rejects(computeConstantLcb(ship,c,{longitudinalFsm:10}),/longitudinal/);const port=await computeConstantLcb(ship,{...c,tcg:-.004},{initialTrimMetres:-.774});assert.equal(heelEquilibrium(port).equilibrium,undefined);}finally{ship.release();}});
test('virtual KG correction is applied exactly once',async()=>{const ship=mountShipBundle({manifest,files});try{const physical=await computeConstantLcb(ship,{...c,vcg:4.62,freeSurfaceMomentTransverse:(4.647-4.62)*c.displacementTonnes},{initialTrimMetres:-.774});const corrected=await computeConstantLcb(ship,c,{initialTrimMetres:-.774});physical.points.forEach((p,i)=>assert.ok(Math.abs(p.gzCorrected-corrected.points[i].gzCorrected)<1e-12));}finally{ship.release();}});

test('exact initial-trim knots do not require an unused neighbouring displacement range',()=>{
 const d=parseConstantLcb({format:'vectis-cross-curves-source',version:1,heelDirection:'starboard',heelAnglesDegrees:[0,10,20],sets:[
  {initialTrimMetres:-1,rows:[{displacementTonnes:100,ordinatesMetres:[0,1,2]},{displacementTonnes:200,ordinatesMetres:[0,2,4]}]},
  {initialTrimMetres:0,rows:[{displacementTonnes:300,ordinatesMetres:[0,3,6]},{displacementTonnes:400,ordinatesMetres:[0,4,8]}]},
 ]});
 assert.deepEqual(interpolateConstantLcb(d,350,0),[0,3.5,7]);
 assert.deepEqual(interpolateConstantLcb(d,400,0),[0,4,8]);
 assert.throws(()=>interpolateConstantLcb(d,350,-.001),/outside/);
 for(const mutate of [d=>d.sets[1].initialTrimMetres=-1,d=>d.sets[1].rows[1].displacementTonnes=300,d=>d.sets[1].rows[1].ordinatesMetres[1]=Infinity]){
  const bad=structuredClone(d);mutate(bad);assert.throws(()=>parseConstantLcb(bad));
 }
});
