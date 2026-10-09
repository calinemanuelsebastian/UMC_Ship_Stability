import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from '../../scripts/test-server.mjs';
const server=await createServer({server:{middlewareMode:true},appType:'custom'});after(()=>server.close());
const {placeCargo,cargoBounds,layoutIssues,parseArea,parseFootprint}=await server.ssrLoadModule('/src/app/cargo-layout.ts');
const {parseCargoPlan}=await server.ssrLoadModule('/src/app/cargo-plans.ts');
const {evaluateWeights}=await server.ssrLoadModule('/src/app/loading-state.ts');
const area={name:'Test deck',xMin:0,xMax:10,yMin:-5,yMax:5,deckZ:2};
const weight=(id,x=5,y=0)=>({id,name:id,massTonnes:'10',lcg:String(x),tcg:String(y),vcg:'3',freeSurfaceMomentTransverse:'0',footprint:{length:4,width:2,height:2,rotation:0,deckZ:2}});
test('rotation swaps footprint extents without changing mass or KG',()=>{
 const w=weight('a');assert.deepEqual(cargoBounds(w),{xMin:3,xMax:7,yMin:-1,yMax:1});
 const rotated={...w,footprint:{...w.footprint,rotation:90}};
 assert.deepEqual(cargoBounds(rotated),{xMin:4,xMax:6,yMin:-2,yMax:2});
 assert.deepEqual(evaluateWeights([w]),evaluateWeights([rotated]));
});
test('edge contact is allowed; positive overlap is flagged',()=>{
 assert.equal(layoutIssues([weight('a',3),weight('b',7)],area).length,0);
 assert.ok(layoutIssues([weight('a',3),weight('b',6.9)],area).some(q=>q.kind==='overlap'));
});
test('boundary, missing position and changed deck are explicit',()=>{
 assert.ok(layoutIssues([weight('a',0)],area).some(q=>q.kind==='outside'));
 assert.ok(layoutIssues([{...weight('a'),lcg:''}],area).some(q=>q.kind==='position'));
 assert.ok(layoutIssues([weight('a')],{...area,deckZ:4}).some(q=>q.kind==='deck'));
});
test('moving cargo conserves mass and changes the appropriate moments',()=>{
 const a=evaluateWeights([weight('a')]).result,b=evaluateWeights([weight('a',6,2)]).result;
 assert.equal(a.displacementTonnes,b.displacementTonnes);assert.equal(b.longitudinalMoment-a.longitudinalMoment,10);assert.equal(b.transverseMoment-a.transverseMoment,20);assert.equal(a.vcg,b.vcg);
});
test('geometry survives cargo plan serialization and legacy plans remain valid',()=>{
 const plan={kind:'cargo-plan',version:1,id:'test',name:'Test',voyage:'',model:'test',savedAt:new Date().toISOString(),state:{scenario:'loading',manual:{},manualMode:'displacement',weights:[weight('a')],cargoArea:area}};
 const parsed=parseCargoPlan(JSON.parse(JSON.stringify(plan)),'test',[]);assert.deepEqual(parsed.state.cargoArea,area);assert.deepEqual(parsed.state.weights[0].footprint,weight('a').footprint);
 delete plan.state.cargoArea;delete plan.state.weights[0].footprint;assert.doesNotThrow(()=>parseCargoPlan(plan,'test',[]));
});
test('invalid or nonfinite geometry is rejected',()=>{
 for(const change of [{length:0},{height:-1},{rotation:45},{width:Infinity}])assert.throws(()=>parseFootprint({...weight('a').footprint,...change}));
 for(const change of [{xMax:0},{deckZ:NaN},{name:''}])assert.throws(()=>parseArea({...area,...change}));
});

test('placement aligns footprint edges to offset surface and contains rotated footprints',()=>{
 const a={...area,xMin:.03,xMax:10.03,yMin:-4.97,yMax:5.03};
 const f={...weight('a').footprint,length:1.25,width:.85};
 const position=placeCargo(a,f,2,0,true);
 assert.ok(Math.abs((Number(position.lcg)-f.length/2-a.xMin)*10-Math.round((Number(position.lcg)-f.length/2-a.xMin)*10))<1e-8);
 for(const rotation of [0,90]) for(const x of [-100,100]) for(const y of [-100,100]) {
  const footprint={...f,rotation};const w={...weight('a'),footprint,...placeCargo(a,footprint,x,y,true)};
  assert.equal(layoutIssues([w],a).length,0);
 }
 assert.throws(()=>placeCargo(a,{...f,length:11},0,0,true),/larger/);
});
