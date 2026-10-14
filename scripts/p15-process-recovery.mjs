// Isolated OS-process interruption of the production journal queue with a durable
// file adapter. This is NOT a browser/IndexedDB or OS power-loss certification.
import {fork} from 'node:child_process';import {once} from 'node:events';import {mkdtemp,rm,readFile} from 'node:fs/promises';import {readFileSync,writeFileSync,renameSync,existsSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';import assert from 'node:assert/strict';import {createServer} from './test-server.mjs';
if(process.argv[2]==='child'){
 const file=process.argv[3],server=await createServer({server:{middlewareMode:true},appType:'custom'});
 const {queueRecoveryWrite}=await server.ssrLoadModule('/src/app/recovery.ts');
 let values=existsSync(file)?JSON.parse(readFileSync(file,'utf8')):{};
 function commit(){writeFileSync(file+'.tmp',JSON.stringify(values),{flush:true});renameSync(file+'.tmp',file);}
 const storage={getItem:k=>values[k]??null,setItem:(k,v)=>{values[k]=v;commit()},removeItem:k=>{delete values[k];commit()}};
 const entry=n=>({key:'draft:fixture:isolated',model:'fixture',plan:{kind:'recovery-plan',version:1,id:'isolated',name:'Revision '+n,voyage:'P15',model:'fixture',savedAt:`2026-10-14T12:00:0${n}Z`,state:{scenario:'loading',manualMode:'displacement',manual:{},density:1.025,weights:[]}}});
 await queueRecoveryWrite(Promise.resolve(),storage,entry(1),async record=>{writeFileSync(file+'.db',JSON.stringify(record),{flush:true});});
 const stalled=queueRecoveryWrite(Promise.resolve(),storage,entry(2),()=>new Promise(()=>{}));
 queueRecoveryWrite(stalled,storage,entry(3),async()=>{});process.send('checkpointed');setInterval(()=>{},1000);
}else{
 const dir=await mkdtemp(join(tmpdir(),'umc-p15-process-'));let child;
 try{
  const file=join(dir,'journal.json');child=fork(new URL(import.meta.url),['child',file],{stdio:['ignore','ignore','inherit','ipc']});
  await Promise.race([once(child,'message'),once(child,'exit').then(()=>{throw new Error('Child exited before checkpoint')}),new Promise((_,reject)=>{const t=setTimeout(()=>reject(new Error('Child timeout')),30000);t.unref();})]);
  const exit=once(child,'exit');child.kill('SIGKILL');const [,signal]=await exit;assert.equal(signal,'SIGKILL');
  const server=await createServer({server:{middlewareMode:true},appType:'custom'});try{const {readPlanRecords}=await server.ssrLoadModule('/src/app/recovery.ts');const journal=Object.values(JSON.parse(await readFile(file,'utf8'))).map(v=>JSON.parse(v));const db=JSON.parse(await readFile(file+'.db','utf8'));const recovered=readPlanRecords([db,...journal],'fixture',[]);assert.equal(recovered.drafts[0].plan.name,'Revision 3');assert.equal(db.plan.name,'Revision 1');console.log('PASS: actual SIGKILL; last confirmed database adapter revision 1 retained; queued revision 3 recovered from journal. File adapter only, browser crash remains unverified.');}finally{await server.close();}
 }finally{if(child&&!child.killed)child.kill('SIGKILL');await rm(dir,{recursive:true,force:true});}
}
