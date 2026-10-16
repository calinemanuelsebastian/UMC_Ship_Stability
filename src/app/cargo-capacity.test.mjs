import {test,after} from 'node:test';import assert from 'node:assert/strict';import {createServer} from '../../scripts/test-server.mjs';
const server=await createServer({server:{middlewareMode:true},appType:'custom'});after(()=>server.close());
const {capacityCargoTemplate,cargoCapacity,regionArea,defaultCapacitySettings,parseCapacitySettings}=await server.ssrLoadModule('/src/app/cargo-capacity.ts');
const {parseCargoPlan}=await server.ssrLoadModule('/src/app/cargo-plans.ts');
const ship={manifest:{resources:[]}},area={id:'hold',name:'Hold',xMin:0,xMax:10,yMin:0,yMax:10,deckZ:0,clearHeight:4};
const settings={...defaultCapacitySettings,limit:100,limitSource:'Test limit',limitDensity:1.025,unitMass:2,length:2,width:1,height:1,quantity:10,reserve:5,supportAllowance:3};
const weight=(id,mass,category='cargo',kind)=>({id,name:id,category,massTonnes:String(mass),lcg:'5',tcg:'5',vcg:'.5',freeSurfaceMomentTransverse:'0',...(category==='cargo'?{footprint:{areaId:'hold',length:2,width:1,height:1,rotation:0,deckZ:0,...(kind?{kind}:{})}}:{})});
test('shared weights and extra allowances count once; quantity does not multiply row mass',()=>{
 const weights=[weight('light',40,'other'),weight('tank',10,'ballast'),{...weight('cargo',10),quantity:'5'},weight('support',2,'cargo','dunnage')];
 const r=cargoCapacity(ship,weights,[area],settings,1.025);
 assert.equal(r.currentMass,62);assert.equal(r.remainingMass,30);assert.equal(r.remainingVolume,396);assert.equal(r.additionalUnits,15);assert.equal(r.limiting,'Weight');
 assert.equal(r.requiredMass,20);assert.equal(r.requiredVolume,20);
});
test('stepped union and deck changes determine volume; hatch tops excluded from holds',()=>{
 assert.equal(regionArea([{xMin:0,xMax:2,yMin:0,yMax:2},{xMin:1,xMax:3,yMin:0,yMax:2}]),6);
 const hatch={...area,id:'hatch-1',deckZ:10};
 const a=cargoCapacity(ship,[],[area,hatch],{...settings,unitMass:1,length:10,width:10,height:1,limit:1000},1.025);
 assert.equal(a.remainingVolume,400);assert.equal(a.additionalUnits,4);assert.equal(a.limiting,'Volume');
 assert.equal(cargoCapacity(ship,[],[{...area,clearHeight:2}],settings,1.025).remainingVolume,200);
});
test('missing geometry, invalid mass and stale density never yield complete capacity',()=>{
 const noGeometry={...weight('aggregate',10)};delete noGeometry.footprint;
 assert.equal(cargoCapacity(ship,[noGeometry],[area],settings,1.025).additionalUnits,undefined);
 for(const value of ['', '-1', 'NaN'])assert.equal(cargoCapacity(ship,[{...weight('bad',1),massTonnes:value}],[area],settings,1.025).remainingMass,undefined);
 assert.equal(cargoCapacity(ship,[],[area],settings,1).remainingMass,undefined);
 assert.equal(cargoCapacity(ship,[],[area],{...settings,limitSource:''},1.025).remainingMass,undefined);
 assert.equal(cargoCapacity(ship,[],[area],{...settings,areaId:'removed-deck'},1.025).remainingVolume,undefined);
});
test('stowage factor, negative remaining mass and unsupported limits are explicit',()=>{
 const r=cargoCapacity(ship,[weight('light',110,'other')],[area],{...settings,method:'sf',stowageFactor:3},1.025);
 assert.equal(r.remainingMass,-18);assert.equal(r.weightUnits,0);assert.equal(r.requiredVolume,60);
 for(const patch of [{reserve:-1},{quantity:1.5},{unitMass:Infinity},{length:0},{method:'bad'}])assert.throws(()=>parseCapacitySettings({...settings,...patch}));
});
test('capacity inputs survive plan export/import; old plans remain supported',()=>{
 const p={kind:'cargo-plan',version:1,id:'p',name:'Capacity',voyage:'Test',model:'ship',savedAt:new Date().toISOString(),state:{scenario:'loading',manual:{},manualMode:'displacement',weights:[],capacity:settings}};
 assert.deepEqual(parseCargoPlan(JSON.parse(JSON.stringify(p)),'ship',[]).state.capacity,settings);
 delete p.state.capacity;assert.equal(parseCargoPlan(p,'ship',[]).state.capacity,undefined);
});

