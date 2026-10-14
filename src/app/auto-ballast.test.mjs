import {test,after} from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {createServer} from '../../scripts/test-server.mjs';
const server=await createServer({server:{middlewareMode:true},appType:'custom'});after(()=>server.close());
const {optimiseBallast,ballastWeights,ballastBounds,createBallastEvaluator,constraintViolation}=await server.ssrLoadModule('/src/app/auto-ballast.ts');
const {tankWeight}=await server.ssrLoadModule('/src/app/tank-operations.ts');
const tank=(id,y=0)=>({id,name:id,group:'ballast',capacityM3:100,defaultDensity:1,fullCentre:[0,y,1],sourcePage:0,tableEnd:100,box:{length:10,width:10,height:1,bottomZ:0},rows:[[0,0,y,0,0],[100,0,y,1,0]]});
const catalog={version:1,source:'Synthetic',tanks:[tank('port',-5),tank('starboard',5)]};
const weights=catalog.tanks.map(t=>tankWeight(t,{id:t.id,volumeM3:0,density:t.id==='port'?1:1.025}));
const goals={trim:0,trimTolerance:.01,listTolerance:.1,draftTolerance:.01,minGM:.15,objective:'mass',requireIntact:false};
const evaluator=async w=>{const a=w.find(w=>w.tank.id==='port').tank.volumeM3,b=w.find(w=>w.tank.id==='starboard').tank.volumeM3;return {metrics:{mass:1000+a+b,trim:(a+b-100)/100,list:(a-b)/100,draft:1,gm:1,maxEndDraft:1,missing:[]},failures:[],missing:[]};};
test('small symmetric case matches independent grid enumeration, preserves densities and changes no unrelated weights',async()=>{
 const other={id:'fuel',name:'Fuel',massTonnes:'10',lcg:'0',tcg:'0',vcg:'1',freeSurfaceMomentTransverse:'0'};const w=[...weights,other],bounds=ballastBounds(catalog,w);const result=await optimiseBallast(catalog,w,bounds,{...goals,list:0,trimTolerance:1e-7,listTolerance:1e-7},async next=>evaluator(next.filter(w=>w.tank)),{budget:200});assert.ok(result.feasible);assert.deepEqual(result.best.volumes,[50,50]);assert.equal(result.best.cost,101.25);assert.deepEqual(result.best.weights.at(-1),other);assert.equal(result.best.weights[1].tank.density,1.025);
 const independent=[];for(let a=0;a<=100;a+=25)for(let b=0;b<=100;b+=25)if(a+b===100&&a===b)independent.push(a+b*1.025);assert.equal(result.best.cost,Math.min(...independent));
 assert.ok(+result.best.weights[0].freeSurfaceMomentTransverse>0);assert.equal(+tankWeight(catalog.tanks[0],{id:'port',volumeM3:100,density:1}).freeSurfaceMomentTransverse,0);
});
test('locked tank, limited capacity and impossible targets never partially apply',async()=>{
 const b=ballastBounds(catalog,weights);b[0].locked=true;b[1].max=20;const snapshot=JSON.stringify(weights);const r=await optimiseBallast(catalog,weights,b,goals,evaluator);assert.equal(r.feasible,false);assert.equal(r.best.volumes[0],0);assert.ok(r.best.volumes[1]<=20);assert.equal(JSON.stringify(weights),snapshot);
 await assert.rejects(()=>optimiseBallast(catalog,weights,[{...b[0],min:1}],goals,evaluator),/locked/);
});
test('least-change objective retains feasible initial fills; asymmetric liquid densities affect mass objective',async()=>{
 const w=ballastWeights(catalog,weights,ballastBounds(catalog,weights),[25,75]);const r=await optimiseBallast(catalog,w,ballastBounds(catalog,w),{...goals,objective:'change'},evaluator);assert.ok(r.feasible);assert.equal(r.best.cost,0);assert.deepEqual(r.best.volumes,[25,75]);
});
test('out-of-table start can recover, but final assessment failures reject a proposal',async()=>{
 const e=async(w,final)=>{const r=await evaluator(w);if(r.metrics.mass<1050)throw new Error('Outside table');if(final)r.failures=['Outside documented limits'];return r;};const r=await optimiseBallast(catalog,weights,ballastBounds(catalog,weights),goals,e);assert.equal(r.feasible,false);assert.ok(r.reasons.some(r=>r.includes('Outside documented')));
});
test('budget, cancellation, unavailable metrics and threshold tolerances are explicit',async()=>{
 const r=await optimiseBallast(catalog,weights,ballastBounds(catalog,weights),goals,evaluator,{budget:1});assert.equal(r.exhausted,true);assert.equal(r.feasible,false);
 const controller=new AbortController();let calls=0;await assert.rejects(()=>optimiseBallast(catalog,weights,ballastBounds(catalog,weights),goals,async w=>{if(++calls===2)controller.abort();return evaluator(w);},{signal:controller.signal}),e=>e.name==='AbortError');
 assert.equal(constraintViolation({mass:1,trim:.01,gm:.15},goals),0);assert.ok(constraintViolation({mass:1,trim:.0101,gm:.15},goals)>0);assert.equal(constraintViolation({mass:1,gm:.15},goals),Infinity);
});
test('invalid bounds, duplicate tanks and nonfinite targets fail before search',async()=>{
 await assert.rejects(()=>optimiseBallast(catalog,weights,ballastBounds(catalog,weights),{...goals,trimTolerance:0},evaluator));
 await assert.rejects(()=>optimiseBallast(catalog,weights,[{id:'port',locked:false,min:0,max:101}],goals,evaluator));
 await assert.rejects(()=>optimiseBallast(catalog,[weights[0],weights[0]],ballastBounds(catalog,weights),goals,evaluator));
});
test('production evaluator uses tank interpolation, independent sea density and full assessment report',async()=>{
 const dir='public/built-in-ship-models/training-pontoon-100x20',manifest=JSON.parse(await readFile(dir+'/manifest.json','utf8')),ship={manifest,baseUrl:'http://p13.test/'},original=globalThis.fetch;
 globalThis.fetch=async url=>{try{return new Response(await readFile(dir+'/'+String(url).replace(ship.baseUrl,''),'utf8'));}catch{return new Response('',{status:404});}};
 try{const w=[{id:'light',name:'Test',massTonnes:'4000',lcg:'0',tcg:'0',vcg:'2',freeSurfaceMomentTransverse:'0'},...weights];const state={scenario:'loading',weights:w,manual:{},manualMode:'displacement',density:1.025,longitudinalFsm:0};const e=await createBallastEvaluator(ship,state,{...goals,trim:undefined});const result=await e(w,true);assert.equal(result.metrics.mass,4000);assert.ok(Math.abs(result.metrics.draft-4000/2050)<1e-8);assert.ok(result.report.sections.securing);assert.ok(result.missing.some(s=>s.includes('Pumping')));const fresh=await createBallastEvaluator(ship,{...state,density:1},{...goals,trim:undefined});assert.ok(Math.abs((await fresh(w,false)).metrics.draft-2)<1e-8);}
 finally{globalThis.fetch=original;}
});
test('final review rejects cheapest candidate and checks alternatives without accepting failed limits',async()=>{
 const r=await optimiseBallast(catalog,weights,ballastBounds(catalog,weights),goals,async(w,final)=>{const e=await evaluator(w);if(final&&w[0].tank.volumeM3>75)e.failures=['Outside documented limit'];return e;});assert.ok(r.feasible);assert.ok(r.best.volumes[0]<=75);
});
test('draft/displacement/GM constraints and fully locked feasible tanks are retained',async()=>{
 const w=ballastWeights(catalog,weights,ballastBounds(catalog,weights),[50,50]);const b=ballastBounds(catalog,w).map(b=>({...b,locked:true}));const r=await optimiseBallast(catalog,w,b,goals,evaluator);assert.ok(r.feasible);assert.deepEqual(r.best.volumes,[50,50]);
 for(const change of [{maxDraft:.9},{maxDisplacement:1099},{minGM:2}]){const x=await optimiseBallast(catalog,w,b,{...goals,...change},evaluator);assert.equal(x.feasible,false);}
});
test('Vectis reference uses trimmed tables and preserves unavailable assessment qualifications',async()=>{
 const dir='validation-references/reviewed-apples-vessel',manifest=JSON.parse(await readFile(dir+'/manifest.json','utf8')),ship={manifest,baseUrl:'http://p13-vectis.test/'},original=globalThis.fetch;
 const {draftWeights}=await server.ssrLoadModule('/src/app/loading-state.ts');const w=draftWeights(JSON.parse(await readFile(dir+'/weights.json','utf8')));
 globalThis.fetch=async url=>{try{return new Response(await readFile(dir+'/'+String(url).replace(ship.baseUrl,''),'utf8'));}catch{return new Response('',{status:404});}};
 try{const e=await createBallastEvaluator(ship,{scenario:'loading',weights:w,manual:{},manualMode:'displacement',density:1.025,longitudinalFsm:0},{...goals,trim:undefined});const r=await e(w,true);assert.ok(Number.isFinite(r.metrics.trim));assert.ok(Number.isFinite(r.metrics.gm));assert.ok(r.report.sections.intactOverview);assert.ok(r.missing.some(s=>s.includes('Wind')));}
 finally{globalThis.fetch=original;}
});
