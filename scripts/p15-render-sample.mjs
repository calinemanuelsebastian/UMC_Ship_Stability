import {createServer} from './test-server.mjs';import {readFile,writeFile} from 'node:fs/promises';
const server=await createServer({server:{middlewareMode:true},appType:'custom'});
try{
 const {buildAssessmentReport}=await server.ssrLoadModule('/src/app/assessment-report.ts');const {printableAssessment}=await server.ssrLoadModule('/src/app/print-assessment.ts');const {mountShipBundle}=await server.ssrLoadModule('/src/app/ship-package.ts');
 const root='public/built-in-ship-models/training-pontoon-100x20/',manifest=JSON.parse(await readFile(root+'manifest.json','utf8')),files={};for(const r of manifest.resources)if(r.path)files[r.path]={encoding:'utf8',data:await readFile(root+r.path,'utf8')};const ship=mountShipBundle({manifest,files});
 try{const state={scenario:'loading',manualMode:'displacement',manual:{},density:1.025,weights:[{id:'lightship',name:'Synthetic lightship',category:'fixed',massTonnes:'4000',lcg:'50',tcg:'0',vcg:'2',freeSurfaceMomentTransverse:'0'}]};const report=await buildAssessmentReport(ship,state,{pending:false,displacementTonnes:4000,lcg:50,tcg:0,vcg:2,freeSurfaceMomentTransverse:0,waterDensity:1.025,longitudinalFsm:0});await writeFile('docs/audits/p15-handover/sample-report.html',printableAssessment(report));}finally{ship.release();}
}finally{await server.close();}
