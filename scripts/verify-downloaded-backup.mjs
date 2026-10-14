import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {createServer} from './test-server.mjs';
const [planPath,voyagePath,resultPath='/tmp/umc-downloaded-backup-results.json']=process.argv.slice(2);
if(!planPath||!voyagePath)throw new Error('Provide actual downloaded plan and voyage paths.');
const serial=value=>JSON.parse(JSON.stringify(value));
const server=await createServer({server:{middlewareMode:true},appType:'custom'});let ship;
try{
 const load=n=>server.ssrLoadModule('/src/app/'+n+'.ts');
 const {parseShipBundle,mountShipBundle}=await load('ship-package');const {parseCargoPlan}=await load('cargo-plans');const {modelSignature}=await load('saved-scenarios');const {decodeVoyageBackup,importVoyageBackup}=await load('voyage-backup');const {voyageInputs}=await load('voyage-review');const {buildAssessmentReport}=await load('assessment-report');const {isFixedWeight}=await load('tank-operations');const {draftWeights}=await load('loading-state');const {loadLoadingWeights}=await server.ssrLoadModule('/src/platform/ship-models/load-loading-weights.ts');
 ship=mountShipBundle(parseShipBundle(JSON.parse(await readFile('/tmp/umc-representative-backup/ship.json','utf8'))));
 const model=modelSignature(ship),fixed=draftWeights(await loadLoadingWeights(ship)).filter(w=>isFixedWeight(ship,w.id));
 const planBytes=await readFile(planPath),voyageBytes=await readFile(voyagePath);
 const plan=parseCargoPlan(JSON.parse(planBytes.toString()),model,fixed,ship),voyage=decodeVoyageBackup(voyageBytes.toString(),model);
 const reference=JSON.parse(await readFile('/tmp/umc-representative-backup/plan.json','utf8')),referenceVoyage=JSON.parse(await readFile('/tmp/umc-representative-backup/voyage.json','utf8'));
 for(const [key,value] of Object.entries(reference.state))assert.deepEqual(serial(plan.state[key]),value,`Departure input differs: ${key}`);
 let saved=null,writes=0;const imported=importVoyageBackup({getItem:()=>saved,setItem:(_,v)=>{saved=v;writes++;}},'fresh',model,voyage);assert.equal(writes,1);
 const departure=imported.items.find(x=>x.voyageStage?.phase==='departure'),arrival=imported.items.find(x=>x.voyageStage?.phase==='arrival');assert.ok(departure&&arrival);assert.equal(arrival.voyageStage.parentId,departure.id);
 const stages=[];
 for(const [i,entry] of [departure,arrival].entries()){
  assert.deepEqual(serial(entry.state),referenceVoyage.conditions[i].state);
  const inputs=await voyageInputs(ship,entry.state),expected=await voyageInputs(ship,referenceVoyage.conditions[i].state);assert.deepEqual(inputs,expected);
  const report=await buildAssessmentReport(ship,entry.state,inputs);stages.push({phase:entry.voyageStage.phase,inputs,hydrostatics:report.sections.hydrostatics});
 }
 const result={passed:true,scope:'Actual user-downloaded files parsed and restored into empty storage adapter; browser-profile verification separate',files:[{path:planPath,bytes:planBytes.length,sha256:createHash('sha256').update(planBytes).digest('hex')},{path:voyagePath,bytes:voyageBytes.length,sha256:createHash('sha256').update(voyageBytes).digest('hex')}],weights:plan.state.weights.length,conditions:imported.items.length,additionalPlanFields:Object.keys(serial(plan.state)).filter(k=>!(k in reference.state)),parentRemapVerified:true,stages};
 await writeFile(resultPath,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({passed:true,weights:result.weights,conditions:result.conditions,additionalPlanFields:result.additionalPlanFields,resultPath}));
}finally{ship?.release();await server.close();}
