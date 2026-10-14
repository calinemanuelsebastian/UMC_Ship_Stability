// Reproducible read-only source audit. Writes evidence only, never source tables.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {createServer} from './test-server.mjs';
const server=await createServer({server:{middlewareMode:true},appType:'custom'});
try{
 const {inspectShipPackage}=await server.ssrLoadModule('/src/app/inspect-ship-package.ts');
 const {mountShipBundle}=await server.ssrLoadModule('/src/app/ship-package.ts');
 const {computeLoadingCondition}=await server.ssrLoadModule('/src/core/loading/compute-loading-condition.ts');
 const {computeTableTrim}=await server.ssrLoadModule('/src/core/trim/trimmed-table.ts');
 const {computeStabilityCurves}=await server.ssrLoadModule('/src/core/stability/compute-stability-curves.ts');
 const {replayReference,replayWorkedExample}=await server.ssrLoadModule('/src/core/stability/reference-replay.ts');
 const reports=[];
 const baseline=JSON.parse(await readFile('docs/audits/p01-baseline/data-register.json','utf8'));
 for(const directory of ['public/built-in-ship-models/training-pontoon-100x20','validation-references/reviewed-apples-vessel']){
  const manifest=JSON.parse(await readFile(directory+'/manifest.json','utf8')),files={},resources=[];
  for(const r of manifest.resources){
   let sha256;if(r.path){const data=await readFile(directory+'/'+r.path,'utf8');files[r.path]={encoding:'utf8',data};sha256=createHash('sha256').update(data).digest('hex');}
   const previous=baseline.find(x=>x.vessel===manifest.id&&x.resource===r.id);
   resources.push({id:r.id,kind:r.kind,path:r.path,sha256,unchangedSinceP01:sha256===undefined?undefined:sha256===previous?.sha256,metadata:r});
  }
  const bundle={format:'umc-ship-package',version:1,manifest,files},inspection=await inspectShipPackage(bundle);
  const report={vessel:manifest.id,foundation:inspection.foundation,warnings:inspection.warnings,resources};reports.push(report);
  if(files['assessment-basis.json']){
   const ship=mountShipBundle(bundle);
   try{
    const cases=JSON.parse(files['assessment-basis.json'].data).weatherEvidence.cases;
    const replays=[];for(const c of cases)replays.push(await replayReference(ship,c));
    const max=(label)=>Math.max(...replays.flatMap(r=>r.rows.filter(x=>x.label===label&&x.difference!==undefined).map(x=>Math.abs(x.difference))));
    report.booklet={conditions:replays.length,weightCases:cases.filter(c=>c.weightRows).length,maxTrimResidualM:max('Initial trim'),maxDraftResidualM:max('Initial moulded draft'),replays};
    assert.equal(replays.length,37);assert.ok(max('Initial trim')<.01&&max('Initial moulded draft')<.01);
    report.workedExample=await replayWorkedExample(ship);assert.ok(report.workedExample.rows.every(r=>Math.abs(r.difference)<.001));
    const reference=JSON.parse(await readFile('validation-references/apples-reference-case-v2.json','utf8'));
    const loading=computeLoadingCondition(reference.weights),condition={...loading,waterDensity:reference.condition.waterDensity};
    const comparisons=[];
    function check(label,actual,expected,tolerance){const difference=actual-expected;comparisons.push({label,actual,expected,difference,tolerance});assert.ok(Number.isFinite(actual)&&Math.abs(difference)<=tolerance,`${label}: ${difference}`);}
    for(const key of ['displacementTonnes','lcg','vcg','tcg','freeSurfaceMomentTransverse'])check(key,loading[key],reference.condition[key],1e-8);
    const trim=computeTableTrim(JSON.parse(files['trimmed-table.json'].data),condition,manifest.principalDimensions.lbp);
    for(const key of ['trimMetres','draft','lcf','kmTransverse'])if(reference.expected.trim[key]!==undefined)check(key,trim[key],reference.expected.trim[key],1e-8);
    const gz=await computeStabilityCurves(ship,condition);
    for(const [i,p] of gz.points.entries())for(const key of ['kn','gz','gzCorrected'])check(`${key} at ${p.heelDeg}`,p[key],reference.expected.gz[i][key],1e-8);
    report.correctedApples={comparisons,scope:reference.scope};
   }finally{ship.release();}
  }
 }
 await mkdir('docs/audits/p03-foundations',{recursive:true});
 await writeFile('docs/audits/p03-foundations/numerical-audit.json',JSON.stringify({generatedAt:new Date().toISOString(),scope:'Structural validation and numerical regression; not source certification. Tolerances are regression tolerances, not permitted operational errors.',reports},null,2)+'\n');
 console.log('P03 source coverage, 37 booklet cases, 27 worked-example comparisons and corrected apples regression passed.');
}finally{await server.close();}
