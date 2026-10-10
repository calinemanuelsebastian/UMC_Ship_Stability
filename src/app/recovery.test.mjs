import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from '../../scripts/test-server.mjs';
const server=await createServer({server:{middlewareMode:true},appType:'custom'});after(()=>server.close());
const {parseRecovery,readPlanRecords,readRecoveryJournals,writeRecoveryJournal,recoveryPrefix,queueRecoveryWrite}=await server.ssrLoadModule('/src/app/recovery.ts');
const {readScenarioRecords,mutateScenarioLibrary,parseScenario}=await server.ssrLoadModule('/src/app/saved-scenarios.ts');
const fixed={id:'light',name:'Lightship',massTonnes:'100',lcg:'50',vcg:'4',tcg:'0',freeSurfaceMomentTransverse:'0'};
const fixture=()=>({kind:'recovery-plan',version:1,id:'tab-a',name:'Departure',voyage:'Test',model:'ship',savedAt:'2026-10-10T12:00:00Z',state:{scenario:'manual',manualMode:'draft',draft:3,density:1.025,longitudinalFsm:10,manual:{vcg:5,lcg:49,tcg:0,displacementTonnes:500},assessment:{draft:{conditionKey:'key',value:3}},weights:[{...fixed}]}});
function storage(){const values=new Map();return {get length(){return values.size;},key:i=>[...values.keys()][i]??null,getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};}
test('recovery preserves full manual and assessment state through JSON round trip',()=>{
 const f=fixture(),p=parseRecovery(JSON.parse(JSON.stringify(f)),'ship',[fixed]);assert.deepEqual(JSON.parse(JSON.stringify(p)),f);
});
test('recovery still rejects modified lightship, malformed metadata and wrong vessel',()=>{
 const f=fixture();f.state.weights[0].massTonnes='101';assert.throws(()=>parseRecovery(f,'ship',[fixed]));
 assert.throws(()=>parseRecovery(fixture(),'other',[fixed]));const b=fixture();b.voyage=42;assert.throws(()=>parseRecovery(b,'ship',[fixed]));
});
test('damaged records do not hide valid named plans or separate tab drafts',()=>{
 const f=fixture();const plan={...f,kind:'cargo-plan',id:'named',state:{...f.state,scenario:'loading'}};
 const result=readPlanRecords([{key:'broken',model:'ship',plan:{}},{key:'plan:named',model:'ship',plan},{key:'draft:ship:a',model:'ship',plan:f},{key:'draft:ship:b',model:'ship',plan:{...f,id:'tab-b',savedAt:'2026-10-10T12:01:00Z'}},null],'ship',[fixed]);
 assert.equal(result.damaged,1);assert.equal(result.plans.length,1);assert.deepEqual(result.drafts.map(d=>d.plan.id),['tab-b','tab-a']);
});
test('legacy cargo recovery remains readable',()=>{
 const f=fixture();f.kind='cargo-plan';f.state.scenario='loading';const r=readPlanRecords([{key:'draft:ship',model:'ship',plan:f}],'ship',[fixed]);assert.equal(r.drafts.length,1);
});
test('exit journals are independent and corruption does not hide good journals',()=>{
 const s=storage();writeRecoveryJournal(s,'a',{key:'draft:ship:a',model:'ship',plan:fixture()});s.setItem(recoveryPrefix+'broken','{');s.setItem('unrelated','{}');
 const result=readRecoveryJournals(s);assert.equal(result.records.length,1);assert.equal(result.damaged,1);
 assert.throws(()=>writeRecoveryJournal({setItem(){throw new Error('quota');}},'b',{key:'b',model:'ship',plan:fixture()}),/quota/);
});
test('large cargo plans no longer fail at 1000 weights but retain a bounded limit',()=>{
 const f=fixture();f.state.weights=Array.from({length:1500},(_,i)=>({...fixed,id:`w${i}`}));assert.equal(parseScenario(f,'ship').state.weights.length,1500);
 f.state.weights=Array.from({length:10001},(_,i)=>({...fixed,id:`w${i}`}));assert.throws(()=>parseScenario(f,'ship'));
});
test('scenario mutations merge fresh storage and preserve damaged entries',()=>{
 const s=storage(),a=fixture(),b={...fixture(),id:'b'};s.setItem('library',JSON.stringify([{broken:true},a]));
 assert.equal(readScenarioRecords(s,'library','ship').damaged,1);
 mutateScenarioLibrary(s,'library','ship',{add:b});mutateScenarioLibrary(s,'library','ship',{remove:a.id});
 const r=readScenarioRecords(s,'library','ship');assert.deepEqual(r.items.map(p=>p.id),['b']);assert.equal(r.damaged,1);
});
test('corrupt whole library and quota failure never replace existing records',()=>{
 const s=storage();s.setItem('library','{');assert.throws(()=>mutateScenarioLibrary(s,'library','ship',{add:fixture()}));assert.equal(s.getItem('library'),'{');
 const good=JSON.stringify([fixture()]);assert.throws(()=>mutateScenarioLibrary({getItem:()=>good,setItem(){throw new Error('quota');}},'x','ship',{add:{...fixture(),id:'b'}}),/quota/);
});

test('a malformed journal cannot mask a valid database draft with the same key',()=>{
 const f=fixture(), key='draft:ship:a';
 const result=readPlanRecords([{key,model:'ship',plan:f},{key,model:'ship',plan:{savedAt:'invalid'}}],'ship',[fixed]);
 assert.equal(result.drafts.length,1);assert.equal(result.damaged,1);
 const newer={...f,savedAt:'2026-10-10T12:01:00Z'};
 assert.equal(readPlanRecords([{key,model:'ship',plan:f},{key,model:'ship',plan:newer}],'ship',[fixed]).drafts[0].plan.savedAt,newer.savedAt);
});

test('pending database writes checkpoint latest edits without waiting for the older write',async()=>{
 const s=storage(),key='draft:ship:queue',old={key,model:'ship',plan:fixture()};
 let release;const stalled=new Promise(resolve=>{release=resolve});
 const first=queueRecoveryWrite(Promise.resolve(),s,old,()=>stalled);
 const newer={...old,plan:{...fixture(),name:'Latest pending input',savedAt:'2026-10-10T12:02:00Z'}};
 const second=queueRecoveryWrite(first,s,newer,async()=>{});
 // Simulate a restart before either database write has finished.
 const recovered=readPlanRecords(readRecoveryJournals(s).records,'ship',[fixed]);
 assert.equal(recovered.drafts[0].plan.name,'Latest pending input');
 release();await first;
 assert.equal(JSON.parse(s.getItem(recoveryPrefix+key)).plan.name,'Latest pending input');
 await second;assert.equal(s.getItem(recoveryPrefix+key),null);
});
test('failed database write retains checkpoint and journal quota failure still permits database save',async()=>{
 const s=storage(),record={key:'draft:ship:q',model:'ship',plan:fixture()};
 await assert.rejects(queueRecoveryWrite(Promise.resolve(),s,record,async()=>{throw new Error('db failed')}),/db failed/);
 assert.equal(readRecoveryJournals(s).records.length,1);
 let saved=false;await queueRecoveryWrite(Promise.resolve(),{...s,setItem(){throw new Error('quota')}},record,async()=>{saved=true});assert.equal(saved,true);
});
