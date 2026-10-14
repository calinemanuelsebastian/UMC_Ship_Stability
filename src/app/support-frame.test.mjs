import {test,after} from 'node:test';import assert from 'node:assert/strict';import {createServer} from '../../scripts/test-server.mjs';
const server=await createServer({server:{middlewareMode:true},appType:'custom'});after(()=>server.close());const {supportFrame,supportFrameGeometry}=await server.ssrLoadModule('/src/app/support-frame.ts');const {stackingWarnings}=await server.ssrLoadModule('/src/app/stackability.ts');
const {buildLoadedSupportFrame}=await server.ssrLoadModule('/src/app/support-frame.ts');
const {evaluateWeights}=await server.ssrLoadModule('/src/app/loading-state.ts');
const {parseCargoPlan}=await server.ssrLoadModule('/src/app/cargo-plans.ts');
const {LayoutHistory}=await server.ssrLoadModule('/src/app/layout-history.ts');
const area={id:'hold',name:'Hold',xMin:0,xMax:10,yMin:0,yMax:10,deckZ:0,clearHeight:5},cargo={id:'apples',name:'Apples',lcg:'4',tcg:'4',vcg:'.5',massTonnes:'1',footprint:{length:1,width:1,height:1,rotation:0,deckZ:0,bottomZ:0,areaId:'hold',stackability:'unstackable'}};
const settings={width:.15,thickness:.1,densityKgM3:470,material:'Pine'};
test('frame posts and platform avoid loading protected cargo, and retain unknown platform capacity',()=>{let i=0;const parts=supportFrame([cargo],area,[cargo],settings,()=>`p${i++}`);assert.equal(parts.length,5);assert.equal(parts[4].footprint.stackability,'unknown');assert.deepEqual(stackingWarnings([cargo,...parts]),[]);assert.ok(parts.every(w=>+w.massTonnes>0));const load={...cargo,id:'upper',footprint:{...cargo.footprint,bottomZ:1.2},massTonnes:'2'};assert.ok(stackingWarnings([cargo,...parts,load]).some(w=>w.id===parts[4].id));assert.ok(!stackingWarnings([cargo,...parts,load]).some(w=>w.id==='apples'));});

test('custom clearance and density produce the same estimate and committed member mass',()=>{
 const chosen={...settings,frameClearance:.25,densityKgM3:780,material:'User material'};
 const geometry=supportFrameGeometry([cargo],area,chosen);let id=0;
 const parts=supportFrame([cargo],area,[cargo],chosen,()=>`custom-${id++}`);
 assert.equal(geometry.postHeight,1.25);
 assert.ok(Math.abs(parts.reduce((sum,w)=>sum+Number(w.massTonnes),0)-geometry.mass)<1e-12);
 assert.ok(parts.every(w=>w.footprint.dunnage.material==='User material'));
 assert.equal(supportFrameGeometry([cargo],area,{...chosen,densityKgM3:1560}).mass,geometry.mass*2);
});
test('group rack spans the whole selection and rejects invalid clearance before placement',()=>{
 const other={...cargo,id:'second',lcg:'6'};
 const geometry=supportFrameGeometry([cargo,other],area,settings);
 assert.ok(geometry.x0<3.5&&geometry.x1>6.5);
 for(const frameClearance of [0,-1,NaN,Infinity])assert.throws(()=>supportFrameGeometry([cargo],area,{...settings,frameClearance}),/positive/);
});
test('loaded rack integrates mass, CG, undo/redo and plan export/import without loading protected cargo',()=>{
 const original={...cargo,freeSurfaceMomentTransverse:'0',category:'cargo',quantity:'1'};
 const before=[original];let n=0;
 const added=buildLoadedSupportFrame(before,area,before,{...settings,frameCopyCargo:true,frameMaxTopLoadTonnes:2},()=>`loaded-${n++}`);
 const after=[...before,...added];assert.equal(added.length,6);assert.deepEqual(stackingWarnings(after),[]);
 const result=evaluateWeights(after);assert.equal(result.error,'');
 const mass=after.reduce((sum,w)=>sum+Number(w.massTonnes),0);
 const moment=after.reduce((sum,w)=>sum+Number(w.massTonnes)*Number(w.vcg),0);
 assert.equal(result.result.displacementTonnes,mass);assert.equal(result.result.vcg,moment/mass);
 assert.ok(Number(added.at(-1).vcg)>Number(original.vcg));
 const history=new LayoutHistory();history.record(before,after,'rack');
 assert.deepEqual(history.step(after,'rack'),before);assert.deepEqual(history.step(before,'rack',true),after);
 const plan={kind:'cargo-plan',version:1,id:'rack-plan',name:'Rack',voyage:'Test',model:'test',savedAt:new Date().toISOString(),state:{scenario:'loading',manual:{},manualMode:'displacement',density:1.025,longitudinalFsm:0,weights:after}};
 const restored=parseCargoPlan(JSON.parse(JSON.stringify(plan)),'test',[]).state.weights;
 assert.deepEqual(evaluateWeights(restored),result);
 assert.equal(restored.find(w=>w.name==='Support frame platform').footprint.maxTopLoadTonnes,2);
 assert.equal(restored.find(w=>w.name==='Support frame post').footprint.dunnage.material,'Pine');
});
test('loaded rack rejects missing capacity, overload and insufficient headroom atomically',()=>{
 const before=[structuredClone(cargo)],snapshot=JSON.stringify(before);let n=0;
 for(const frameMaxTopLoadTonnes of [undefined,.5])assert.throws(()=>buildLoadedSupportFrame(before,area,before,{...settings,frameCopyCargo:true,frameMaxTopLoadTonnes},()=>`fail-${n++}`));
 assert.throws(()=>buildLoadedSupportFrame(before,{...area,clearHeight:1.5},before,{...settings,frameCopyCargo:true,frameMaxTopLoadTonnes:2},()=>`fail-${n++}`),/height/);
 assert.equal(JSON.stringify(before),snapshot);
});
