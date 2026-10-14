// Generates disposable files and checks production parsers/calculations, not UI downloads.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createServer} from './test-server.mjs';
const output=resolve(process.argv[2]??'/tmp/umc-representative-backup');await mkdir(output,{recursive:true});
const server=await createServer({server:{middlewareMode:true},appType:'custom'});
const load=path=>server.ssrLoadModule('/src/app/'+path+'.ts');
let ship,restored;
try{
 const {parseShipBundle,mountShipBundle}=await load('ship-package');
 const {draftWeights}=await load('loading-state');
 const {loadTankCatalog,cleanLoadingPlan,isFixedWeight,tankWeight}=await load('tank-operations');
 const {cargoSurfaces}=await load('cargo-surfaces');
 const {parseCargoPlan}=await load('cargo-plans');
 const {modelSignature}=await load('saved-scenarios');
 const {decodeVoyageBackup,importVoyageBackup}=await load('voyage-backup');
 const {voyageInputs,voyageOperation}=await load('voyage-review');
 const {buildAssessmentReport}=await load('assessment-report');
 const {loadLoadingWeights}=await server.ssrLoadModule('/src/platform/ship-models/load-loading-weights.ts');
 const folder='validation-references/reviewed-apples-vessel',manifest=JSON.parse(await readFile(folder+'/manifest.json','utf8')),files={};
 for(const r of manifest.resources)if(r.path)files[r.path]={encoding:'utf8',data:await readFile(folder+'/'+r.path,'utf8')};
 const bundle={format:'umc-ship-package',version:1,manifest,files};
 ship=mountShipBundle(parseShipBundle(bundle));const model=modelSignature(ship),catalog=await loadTankCatalog(ship),reference=draftWeights(await loadLoadingWeights(ship));
 let weights=cleanLoadingPlan(ship,reference,catalog);const fixed=reference.filter(w=>isFixedWeight(ship,w.id));
 const ballast=catalog.tanks.find(t=>t.group==='ballast'),fuel=catalog.tanks.find(t=>t.group==='mdo');assert.ok(ballast&&fuel);
 for(const [tank,fraction,density] of [[ballast,.6,1.005],[fuel,.7,fuel.defaultDensity]]){const w=tankWeight(tank,{id:tank.id,volumeM3:tank.capacityM3*fraction,density});weights=weights.filter(old=>old.id!==w.id);weights.push(w);}
 const area=cargoSurfaces(ship,'installed')[0],x=(area.xMin+area.xMax)/2,y=(area.yMin+area.yMax)/2,z=area.deckZ;
 const item=(id,name,bottom,height,mass,extra={})=>({id,name,category:'cargo',massTonnes:String(mass),lcg:String(x),tcg:String(y),vcg:String(bottom+height/2),freeSurfaceMomentTransverse:'0',footprint:{areaId:area.id,length:1,width:1,height,rotation:0,deckZ:z,bottomZ:bottom,...extra}});
 weights.push(item('check-floor','Synthetic timber base',z,.1,.05,{kind:'dunnage',dunnage:{material:'Synthetic custom timber',densityKgM3:500,massMode:'calculated'}}),item('check-bottom','Synthetic stackable package',z+.1,1,.75),item('check-layer','Synthetic timber separator',z+1.1,.1,.05,{kind:'dunnage',dunnage:{material:'Synthetic custom timber',densityKgM3:500,massMode:'calculated'}}),item('check-top','Synthetic upper package',z+1.2,1,.75));
 const state={scenario:'loading',manualMode:'displacement',manual:{},density:1.025,longitudinalFsm:0,tweenDeck:'installed',weights,capacity:{limitSource:'Synthetic test only',reserve:17,supportAllowance:3,areaId:area.id,method:'package',quantity:2,unitMass:.75,length:1,width:1,height:1}};
 const plan={kind:'cargo-plan',version:1,id:'representative',name:'Recovery verification Vectis',voyage:'Synthetic persistence test; not an approved loading condition',model,savedAt:'2026-10-14T12:00:00Z',state};
 parseCargoPlan(plan,model,fixed,ship);
 const arrival=voyageOperation(ship,state,catalog,{[fuel.id]:fuel.capacityM3*.1},['check-top']);
 const conditions=[{...plan,id:'departure',voyageStage:{name:'Synthetic voyage',phase:'departure',note:'Fixture'}},{...plan,id:'arrival',state:arrival,voyageStage:{name:'Synthetic voyage',phase:'arrival',parentId:'departure',note:'Consume fuel and unload top package'}}];
 const voyage={format:'umc-voyage-inputs',version:1,model,exportedAt:plan.savedAt,conditions};
 for(const [name,value] of [['ship.json',bundle],['plan.json',plan],['voyage.json',voyage]])await writeFile(resolve(output,name),JSON.stringify(value,null,2));
 // Reload from actual disk files and remount the vessel independently.
 restored=mountShipBundle(parseShipBundle(JSON.parse(await readFile(resolve(output,'ship.json'),'utf8'))));
 const restoredPlan=parseCargoPlan(JSON.parse(await readFile(resolve(output,'plan.json'),'utf8')),model,fixed,restored);
 assert.deepEqual(JSON.parse(JSON.stringify(restoredPlan.state)),state);
 let value=null;let writes=0;const storage={getItem:()=>value,setItem:(_,v)=>{writes++;value=v}};
 const imported=importVoyageBackup(storage,'isolated',model,decodeVoyageBackup(await readFile(resolve(output,'voyage.json'),'utf8'),model));
 assert.equal(writes,1);assert.equal(imported.items[1].voyageStage.parentId,imported.items[0].id);
 const results=[];
 for(let i=0;i<2;i++){const before=await voyageInputs(ship,conditions[i].state),after=await voyageInputs(restored,imported.items[i].state);assert.deepEqual(after,before);const a=await buildAssessmentReport(ship,conditions[i].state,before),b=await buildAssessmentReport(restored,imported.items[i].state,after);assert.deepEqual(b.sections.hydrostatics,a.sections.hydrostatics);results.push({phase:conditions[i].voyageStage.phase,inputs:after,hydrostatics:b.sections.hydrostatics});}
 const retained=value;assert.throws(()=>importVoyageBackup({getItem:()=>value,setItem(){throw new Error('QuotaExceededError')}},'isolated',model,voyage));assert.equal(value,retained);
 assert.throws(()=>decodeVoyageBackup(JSON.stringify({...voyage,version:999}),model));
 const hashes={};for(const name of ['ship.json','plan.json','voyage.json'])hashes[name]=createHash('sha256').update(await readFile(resolve(output,name))).digest('hex');
 await writeFile(resolve(output,'results.json'),JSON.stringify({scope:'Disk-file and production-module verification; not browser download or clean-profile verification',passed:true,hashes,tanks:{ballast:ballast.id,fuel:fuel.id},results},null,2));
 console.log(JSON.stringify({passed:true,output,stages:results.length,weights:weights.length,hashes}));
}finally{ship?.release();restored?.release();await server.close();}
