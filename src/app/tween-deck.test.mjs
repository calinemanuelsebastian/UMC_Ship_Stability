import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createServer} from '../../scripts/test-server.mjs';
const server=await createServer({server:{middlewareMode:true},appType:'custom'});after(()=>server.close());
const {panelWeight,parseDeckMode}=await server.ssrLoadModule('/src/app/tween-deck.ts');
const {cargoSurfaces}=await server.ssrLoadModule('/src/app/cargo-surfaces.ts');
const {placeCargo,layoutIssues}=await server.ssrLoadModule('/src/app/cargo-layout.ts');
const {parseCargoPlan}=await server.ssrLoadModule('/src/app/cargo-plans.ts');
const manifest=JSON.parse(await readFile('validation-references/reviewed-apples-vessel/manifest.json','utf8'));
const ship={manifest,baseUrl:'/'};
const base={id:'Calc_G_Cargo-74',name:'TW Deck',massTonnes:'269.6',lcg:'63.24',tcg:'0',vcg:'6.97',freeSurfaceMomentTransverse:'0'};
test('removal changes only panel mass; reinstall restores documented contribution',()=>{
 const removed=panelWeight(base,'ashore',ship);assert.equal(Number(removed.massTonnes),0);assert.deepEqual(panelWeight(removed,'installed',ship),base);
 assert.throws(()=>parseDeckMode('hidden'));assert.equal(parseDeckMode(undefined),'installed');
});
test('removed decks expose lower floors, full height, and enforce height limits',()=>{
 const installed=cargoSurfaces(ship).filter(a=>a.id.startsWith('hold-')),removed=cargoSurfaces(ship,'ashore').filter(a=>a.id.startsWith('hold-'));assert.equal(installed.length,4);assert.equal(removed.length,2);
 assert.equal(installed[0].clearHeight,5.35);assert.equal(removed[0].clearHeight,11);
 const footprint={length:1,width:1,height:8,rotation:0,deckZ:1.2};
 assert.throws(()=>placeCargo(installed[0],footprint,30,0,false),/height/);assert.doesNotThrow(()=>placeCargo(removed[1],footprint,30,0,false));
 assert.ok(layoutIssues([{...base,lcg:'30',footprint}],installed[0]).some(i=>i.kind==='height'));
});
test('cargo plans preserve removal and reject tampered panel masses',()=>{
 const plan={version:1,kind:'cargo-plan',id:'test',name:'Open hold',voyage:'',savedAt:new Date().toISOString(),model:'test',state:{scenario:'loading',manualMode:'displacement',manual:{},tweenDeck:'ashore',weights:[panelWeight(base,'ashore',ship)]}};
 assert.equal(parseCargoPlan(plan,'test',[base],ship).state.tweenDeck,'ashore');
 plan.state.weights[0].massTonnes='1';assert.throws(()=>parseCargoPlan(plan,'test',[base],ship),/fixed/);
});
test('all 15 panel dimensions match the manual table',async()=>{
 const d=JSON.parse(await readFile('validation-references/reviewed-apples-vessel/vectis-castle-apples.geometry.json','utf8'));
 assert.equal(d.panels.length,15);let mass=0;
 const expected={A:[6.115,13.740,.670,6],B:[5.050,13.740,.670,6],C:[5.565,8.220,.670,2],D:[3.730,13.740,.670,1]};
 for(const [type,[length,width,thickness,count]] of Object.entries(expected)){
  const p=d.panelTypes[type];assert.deepEqual([p.length,p.width,p.thickness,p.count],[length,width,thickness,count]);
  assert.equal(d.panels.filter(v=>v.type===type).length,count);
 }
 for(const p of d.panels){const t=d.panelTypes[p.type];assert.ok(Math.abs(p.xAP[1]-p.xAP[0]-t.length)<.0011);mass+=t.massTonnes;}
 assert.ok(Math.abs(mass-269.6)<1e-8);
});
test('onboard storage conserves mass and matches the manual aggregate centres',async()=>{
 const storedPanels=manifest.resources.find(r=>r.kind==='loading.cargo-surfaces').config.deck.storedPanels;
 const stored=panelWeight(base,'stored',ship);assert.equal(stored.massTonnes,base.massTonnes);assert.equal(stored.lcg,'16.93');assert.equal(stored.vcg,'12.838');assert.deepEqual(panelWeight(stored,'installed',ship),base);
 const d=JSON.parse(await readFile('validation-references/reviewed-apples-vessel/vectis-castle-apples.geometry.json','utf8'));
 assert.equal(new Set(storedPanels.map(p=>p.id)).size,15);
 let mass=0,xMoment=0,zMoment=0;
 for(const p of storedPanels){const panel=d.panels.find(v=>v.id===p.id);assert.ok(panel);const m=d.panelTypes[panel.type].massTonnes;mass+=m;xMoment+=m*p.x;zMoment+=m*p.z;}
 assert.ok(Math.abs(mass-269.6)<1e-8);assert.ok(Math.abs(xMoment/mass-16.930)<.001);assert.ok(Math.abs(zMoment/mass-12.838)<.001);
});
test('stored Hold 1 keeps its stepped outline and accepts cargo across adjoining regions',async()=>{
 const {fitsArea}=await server.ssrLoadModule('/src/app/cargo-layout.ts');
 const holds=cargoSurfaces(ship,'stored').filter(a=>a.id.startsWith('hold-'));assert.deepEqual(holds.map(h=>h.name),['Hold 1','Hold 2']);
 const h=holds[0],a=h.regions[0],b=h.regions[1],step=a.xMax;
 assert.equal(h.regions.length,2);
 assert.ok(fitsArea(h,{xMin:step-.5,xMax:step+.5,yMin:-1,yMax:1}));
 assert.equal(fitsArea(h,{xMin:b.xMin+.1,xMax:b.xMin+1,yMin:h.yMax-1,yMax:h.yMax}),false);
 const footprint={length:2,width:1,height:8,rotation:0,deckZ:1.2,areaId:h.id};
 assert.doesNotThrow(()=>placeCargo(h,footprint,step,0,false));
});
test('stored panel configuration round-trips in cargo plans without reverting CG',()=>{
 const plan={version:1,kind:'cargo-plan',id:'stored',name:'Stored deck',voyage:'',savedAt:new Date().toISOString(),model:'test',state:{scenario:'loading',manualMode:'displacement',manual:{},tweenDeck:'stored',weights:[panelWeight(base,'stored',ship)],cargoArea:cargoSurfaces(ship,'stored').filter(a=>a.id.startsWith('hold-'))[0]}};
 const restored=parseCargoPlan(JSON.parse(JSON.stringify(plan)),'test',[base],ship);
 assert.equal(restored.state.tweenDeck,'stored');assert.equal(restored.state.weights[0].vcg,'12.838');assert.equal(restored.state.cargoArea.regions.length,2);
 plan.state.weights[0].vcg='6.97';assert.throws(()=>parseCargoPlan(plan,'test',[base],ship),/fixed/);
});
