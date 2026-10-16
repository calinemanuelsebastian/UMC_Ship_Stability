import {readFile,writeFile} from 'node:fs/promises';
import os from 'node:os';
import {createServer} from './test-server.mjs';
const server=await createServer({server:{middlewareMode:true},appType:'custom'});
try {
 const {parseStudyLibrary,studyGroups,studySample}=await server.ssrLoadModule('/src/visualization/documented-studies.ts');
 const text=await readFile('validation-references/reviewed-apples-vessel/documented-studies.json','utf8');
 const timings=[];let library;
 for(let i=0;i<25;i++){const start=performance.now();library=parseStudyLibrary(JSON.parse(text),'reviewed-apples-vessel');timings.push(performance.now()-start);}
 const start=performance.now();let samples=0;
 for(let n=0;n<100;n++)for(const c of library.cases){studyGroups(c);for(let i=0;i<c.trajectory.length;i++){studySample(c,i);samples++;}}
 timings.sort((a,b)=>a-b);
 const report={date:new Date().toISOString(),hardware:os.cpus()[0].model,node:process.version,bytes:Buffer.byteLength(text),cases:library.cases.length,parseAndValidate:{iterations:25,medianMs:timings[12],p95Ms:timings[23],maxMs:timings[24]},groupAndSample:{samples,totalMs:performance.now()-start},scope:'Local Node data pipeline only. Excludes network transfer, browser rendering, GPU frame rate and mobile hardware.'};
 await writeFile('docs/audits/vectis-coupled-data-search/study-performance.json',JSON.stringify(report,null,2)+'\n');console.log(report);
}finally{await server.close();}