test('planner handoff preserves one-unit mass and explicit surface without changing settings',()=>{
 const proposal={...settings,areaId:'hold',quantity:50};const before=structuredClone(proposal);
 assert.deepEqual(capacityCargoTemplate(proposal,[area]),{area,mass:2,length:2,width:1,height:1,quantity:50});
 assert.deepEqual(proposal,before);
 assert.equal(capacityCargoTemplate({...proposal,length:undefined},[area]),undefined);
 assert.equal(capacityCargoTemplate({...proposal,areaId:'removed'},[area]),undefined);
 assert.equal(capacityCargoTemplate({...proposal,areaId:''},[area,{...area,id:'hold2'}]),undefined);
 assert.equal(capacityCargoTemplate({...proposal,method:'sf',length:undefined,stowageFactor:2},[area]),undefined);
 assert.equal(capacityCargoTemplate({...proposal,areaId:''},[area]).area,area);
});

test('whole package boundaries absorb only floating-point noise, not genuine overload',()=>{
 const base={...settings,reserve:0,supportAllowance:0,limit:6000*1.025,length:.1,width:.1,height:.1};
 const w=[weight('light',4000,'other')];
 assert.equal(cargoCapacity(ship,w,[area],base,1.025).additionalUnits,1075);
 assert.equal(cargoCapacity(ship,w,[area],{...base,limit:6150-1e-8},1.025).weightUnits,1074);
 assert.equal(cargoCapacity(ship,w,[area],{...base,limit:6150+1e-8},1.025).weightUnits,1075);
 const tiny={...area,xMax:.3,yMax:1,clearHeight:1};
 assert.equal(cargoCapacity(ship,[],[tiny],{...base,length:.1,width:1,height:1},1.025).volumeUnits,3);
 assert.equal(cargoCapacity(ship,[],[{...tiny,xMax:.3-1e-9}],{...base,length:.1,width:1,height:1},1.025).volumeUnits,2);
 assert.equal(cargoCapacity(ship,[],[area],{...base,unitMass:Number.MIN_VALUE},1.025).additionalUnits,undefined);
});

test('optional quantity and package geometry do not block SF-based capacity',()=>{
 const s={...settings,method:'sf',stowageFactor:2,unitMass:undefined,length:undefined,width:undefined,height:undefined,quantity:undefined};
 const r=cargoCapacity(ship,[],[area],s,1.025);
 assert.equal(r.cargoStowageFactor,2);assert.equal(r.criticalStowageFactor,400/92);
 assert.equal(r.loadingOutcome,'Down');assert.equal(r.maximumCargoMass,92);
 assert.equal(r.additionalUnits,undefined);assert.equal(r.requiredMass,undefined);
 const q=cargoCapacity(ship,[],[area],{...settings,quantity:undefined},1.025);
 assert.ok(q.additionalUnits>0);assert.ok(capacityCargoTemplate({...settings,areaId:'hold',quantity:undefined},[area]));
});
test('Full, Down and Full and Down use continuous capacities, not rounded packages',async()=>{
 const {stowageComparison}=await server.ssrLoadModule('/src/app/cargo-capacity.ts');
 assert.equal(stowageComparison(100,200,3).loadingOutcome,'Full');
 assert.equal(stowageComparison(100,200,1).loadingOutcome,'Down');
 assert.equal(stowageComparison(100,200,2).loadingOutcome,'Full and Down');
 assert.equal(stowageComparison(100,200,2.00001).loadingOutcome,'Full');
 assert.equal(stowageComparison(0,200,2).loadingOutcome,'No remaining capacity');
 assert.equal(stowageComparison(-1,200,2).maximumCargoMass,undefined);
 assert.equal(stowageComparison(100,undefined,2).criticalStowageFactor,undefined);
 assert.equal(stowageComparison(100,200,undefined).loadingOutcome,'Incomplete');
});
