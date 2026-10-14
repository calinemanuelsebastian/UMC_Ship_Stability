import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from '../../scripts/test-server.mjs';
const server=await createServer({server:{middlewareMode:true},appType:'custom'});after(()=>server.close());
const {autoDunnageBatch}=await server.ssrLoadModule('/src/app/auto-dunnage.ts');
const {markingLines}=await server.ssrLoadModule('/src/app/cargo-identification.ts');
const {parseFootprint}=await server.ssrLoadModule('/src/app/cargo-layout.ts');
const {removeDunnage}=await server.ssrLoadModule('/src/app/remove-dunnage.ts');
const {LayoutHistory}=await server.ssrLoadModule('/src/app/layout-history.ts');
const area={id:'h',name:'Hold',xMin:0,xMax:100,yMin:0,yMax:40,deckZ:0,clearHeight:10};
const s={length:1,width:1,thickness:.05,mass:1,material:'Timber',densityKgM3:470,massMode:'calculated',count:1,gap:0,direction:'x'};
const box=(id,x,y=3,z=0,h=1)=>({id,name:id,category:'cargo',quantity:'1',massTonnes:'1',lcg:String(x),tcg:String(y),vcg:String(z+h/2),freeSurfaceMomentTransverse:'0',footprint:{length:1,width:1,height:h,rotation:0,deckZ:0,bottomZ:z,areaId:'h',dunnageProfile:'boxed',stackability:'stackable'}});
let id=0;const run=(cargo,extra={})=>autoDunnageBatch({cargo,selection:[],areas:[area],settings:s,maxGap:.5,walls:false,id:()=>`support-${++id}`,...extra});
test('boundary contact requires explicit evidence, and traceability survives in generated members',()=>{
 const cargo=[box('edge',.6)];const blocked=run(cargo,{walls:true});assert.equal(blocked.parts.length,0);assert.ok(blocked.diagnostics.some(d=>d.ids[0]==='edge'&&d.reason.includes('unverified')));
 const allowed=run(cargo,{walls:true,settings:{...s,boundarySource:'Declared bearing wall, floor level'}});assert.equal(allowed.parts.length,1);assert.equal(allowed.parts[0].footprint.dunnage.properties.source,'Declared bearing wall, floor level');
});
test('protected channels and ventilated neighbours are preserved, including junctions',()=>{
 const cargo=[box('a',2),{...box('b',3.4),footprint:{...box('b',3.4).footprint,keepGapsClear:true}},box('c',2,4.4),box('d',3.4,4.4)];
 const result=run(cargo);assert.ok(result.diagnostics.some(d=>d.ids.includes('b')&&d.reason.includes('Protected')));assert.equal(result.parts.length,2);
 assert.ok(!result.parts.some(w=>Math.abs(+w.lcg-2.7)<1e-8&&Math.abs(+w.tcg-3.7)<1e-8));
 assert.equal(parseFootprint(JSON.parse(JSON.stringify(cargo[1].footprint))).keepGapsClear,true);
});
test('unequal heights require actual vertical contact and elevated gap support',()=>{
 const a=box('tall',2,3,0,2),b=box('raised',3.2,3,1,1);
 const unsupported=run([a,b]);assert.equal(unsupported.parts.length,0);assert.ok(unsupported.diagnostics.some(d=>d.ids.includes('raised')&&d.position?.z===1));
 const post={...box('post',2.6,3,0,1),footprint:{...box('post',2.6,3,0,1).footprint,length:.2,kind:'dunnage'}};
 const supported=run([a,b,post]);assert.equal(supported.parts.length,1);assert.equal(supported.parts[0].footprint.bottomZ,1);assert.ok(Math.abs(+supported.parts[0].vcg-1.025)<1e-8);
 const short=run([box('short',2,3,0,.02),box('other',3.2)]);assert.equal(short.parts.length,0);assert.ok(short.diagnostics.some(d=>d.reason.includes('contact height')));
});
test('two-tier stacks get distinct proposals only where each layer has a platform',()=>{
 const units=[box('a',2),box('b',3.2),box('c',2,3,1),box('d',3.2,3,1)];
 const result=run(units);assert.equal(result.parts.length,1);assert.equal(result.parts[0].footprint.bottomZ,0);assert.ok(result.diagnostics.some(d=>d.position?.z===1));
});
test('deck gaps are excluded at floor level; real elevated support can bridge them',()=>{
 const seam={...area,supportRegions:[{xMin:0,xMax:2.5,yMin:0,yMax:40},{xMin:2.7,xMax:100,yMin:0,yMax:40}]};
 assert.equal(run([box('a',2),box('b',3.2)],{areas:[seam]}).parts.length,0);
 const platform={...box('platform',2.6,3,0,1),footprint:{...box('platform',2.6,3,0,1).footprint,length:2.2,kind:'dunnage'}};
 const result=run([box('a',2,3,1),box('b',3.2,3,1),platform],{areas:[seam]});assert.equal(result.parts.length,1);assert.equal(result.parts[0].footprint.bottomZ,1);
});
test('partial open frames repair missing members without filling openings or duplicating mixed materials',()=>{
 const units=[{...box('a',2),footprint:{...box('a',2).footprint,width:4}},{...box('b',4),footprint:{...box('b',4).footprint,width:4}}];
 const settings={...s,arrangement:'frame',solidLimit:.2,memberWidth:.1,bearerSpacing:1};const first=run(units,{settings,maxGap:2});assert.ok(first.parts.length>2);
 const existing={...first.parts[0],footprint:{...first.parts[0].footprint,dunnage:{material:'Other material',densityKgM3:700,massMode:'manual'}}};
 const repair=run([...units,existing],{settings,maxGap:2});assert.equal(repair.parts.length,first.parts.length-1);
 const repeat=run([...units,existing,...repair.parts],{settings,maxGap:2});assert.equal(repeat.parts.length,0);assert.ok(repeat.diagnostics.some(d=>d.reason.includes('Already arranged')));
});
test('member mass and all CG components reconcile, and scope removal/undo is atomic',()=>{
 const units=[box('a',2),box('b',3.2),box('c',7),box('d',8.2)];const result=run(units);const mass=result.parts.reduce((v,w)=>v+ +w.massTonnes,0);assert.equal(result.massTonnes,mass);
 for(const k of ['lcg','tcg','vcg'])assert.ok(Math.abs(result.cg[k]-result.parts.reduce((v,w)=>v+ +w.massTonnes* +w[k],0)/mass)<1e-10);
 const before=[...units,...result.parts],next=removeDunnage(before,['a'],before.map(w=>w.id));assert.equal(next.length,before.length-1);const history=new LayoutHistory();history.record(before,next,'h');assert.deepEqual(history.step(next,'h'),before);
 const support=result.parts[0],load={...box('load',+support.lcg,+support.tcg,.05),footprint:{...support.footprint,kind:undefined,bottomZ:.05,height:1}};assert.throws(()=>removeDunnage([...before,load],[],[...before,load].map(w=>w.id)),/supported/);
});
test('staggered 1,024-unit plan completes, reports actual mass and repeats without duplicates',()=>{
 const units=Array.from({length:1024},(_,i)=>box(String(i),1+(i%32)*1.2+(Math.floor(i/32)%2)*.3,1+Math.floor(i/32)*1.2));const start=performance.now();const first=run(units);assert.ok(first.parts.length>1000);assert.ok(Number.isFinite(first.cg.vcg));const repeat=run([...units,...first.parts]);assert.equal(repeat.parts.length,0);console.log('P08 1024-unit generation and repeat ms:',(performance.now()-start).toFixed(1),'members:',first.parts.length);
});

test('protected clearance is serialized and labelled without changing cargo mass or CG',()=>{
 const original=box('protected',2);const protectedCargo={...original,footprint:parseFootprint({...original.footprint,keepGapsClear:true})};assert.ok(markingLines(protectedCargo).includes('KEEP GAPS CLEAR'));assert.equal(protectedCargo.massTonnes,original.massTonnes);assert.equal(protectedCargo.vcg,original.vcg);assert.throws(()=>parseFootprint({...original.footprint,keepGapsClear:'yes'}));
});
