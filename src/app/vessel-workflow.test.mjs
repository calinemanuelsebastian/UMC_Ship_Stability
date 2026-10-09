import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createServer} from '../../scripts/test-server.mjs';
const server=await createServer({server:{middlewareMode:true},appType:'custom'});after(()=>server.close());
const {parseShipBundle,mountShipBundle}=await server.ssrLoadModule('/src/app/ship-package.ts');
const {exportShipBundle}=await server.ssrLoadModule('/src/app/ship-package-io.ts');
const {inspectShipPackage}=await server.ssrLoadModule('/src/app/inspect-ship-package.ts');
const {loadLoadingWeights}=await server.ssrLoadModule('/src/platform/ship-models/load-loading-weights.ts');
const {loadTankCatalog,tankWeight,isFixedWeight,cleanLoadingPlan}=await server.ssrLoadModule('/src/app/tank-operations.ts');
const {draftWeights,evaluateWeights}=await server.ssrLoadModule('/src/app/loading-state.ts');
const {panelWeight,deckDefinition}=await server.ssrLoadModule('/src/app/tween-deck.ts');
const {cargoSurfaces}=await server.ssrLoadModule('/src/app/cargo-surfaces.ts');
const {modelSignature}=await server.ssrLoadModule('/src/app/saved-scenarios.ts');
const {parseCargoPlan}=await server.ssrLoadModule('/src/app/cargo-plans.ts');
const {visualHullFor}=await server.ssrLoadModule('/src/visualization/ship-scene-data.ts');
const {computeUprightHydrostatics}=await server.ssrLoadModule('/src/core/hydrostatics/compute-upright-hydrostatics.ts');
async function fixture(root){const manifest=JSON.parse(await readFile(root+'/manifest.json','utf8')),files={};for(const r of manifest.resources)if(r.path)files[r.path]={encoding:'utf8',data:await readFile(root+'/'+r.path,'utf8')};return {format:'umc-ship-package',version:1,manifest,files};}
const source=await fixture('validation-references/reviewed-apples-vessel');
test('Vectis export, reimport and cargo/tank/deck calculations remain identical',async()=>{
 const ship=mountShipBundle(parseShipBundle(source));let restored;
 try{
  const exported=await exportShipBundle(ship);await inspectShipPackage(exported);restored=mountShipBundle(parseShipBundle(JSON.parse(JSON.stringify(exported))));
  assert.equal(modelSignature(restored),modelSignature(ship));
  const base=draftWeights(await loadLoadingWeights(ship)),catalog=await loadTankCatalog(ship),other=await loadTankCatalog(restored);
  assert.deepEqual(other,catalog);assert.equal(other.tanks.length,68);
  const tank=catalog.tanks.find(t=>t.group==='ballast');const liquid=tankWeight(tank,{id:tank.id,volumeM3:tank.capacityM3*.4,density:1.01});
  assert.deepEqual(tankWeight(other.tanks.find(t=>t.id===tank.id),liquid.tank),liquid);
  const cargo={id:'workflow-cargo',name:'Test cargo',massTonnes:'100',lcg:'50',vcg:'2',tcg:'0',freeSurfaceMomentTransverse:'0',footprint:{length:2,width:2,height:1.6,rotation:0,deckZ:1.2,areaId:'hold-2-lower'}};
  const clean=cleanLoadingPlan(ship,base,catalog).filter(w=>w.id!==liquid.id);
  const results=[];
  for(const mode of ['installed','stored']){
   const weights=[...clean.map(w=>panelWeight(w,mode,restored)),liquid,cargo];
   const totals=evaluateWeights(weights);assert.equal(totals.error,'');results.push(totals.result);
   const originalTotals=evaluateWeights([...clean.map(w=>panelWeight(w,mode,ship)),liquid,cargo]).result;assert.deepEqual(totals.result,originalTotals);
   assert.deepEqual(cargoSurfaces(restored,mode),cargoSurfaces(ship,mode));
   const plan={kind:'cargo-plan',version:1,id:'acceptance',name:'Acceptance',voyage:'',savedAt:new Date().toISOString(),model:modelSignature(ship),state:{scenario:'loading',manualMode:'displacement',manual:{},tweenDeck:mode,weights}};
   assert.equal(parseCargoPlan(JSON.parse(JSON.stringify(plan)),modelSignature(restored),base.filter(w=>isFixedWeight(restored,w.id)),restored).state.tweenDeck,mode);
  }
  assert.equal(results[0].displacementTonnes,results[1].displacementTonnes);assert.ok(results[1].vcg>results[0].vcg,'Documented storage raises aggregate VCG');
  assert.deepEqual(await computeUprightHydrostatics(ship,ship.manifest.defaultCondition),await computeUprightHydrostatics(restored,restored.manifest.defaultCondition));
  assert.equal(visualHullFor(restored).model.storedPanels.length,15);
 }finally{ship.release();restored?.release();}
});
test('a renamed Vectis package retains all capabilities without identity checks',async()=>{
 const b=structuredClone(source);b.manifest.id='independent-ship';b.manifest.name='Independent ship';const t=JSON.parse(b.files['trimmed-table.json'].data);t.modelId=b.manifest.id;b.files['trimmed-table.json'].data=JSON.stringify(t);
 await inspectShipPackage(b);const ship=mountShipBundle(parseShipBundle(b));try{assert.equal(cargoSurfaces(ship,'stored').filter(a=>a.id.startsWith('hold-')).length,2);assert.equal(deckDefinition(ship).weights[0].stored.vcg,12.838);assert.equal(visualHullFor(ship).model.storedPanels.length,15);}finally{ship.release();}
});
test('a different two-level training configuration uses its own weight IDs and centres',async()=>{
 const b=await fixture('public/built-in-ship-models/training-pontoon-100x20');
 const loading=b.manifest.resources.find(r=>r.kind==='loading.weights');loading.config.fixedWeightIds.push('training-panels');
 for(const path of ['loading/weights.json','loading/operational-weights.json']){const weights=JSON.parse(b.files[path].data);weights.push({id:'training-panels',name:'Training panels',massTonnes:20,lcg:40,vcg:5,tcg:0});b.files[path].data=JSON.stringify(weights);}
 const resource=b.manifest.resources.find(r=>r.kind==='loading.cargo-surfaces');const lower={id:'bay',name:'Bay',xMin:10,xMax:60,yMin:-5,yMax:5,deckZ:2,clearHeight:3};
 resource.config={surfaces:[lower],byMode:{installed:[lower,{...lower,id:'upper',name:'Upper bay',deckZ:5,clearHeight:3}],stored:[{...lower,clearHeight:6}],ashore:[{...lower,clearHeight:6}]},deck:{weights:[{id:'training-panels',installed:{massTonnes:20,lcg:40,vcg:5,tcg:0},stored:{massTonnes:20,lcg:15,vcg:2.5,tcg:0},ashore:{massTonnes:0,lcg:40,vcg:5,tcg:0}}],storedPanels:[]}};
 await inspectShipPackage(b);const ship=mountShipBundle(parseShipBundle(b));try{const base=draftWeights(await loadLoadingWeights(ship)).find(w=>w.id==='training-panels');assert.equal(panelWeight(base,'stored',ship).vcg,'2.5');assert.equal(cargoSurfaces(ship).length,2);assert.equal(cargoSurfaces(ship,'stored').length,1);assert.equal(panelWeight({...base,id:'Calc_G_Cargo-74'},'stored',ship).vcg,'5');}finally{ship.release();}
});
test('deck definitions reject disappearing onboard mass and missing fixed IDs',async()=>{const b=structuredClone(source);b.manifest.resources.find(r=>r.kind==='loading.cargo-surfaces').config.deck.weights[0].stored.massTonnes=1;assert.throws(()=>parseShipBundle(b),/preserve mass/);const c=structuredClone(source);c.manifest.resources.find(r=>r.kind==='loading.cargo-surfaces').config.deck.weights[0].id='missing';await assert.rejects(inspectShipPackage(c),/fixed loading weight/);});
