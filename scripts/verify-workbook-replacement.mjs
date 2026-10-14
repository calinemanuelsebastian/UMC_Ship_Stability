// Read-only workbook verification against production calculation modules and vessel data.
// This is a coverage audit, not a claim of complete replacement or regulatory approval.
import {execFileSync} from 'node:child_process';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {createServer} from './test-server.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const workbook=process.argv[2]??process.env.WORKBOOK_PATH;
if(!workbook)throw Error('Usage: node scripts/verify-workbook-replacement.mjs /absolute/path/reviewed.xlsx');
const source=JSON.parse(execFileSync(process.env.PYTHON??'python3',[root+'scripts/extract-excel-case.py',workbook],{encoding:'utf8',maxBuffer:8*1024*1024}));
const value=(s,a)=>source.cells[s][a].value;
const server=await createServer({root,server:{middlewareMode:true},appType:'custom'});
const checks=[],boundaryChecks=[];
function compare(label,actual,sheet,address,tolerance=1e-6,basis='Installed vessel data'){
 const expected=value(sheet,address);
 if(!Number.isFinite(actual)||!Number.isFinite(expected))throw Error('Missing numeric output: '+label);
 checks.push({label,source:sheet+'!'+address,workbook:expected,application:actual,delta:actual-expected,tolerance,status:Math.abs(actual-expected)<=tolerance?'MATCH':'DIFFERENCE',basis});
}
let ship;
try{
 const {computeLoadingCondition}=await server.ssrLoadModule('/src/core/loading/compute-loading-condition.ts');
 const {computeTableTrim}=await server.ssrLoadModule('/src/core/trim/trimmed-table.ts');
 const {computeStabilityCurves}=await server.ssrLoadModule('/src/core/stability/compute-stability-curves.ts');
 const {integrateGz,assessIntact}=await server.ssrLoadModule('/src/core/stability/intact-assessment.ts');
 const {weatherRoll,gustLever}=await server.ssrLoadModule('/src/core/stability/weather-criterion.ts');
 const {mountShipBundle}=await server.ssrLoadModule('/src/app/ship-package.ts');
 const {buildAssessmentReport}=await server.ssrLoadModule('/src/app/assessment-report.ts');
 const folder=root+'validation-references/reviewed-apples-vessel/';
 const manifest=JSON.parse(await readFile(folder+'manifest.json','utf8')),files={},resourceHashes={};
 for(const r of manifest.resources)if(r.path){const data=await readFile(folder+r.path,'utf8');files[r.path]={encoding:'utf8',data};resourceHashes[r.path]=createHash('sha256').update(data).digest('hex');}
 ship=mountShipBundle({manifest,files});
 const phases=[['Before ballast',source.weights.filter(w=>w.id.startsWith('Calc_G_Cargo-')),'Calc_G_Cargo','D78','H78','I78','J78'],['List ballast',source.weights.filter(w=>w.id.startsWith('Calc_G_Cargo-')||['Calc_Trim-30','Calc_Trim-31','Calc_Trim-32'].includes(w.id)),'Calc_List','C19','G19','H19','I19'],['Final ballast',source.weights,'Calc_Trim','C46','G46','H46','I46']];
 for(const [label,weights,s,m,x,z,y] of phases){const r=computeLoadingCondition(weights);for(const [key,a,t] of [['displacementTonnes',m,1e-8],['longitudinalMoment',x,.01],['verticalMoment',z,.01],['transverseMoment',y,.01]])compare(label+' '+key,r[key],s,a,t,'Production loading function; workbook constituent inputs');}
 const loaded=computeLoadingCondition(source.weights);
 for(const [key,a] of [['lcg','D46'],['vcg','E46'],['tcg','F46']])compare(key,loaded[key],'Calc_Trim',a);
 compare('FSM',loaded.freeSurfaceMomentTransverse,'Calc_Stability','C6');
 compare('Virtual KG',loaded.virtualVcgTransverse,'Calc_Stability','C8');
 const condition={displacementTonnes:loaded.displacementTonnes,lcg:loaded.lcg,vcg:loaded.vcg,tcg:loaded.tcg,freeSurfaceMomentTransverse:loaded.freeSurfaceMomentTransverse,waterDensity:value('Calc_List','B10')};
 const table=JSON.parse(files[manifest.resources.find(r=>r.kind==='hydrostatics.trimmed-table').path].data);
 const trim=computeTableTrim(table,condition,manifest.principalDimensions.lbp);
 compare('Final trim',trim.trimMetres,'Calc_Trim','N110');compare('Tabulated draft',trim.draft,'Calc_Trim','D114');compare('LCF',trim.lcf,'Calc_Trim','J114');
 const actual=await computeStabilityCurves(ship,condition);
 const centreline=await computeStabilityCurves(ship,{...condition,tcg:0});
 compare('KM at trim',actual.gmAtTrim.kmTransverse,'Calc_Stability','C21');compare('Corrected GM',actual.gmAtTrim.correctedGm,'Calc_Stability','C25');
 for(const [i,p] of centreline.points.entries()){
  compare('KN '+p.heelDeg+'°',p.kn,'Calc_Stability',String.fromCharCode(66+i)+'54');
  compare('Centreline GZ '+p.heelDeg+'°',p.gzCorrected,'Calc_Stability',String.fromCharCode(66+i)+'58');
 }
 for(const [from,to,a] of [[0,30,'L61'],[0,40,'L63'],[30,40,'L65']])compare(`Centreline area ${from}–${to}`,integrateGz(centreline.points,from,to),'Calc_Stability',a);
 const peak=centreline.points.reduce((a,b)=>a.gzCorrected>b.gzCorrected?a:b);compare('Sampled peak angle',peak.heelDeg,'Calc_Stability','L70');
 // Deliberately reuse workbook assumptions here: validates formula differences, not the LWL/bilge basis.
 const windInput={beam:value('Calc_Wind','C19'),draft:value('Calc_Wind','C20'),lwl:value('Calc_Wind','C23'),cb:value('Calc_Wind','C26'),kg:value('Calc_Stability','C22'),gm:value('Calc_Stability','C25'),bilgeArea:0};
 const roll=weatherRoll(windInput);
 for(const [key,a] of [['period','C31'],['x1','C22'],['x2','C27'],['k','C28'],['r','C29'],['s','C32'],['angle','C33']])compare('Weather '+key,roll[key],'Calc_Wind',a,1e-8,'Workbook LBP used as LWL and zero bilge area for parity only; not validated vessel assumptions');
 compare('Gust lever',gustLever(value('Calc_Wind','C9')),'Calc_Wind','C10',1e-10,'Workbook steady lever supplied; arithmetic only');
 const changed=computeLoadingCondition(source.weights.map((w,i)=>i===0?{...w,massTonnes:w.massTonnes+10}:w));
 boundaryChecks.push({label:'Adding 10 t updates displacement and moments',passed:Math.abs(changed.displacementTonnes-loaded.displacementTonnes-10)<1e-8&&Math.abs(changed.longitudinalMoment-loaded.longitudinalMoment-10*source.weights[0].lcg)<1e-8});
 for(const [label,input] of [['Out-of-table displacement',{...condition,displacementTonnes:1}],['Unbracketed LCG',{...condition,lcg:0}],['Wrong table density',{...condition,waterDensity:1}]]){try{computeTableTrim(table,input,manifest.principalDimensions.lbp);boundaryChecks.push({label,passed:false});}catch(e){boundaryChecks.push({label,passed:true,message:e.message});}}
 const signedCheck=actual.points.every((p,i)=>Math.abs(p.gzCorrected-centreline.points[i].gzCorrected+condition.tcg*Math.cos(p.heelDeg*Math.PI/180))<1e-10);
 boundaryChecks.push({label:'Actual TCG changes GZ by signed cosine term',passed:signedCheck});
 const report=await buildAssessmentReport(ship,{scenario:'manual',weights:[],manual:{},manualMode:'displacement'},{...condition,pending:false,longitudinalFsm:0});
 boundaryChecks.push({label:'Assessment report retains missing weather inputs explicitly',passed:report.sections.weather.status==='Insufficient data'});
 const result={date:new Date().toISOString(),commit:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),workbook:source.workbook,sha256:source.sha256,basis:'Workbook cached results and formulas read without editing or Excel recalculation; fresh production-module calculations. Not a browser workflow replay.',replacementAccepted:false,weights:source.weights.length,checks,boundaryChecks,condition,trim,actualGz:actual.points,intact:assessIntact(actual),assessmentSections:report.sections,resourceHashes,scopeGaps:['Ideal stowage factor / net cargo deadweight worksheet has no dedicated equivalent.','Cargo quantity/SF mass and global dunnage allowance not automatically reproduced by the planner.','Aggregate reference cargo weights have no individual layout geometry.','Lashing force, calculated strength, sliding and tipping workflow absent.','Full worksheet-equivalent report and source assumptions not reconciled.','Limiting KG convention differs; weather uses operator inputs and source coverage restrictions.']};
 await writeFile(process.env.AUDIT_OUTPUT??root+'docs/audits/2026-10-10-workbook-replacement.json',JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify({matches:checks.filter(r=>r.status==='MATCH').length,differences:checks.filter(r=>r.status==='DIFFERENCE'),boundaryChecks,trim,actualGz30:actual.points.find(p=>p.heelDeg===30),replacementAccepted:false},null,2));
 if(boundaryChecks.some(c=>!c.passed))process.exitCode=1;
}finally{ship?.release();await server.close();}
