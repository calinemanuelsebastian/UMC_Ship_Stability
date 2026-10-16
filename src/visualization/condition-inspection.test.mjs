import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createServer} from '../../scripts/test-server.mjs';
const server=await createServer({server:{middlewareMode:true},appType:'custom'});after(()=>server.close());
const {inspectionCategory,inspectionMarkers,draftMeasurements}=await server.ssrLoadModule('/src/visualization/condition-inspection.ts');
const {computeTrimView}=await server.ssrLoadModule('/src/visualization/trim-view.ts');
const {computeUprightHydrostatics}=await server.ssrLoadModule('/src/core/hydrostatics/compute-upright-hydrostatics.ts');
const manifest=JSON.parse(await readFile('public/built-in-ship-models/training-pontoon-100x20/manifest.json','utf8'));
const ship={manifest,baseUrl:'/'};
const originalFetch=globalThis.fetch;globalThis.fetch=async url=>new Response(await readFile('public/built-in-ship-models/training-pontoon-100x20'+String(url),'utf8'));after(()=>{globalThis.fetch=originalFetch;});
const item={id:'one',name:'One',massTonnes:'1',lcg:'50',tcg:'2',vcg:'3',freeSurfaceMomentTransverse:'0'};
test('inspection distinguishes cargo, dunnage, tanks and fixed/movable weights',()=>{
 assert.equal(inspectionCategory(ship,item),'Cargo');
 assert.equal(inspectionCategory(ship,{...item,footprint:{kind:'dunnage'}}),'Dunnage / support');
 assert.equal(inspectionCategory(ship,{...item,tank:{id:'t',volumeM3:1,density:1}}),'Tanks / liquids');
 assert.equal(inspectionCategory(ship,{...item,category:'fixed'}),'Fixed weights');
 assert.equal(inspectionCategory(ship,{...item,category:'crew'}),'Other onboard weights');
});
test('tank is a physical CG symbol without box data, never a cargo footprint',()=>{
 const [m]=inspectionMarkers(ship,[{...item,tank:{id:'t',volumeM3:1,density:1},footprint:{length:5}}]);
 assert.equal(m.footprint,undefined);assert.equal(m.tankBox,undefined);assert.match(m.label,/CG only/);assert.deepEqual(m.point,{x:0,y:3,z:2});
});
test('declared tank fill uses volume and preserves empty/full endpoints',()=>{
 const tank={id:'t',fullCentre:[50,2,3],capacityM3:40,box:{length:5,width:4,height:2,bottomZ:2}};
 for(const volume of [0,10,40]){const [m]=inspectionMarkers(ship,[{...item,tank:{id:'t',volumeM3:volume,density:1.025}}],{tanks:[tank]});assert.equal(m.tankBox.fill,volume/40);assert.deepEqual(m.tankBox.point,{x:0,y:3,z:2});}
 const [bad]=inspectionMarkers(ship,[{...item,tank:{id:'t',volumeM3:41,density:1}}],{tanks:[tank]});assert.equal(bad.tankBox,undefined);
});
test('markers use actual bottom/height and physical CG, not virtual CG',()=>{
 const w={...item,footprint:{length:2,width:1,height:2,deckZ:0,bottomZ:4,rotation:90}};
 const [m]=inspectionMarkers(ship,[w]);assert.equal(m.point.y,3);assert.equal(m.cargoPoint.y,5);assert.equal(m.footprint.rotation,90);
 assert.equal(inspectionMarkers(ship,[{...w,lcg:''},{...w,vcg:'NaN'}]).length,0);
});
test('draft labels preserve signs and withhold coupled or unconfirmed measurements',()=>{
 for(const [aft,forward] of [[3,3],[2,4],[4,2],[0,8]]){const m=draftMeasurements({draftAft:aft,draftForward:forward},'trim');assert.equal(m.mean,(aft+forward)/2);assert.equal(m.difference,forward-aft);}
 for(const mode of ['heel','teaching']){const m=draftMeasurements({draftAft:3,draftForward:4},mode);assert.ok(m.unavailable);assert.equal(m.mean,undefined);}
 assert.match(draftMeasurements({draftAft:3,draftForward:4,illustrativeDrafts:true},'trim').unavailable,/datum/);
});
test('trim view deduplicates immutable results and matches shared upright baseline',async()=>{
 const c={...manifest.defaultCondition,displacementTonnes:6000,lcg:50,tcg:0,vcg:3,waterDensity:1,freeSurfaceMomentTransverse:0,draft:undefined};
 const a=computeTrimView(ship,c,0),b=computeTrimView(ship,c,0);assert.equal(a,b);
 const [result,h]=await Promise.all([a,computeUprightHydrostatics(ship,c)]);assert.ok(Object.isFrozen(result));assert.equal(result.draftAft,h.draft);assert.equal(result.draftForward,h.draft);
 const corrected=await computeUprightHydrostatics(ship,{...c,freeSurfaceMomentTransverse:600});assert.equal(corrected.virtualVcgTransverse,3.1);assert.equal(corrected.condition.vcg,3);assert.ok(Math.abs(corrected.gmTransverse-corrected.gmTransverseCorrected-.1)<1e-10);
});

test('specification card accepts the vessel-derived fixed-weight category',async()=>{
 const {createElement}=await import('react');const {renderToStaticMarkup}=await import('react-dom/server');
 const {CargoSpecifications}=await server.ssrLoadModule('/src/components/cargo-specifications.tsx');
 const html=renderToStaticMarkup(createElement(CargoSpecifications,{item:{...item,name:'Lightship'},categoryLabel:'Fixed weights'}));
 assert.match(html,/<dd>Fixed weights<\/dd>/);assert.doesNotMatch(html,/<dd>Cargo<\/dd>/);
});
