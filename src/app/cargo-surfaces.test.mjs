import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createServer} from '../../scripts/test-server.mjs';
const server=await createServer({server:{middlewareMode:true},appType:'custom'});after(()=>server.close());
const {cargoSurfaces,cargoOnSurface,restoredCargoArea}=await server.ssrLoadModule('/src/app/cargo-surfaces.ts');
const {modelSignature}=await server.ssrLoadModule('/src/app/saved-scenarios.ts');
const {parseCargoPlan}=await server.ssrLoadModule('/src/app/cargo-plans.ts');
const {placeCargo,layoutIssues}=await server.ssrLoadModule('/src/app/cargo-layout.ts');
const manifest=JSON.parse(await readFile('validation-references/reviewed-apples-vessel/manifest.json','utf8'));
const dataset=JSON.parse(await readFile('validation-references/reviewed-apples-vessel/vectis-castle-apples.geometry.json','utf8'));
const ship={baseUrl:'/local-reviewed-vessel/',manifest};
test('four logical hold areas retain all documented floor and panel regions',()=>{
 const areas=cargoSurfaces(ship).filter(a=>a.id.startsWith('hold-'));assert.equal(areas.length,4);
 for(const f of dataset.floorRegions){const s=areas.find(s=>s.sourceIds.includes(f.id));assert.ok(s);assert.ok(s.regions.some(r=>r.xMin===f.xAP[0]&&r.xMax===f.xAP[1]&&r.yMax*2===f.width));assert.equal(s.deckZ,f.zBaseline);}
 for(const p of dataset.panels){const s=areas.find(s=>s.sourceIds.includes('panel-'+p.id));assert.ok(s);assert.ok(s.regions.some(r=>r.xMin<=p.xAP[0]&&r.xMax>=p.xAP[1]&&r.yMax*2===dataset.panelTypes[p.type].width));}
 assert.equal(cargoSurfaces({...ship,manifest:{...manifest,resources:[]}}).length,0);
});
test('display resource preserves pre-integration saved-plan signature',async()=>{
 const old=JSON.parse(await readFile('src/app/fixtures/pre-capacity-plan.json','utf8'));
 assert.equal(modelSignature(ship),old.model);
});
test('surface identity survives export/import and separates decks',()=>{
 const area=cargoSurfaces(ship)[0],upper=cargoSurfaces(ship).find(a=>a.id==='hold-2-upper');
 const footprint={length:1.2,width:.8,height:1.2,rotation:0,deckZ:area.deckZ,areaId:area.id};
 const w={id:'test',name:'test',massTonnes:'1',vcg:'1.8',lcg:'24',tcg:'0',freeSurfaceMomentTransverse:'0',footprint};
 const plan={kind:'cargo-plan',version:1,id:'test',name:'Test',voyage:'',model:modelSignature(ship),savedAt:new Date().toISOString(),state:{scenario:'loading',manual:{},manualMode:'displacement',weights:[w],cargoArea:area}};
 const read=parseCargoPlan(JSON.parse(JSON.stringify(plan)),modelSignature(ship),[]);
 assert.deepEqual(read.state.weights[0],w);assert.deepEqual(read.state.cargoArea,area);
 assert.ok(cargoOnSurface(w,area));assert.ok(!cargoOnSurface(w,upper));
 const above={...w,id:'above',footprint:{...footprint,areaId:upper.id,deckZ:upper.deckZ}};
 assert.ok(!layoutIssues([w,above],area).some(i=>i.kind==='overlap'));
 const edge=placeCargo(upper,above.footprint,-100,100,true);
 assert.ok(Number(edge.lcg)-.6>=upper.xMin-1e-8);assert.ok(Number(edge.tcg)+.4<=upper.yMax+1e-8);
});

test('hatches remain independent exterior surfaces in all tween deck modes',()=>{
 for(const mode of ['installed','stored','ashore']){
  const areas=cargoSurfaces(ship,mode),h=areas.find(a=>a.id==='hatch-tops');assert.ok(h);assert.equal(h.deckZ,12.53);assert.equal(h.clearHeight,undefined);
  const w={id:'hatch-cargo',name:'Cargo',massTonnes:'2',lcg:'90',tcg:'0',vcg:'13.03',footprint:{length:2,width:2,height:1,rotation:0,deckZ:h.deckZ,areaId:h.id}};
  assert.equal(layoutIssues([w],h).length,0);assert.equal(cargoOnSurface(w,h),true);assert.ok(areas.filter(a=>a.id.startsWith('hold-')).every(a=>!cargoOnSurface(w,a)));
  assert.equal(h.xMin,mode==='installed'?17.1:23.4);assert.ok(h.sourceIds.includes('hatch-1'));assert.ok(h.sourceIds.includes('hatch-2'));
 }
});

test('restoring a plan without an editor selection retains a usable documented surface',()=>{
 const areas=cargoSurfaces(ship);
 assert.deepEqual(restoredCargoArea(ship,'installed'),areas[0]);
 assert.deepEqual(restoredCargoArea(ship,'installed',{...areas[1],xMin:-999}),areas[1]);
 assert.deepEqual(restoredCargoArea(ship,'installed',{...areas[0],id:'unknown'}),areas[0]);
 const custom={name:'Custom',xMin:0,xMax:2,yMin:0,yMax:2,deckZ:1};
 assert.deepEqual(restoredCargoArea(ship,'installed',custom),custom);
 assert.equal(restoredCargoArea({...ship,manifest:{...manifest,resources:[]}},'installed'),undefined);
 assert.deepEqual(restoredCargoArea(ship,'stored'),cargoSurfaces(ship,'stored')[0]);
});
