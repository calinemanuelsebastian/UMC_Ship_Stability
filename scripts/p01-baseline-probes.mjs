// Read-only diagnostics: records current behaviour, not acceptance assertions.
import {readFile,writeFile} from 'node:fs/promises';
import {createServer} from './test-server.mjs';
const server=await createServer({server:{middlewareMode:true},appType:'custom'});
const originalFetch=globalThis.fetch;
try {
 const {cargoCapacity,defaultCapacitySettings}=await server.ssrLoadModule('/src/app/cargo-capacity.ts');
 const {resolveCapacityLimit,vesselCapacityLimit}=await server.ssrLoadModule('/src/app/capacity-limit.ts');
 const {autoDunnageBatch}=await server.ssrLoadModule('/src/app/auto-dunnage.ts');
 const directory='public/built-in-ship-models/training-pontoon-100x20';
 const manifest=JSON.parse(await readFile(directory+'/manifest.json','utf8'));
 const resource=manifest.resources.find(r=>r.kind==='hydrostatics.upright-table');
 const csv=await readFile(directory+'/'+resource.path,'utf8');
 globalThis.fetch=async()=>new Response(csv);
 const ship={manifest,baseUrl:'http://fixture/'};
 const limit=await resolveCapacityLimit(ship,vesselCapacityLimit(ship),1.025);
 const settings={...defaultCapacitySettings,limit,limitDensity:1.025,limitSource:'Documented pontoon design reference',unitMass:2,length:1,width:1,height:1};
 const result=cargoCapacity(ship,[{id:'light',name:'Lightship',category:'lightship',massTonnes:'4000'}],[],settings,1.025);
 const findings=[{id:'B01',description:'Exact package count at documented pontoon limit',expected:1075,actual:result.weightUnits,limit,remainingMass:result.remainingMass}];
 const area={id:'hold',name:'Hold',xMin:0,xMax:100,yMin:0,yMax:100,deckZ:0,clearHeight:10};
 const unit=(id,x,y,z=0)=>({id,name:'Cargo',category:'cargo',massTonnes:'1',lcg:String(x),tcg:String(y),vcg:String(z+.5),footprint:{areaId:'hold',length:1,width:1,height:1,rotation:0,deckZ:0,bottomZ:z,dunnageProfile:'boxed'}});
 const material={length:1,width:1,thickness:.05,mass:1,material:'Pine timber',densityKgM3:470,massMode:'calculated',count:1,gap:0,direction:'x',arrangement:'frame',solidLimit:.2,memberWidth:.1,bearerSpacing:1};
 let id=0;
 const run=cargo=>autoDunnageBatch({cargo,selection:[],areas:[area],settings:material,maxGap:.6,walls:false,id:()=>`probe-${++id}`});
 const tiers=[unit('a',2,2),unit('b',3.5,2),unit('c',2,2,1),unit('d',3.5,2,1)];
 const stacked=run(tiers);
 findings.push({id:'B02',description:'Two-tier lateral gap arrangement',levels:[...new Set(stacked.parts.map(p=>p.footprint.bottomZ))],parts:stacked.parts.length,skipped:stacked.skipped,reasons:stacked.reasons,interpretation:'Review whether the intended upper gap has support; do not assume full-height restraint from one thin spacer.'});
 const timings=[];
 for(const count of [100,1000,3376]) {
  const cols=Math.ceil(Math.sqrt(count));const cargo=Array.from({length:count},(_,i)=>unit(`c${i}`,1+(i%cols)*1.5,1+Math.floor(i/cols)*1.5));
  const start=performance.now();const batch=run(cargo);
  timings.push({cargo:count,milliseconds:performance.now()-start,parts:batch.parts.length,massTonnes:batch.massTonnes,skipped:batch.skipped});
 }
 await writeFile('docs/audits/p01-baseline/probes.json',JSON.stringify({node:process.version,findings,timings,note:'Single cold call per size; synthetic flat hold, no walls. Not browser frame-rate or structural verification.'},null,2)+'\n');
 console.log(JSON.stringify({findings,timings},null,2));
} finally {globalThis.fetch=originalFetch;await server.close();}
