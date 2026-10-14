import {createServer} from '../test-server.mjs';
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
const root=resolve(process.argv[2]);
const server=await createServer({root,configFile:false,server:{middlewareMode:true},appType:'custom'});
try {
 const {parseScenario,readScenarioRecords,mutateScenarioLibrary}=await server.ssrLoadModule('/src/app/saved-scenarios.ts');
 const {parseCargoPlan}=await server.ssrLoadModule('/src/app/cargo-plans.ts');
 const {parseRecovery,readPlanRecords}=await server.ssrLoadModule('/src/app/recovery.ts');
 const {requirePreservedFields}=await server.ssrLoadModule('/src/app/rollback-guard.ts');
 const base={version:1,id:'legacy',name:'Legacy plan',model:'test',savedAt:'2026-10-14T12:00:00Z',state:{scenario:'loading',manualMode:'displacement',manual:{},density:1.025,weights:[]}};
 assert.equal(parseScenario(base,'test').state.density,1.025);
 const cases=[{...base,id:'capacity',state:{...base.state,capacity:{method:'package'}}},{...base,id:'voyage',voyageStage:{name:'Trip',phase:'departure',note:''}},{...base,id:'assessment',state:{...base.state,assessment:{intact:{conditionKey:'key',starboard:'30',port:'30',source:'test'}}}}];
 for(const value of cases){
  const original=JSON.stringify(value);
  assert.throws(()=>parseScenario(value,'test'),/newer simulator/);
  assert.throws(()=>parseCargoPlan({...value,kind:'cargo-plan',voyage:''},'test',[]),/newer simulator/);
  assert.throws(()=>parseRecovery({...value,kind:'recovery-plan',voyage:''},'test',[]),/newer simulator/);
  assert.equal(JSON.stringify(value),original);
 }
 // Rejected library records survive an unrelated supported save byte-for-byte as values.
 let json=JSON.stringify(cases);const storage={getItem:()=>json,setItem:(_,value)=>{json=value}};
 assert.equal(readScenarioRecords(storage,'library','test').damaged,3);
 mutateScenarioLibrary(storage,'library','test',{add:base});
 assert.deepEqual(JSON.parse(json).slice(0,3),cases);
 const records=cases.map(p=>({key:'draft:test:'+p.id,model:'test',plan:{...p,kind:'recovery-plan',voyage:''}}));
 const before=JSON.stringify(records);const loaded=readPlanRecords(records,'test',[]);
 assert.equal(loaded.damaged,3);assert.equal(loaded.drafts.length,0);assert.equal(JSON.stringify(records),before);
 const large={...base,state:{...base.state,weights:Array(10001).fill({})}};
 assert.throws(()=>parseScenario(large,'test'),/at most 10,000/);
 assert.throws(()=>requirePreservedFields({weights:[{footprint:{futureSupport:1}}]},{weights:[{footprint:{}}]}),/futureSupport/);
 requirePreservedFields({manual:{},weights:[]},{manual:{},weights:[]});
 console.log(JSON.stringify({legacy:'accepted',capacity:'rejected',voyageStage:'rejected',intactAssessment:'rejected',cargoPlanAndRecovery:'rejected before loading',nestedUnknownFields:'rejected',largePlan:'explicit rejection',storedUnsupportedRecords:'retained after supported save',scope:'production-module tests; browser rehearsal still required'},null,2));
}finally{await server.close();}
