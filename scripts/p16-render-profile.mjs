import {readFile} from 'node:fs/promises';
import {createElement} from 'react';import {renderToString} from 'react-dom/server';
import {createServer} from './test-server.mjs';
const server=await createServer({server:{middlewareMode:true},appType:'custom'});
try{
const {LoadingCondition}=await server.ssrLoadModule('/src/features/loading-condition.tsx');
const {CargoPlanner}=await server.ssrLoadModule('/src/components/cargo-planner.tsx');
const {mountShipBundle}=await server.ssrLoadModule('/src/app/ship-package.ts');
const {cargoSurfaces}=await server.ssrLoadModule('/src/app/cargo-surfaces.ts');
const ship=mountShipBundle(JSON.parse(await readFile('/tmp/umc-p16-fixtures/pontoon-ship.json','utf8')));
const plan=JSON.parse(await readFile('/tmp/umc-p16-fixtures/pontoon-3376-plan.json','utf8'));
const {layoutIssues}=await server.ssrLoadModule('/src/app/cargo-layout.ts');const {stackingWarnings}=await server.ssrLoadModule('/src/app/stackability.ts');
const weights=plan.state.weights,area=cargoSurfaces(ship)[0];
for(const [name,fn] of [['layout',()=>layoutIssues(weights,area)],['stacking',()=>stackingWarnings(weights)],['weight-review',()=>renderToString(createElement(LoadingCondition,{ship,weights,setWeights:()=>{},ready:true,loadError:'',section:'review'}))],['render',()=>renderToString(createElement(CargoPlanner,{ship,weights,area,setWeights:()=>{},setArea:()=>{},ready:true}))]]){const start=performance.now();const r=fn();console.log(name,performance.now()-start,'output',r.length);}
ship.release();
}finally{await server.close();}
