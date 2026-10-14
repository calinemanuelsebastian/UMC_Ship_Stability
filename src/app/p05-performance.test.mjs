import {test,after} from 'node:test';import assert from 'node:assert/strict';import {createServer} from '../../scripts/test-server.mjs';
const server=await createServer({server:{middlewareMode:true},appType:'custom'});after(()=>server.close());
const {layoutIssues}=await server.ssrLoadModule('/src/app/cargo-layout.ts');const {checkStackingEdits,checkStackingChange}=await server.ssrLoadModule('/src/app/stackability.ts');const {runDunnageJob}=await server.ssrLoadModule('/src/app/dunnage-job.ts');const {LayoutHistory}=await server.ssrLoadModule('/src/app/layout-history.ts');
const area={id:'a',name:'Test',xMin:-100,xMax:100,yMin:-100,yMax:100,deckZ:0,clearHeight:100};
const box=(id,x,y,z=0)=>({id:String(id),name:'Box',category:'cargo',massTonnes:'1',lcg:String(x),tcg:String(y),vcg:String(z+.5),freeSurfaceMomentTransverse:'0',footprint:{length:1,width:1,height:1,rotation:0,deckZ:0,bottomZ:z,areaId:'a',stackability:'stackable',maxTopLoadTonnes:3}});
test('indexed overlap checks match brute force for staggered, stacked and touching boxes',()=>{
 let seed=17;const rnd=()=>((seed=seed*16807%2147483647)/2147483647);const ws=Array.from({length:500},(_,i)=>box(i,Math.round(rnd()*20)/2,Math.round(rnd()*20)/2,Math.floor(rnd()*4)));
 const expected=[];for(let i=0;i<ws.length;i++)for(let j=0;j<i;j++)if(Math.abs(+ws[i].lcg- +ws[j].lcg)<1-1e-8&&Math.abs(+ws[i].tcg- +ws[j].tcg)<1-1e-8&&Math.abs(ws[i].footprint.bottomZ-ws[j].footprint.bottomZ)<1-1e-8)expected.push(`${i}:${j}`);
 assert.deepEqual(layoutIssues(ws,area).filter(x=>x.kind==='overlap').map(x=>`${x.id}:${x.other}`).sort(),expected.sort());
});
test('local preview stack checks agree with full checks for multi-tier load changes',()=>{
 const before=Array.from({length:100},(_,i)=>box(i,Math.floor(i/5)*2,0,i%5));
 for(let i=0;i<100;i++){const edited=[{...before[i],massTonnes:'5'}],after=before.map(w=>w.id===edited[0].id?edited[0]:w);const error=fn=>{try{fn();return '';}catch(e){return e.message;}};assert.equal(error(()=>checkStackingEdits(before,edited)),error(()=>checkStackingChange(before,after)));}
 const next=box('new',0,0,5);assert.throws(()=>checkStackingEdits(before,[next]));
});
test('history byte budget evicts oldest snapshots and preserves fresh undo',()=>{const h=new LayoutHistory(750);let current=[box(0,0,0)];for(let i=1;i<20;i++){const next=[box(0,i,0)];h.record(current,next,'a');current=next;}const prior=h.step(current,'a');assert.equal(prior[0].lcg,'18');assert.equal(h.canUndo(prior,'a'),false);});
test('worker cancellation terminates computation; late replies cannot resolve stale work',async()=>{
 const controller=new AbortController();let worker;const promise=runDunnageJob({},controller.signal,()=>worker={terminate(){this.stopped=true;},postMessage(){}});controller.abort();await assert.rejects(promise,{name:'AbortError'});assert.ok(worker.stopped);worker.onmessage({data:{result:{parts:['stale']}}});
});
test('worker success and failure dispose worker; pre-abort does not start one',async()=>{
 let worker;const create=()=>worker={terminate(){this.stopped=true;},postMessage(){}};let pending=runDunnageJob({},new AbortController().signal,create);worker.onmessage({data:{result:{parts:[]}}});assert.deepEqual(await pending,{parts:[]});assert.ok(worker.stopped);
 pending=runDunnageJob({},new AbortController().signal,create);worker.onerror();await assert.rejects(pending,/layout is unchanged/);assert.ok(worker.stopped);
 const c=new AbortController();c.abort();await assert.rejects(runDunnageJob({},c.signal,()=>{throw Error('should not start');}),{name:'AbortError'});
});
test('the required cargo plus support count survives plan and recovery round trips; above cap is rejected',async()=>{
 const {parseCargoPlan}=await server.ssrLoadModule('/src/app/cargo-plans.ts');const {parseRecovery,maxRecoveryBytes}=await server.ssrLoadModule('/src/app/recovery.ts');const {autoDunnageBatch}=await server.ssrLoadModule('/src/app/auto-dunnage.ts');
 const weights=Array.from({length:29916},(_,i)=>box(i,i%100,Math.floor(i/100)%100));const plan={kind:'cargo-plan',version:1,id:'scale',name:'Scale fixture',voyage:'',model:'scale',savedAt:'2026-10-11T00:00:00Z',state:{scenario:'loading',weights,manual:{},manualMode:'displacement',density:1.025}};
 const json=JSON.stringify(plan);assert.ok(json.length<maxRecoveryBytes);assert.equal(parseCargoPlan(JSON.parse(json),'scale',[]).state.weights.length,29916);assert.equal(parseRecovery({...plan,kind:'recovery-plan'},'scale',[]).state.weights.length,29916);
 const oversized=Array.from({length:40001},(_,i)=>box(i,0,0));assert.throws(()=>parseCargoPlan({...plan,state:{...plan.state,weights:oversized}},'scale',[]));assert.throws(()=>autoDunnageBatch({cargo:oversized,maxGap:.2}),/40,000/);
});
