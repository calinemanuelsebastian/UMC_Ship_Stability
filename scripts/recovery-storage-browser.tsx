// Explicit disposable browser fixture; not a production entry or browser injection.
import {createRoot} from 'react-dom/client';
import {useState} from 'react';
import {planStorage} from '../src/app/cargo-plans';
import {queueRecoveryWrite,readPlanRecords,readRecoveryJournals,recoveryPrefix} from '../src/app/recovery';
import type {PlanRecord} from '../src/app/cargo-plans';
export function Harness(){
 const [status,setStatus]=useState('Ready. Each run uses a unique synthetic model; user records are not touched.');
 const [busy,setBusy]=useState(false);
 async function run(){setBusy(true);const model='recovery-browser-check-'+crypto.randomUUID(),key='draft:'+model;const checks:string[]=[];
 const record=(name:string):PlanRecord=>({key,model,plan:{kind:'recovery-plan',version:1,id:model,name,voyage:'Synthetic test',model,savedAt:new Date().toISOString(),state:{scenario:'loading',manualMode:'displacement',manual:{},density:1.025,weights:[]}}});
 const ensure=(ok:boolean,message:string)=>{if(!ok)throw new Error(message);checks.push('PASS: '+message);};
 try{
  const old=record('Committed original');await queueRecoveryWrite(Promise.resolve(),localStorage,old,r=>planStorage('put',r));
  ensure((await planStorage('read')).some(r=>r.key===key&&r.plan.name===old.plan.name),'real IndexedDB save/read');
  let release!:()=>void;const stalled=new Promise<void>(r=>{release=r});
  const pending=queueRecoveryWrite(stalled,localStorage,record('Latest pending'),r=>planStorage('put',r));
  const recovered=readPlanRecords([...(await planStorage('read')),...readRecoveryJournals(localStorage).records],model,[]);
  ensure(recovered.drafts[0]?.plan.name==='Latest pending','pending journal wins over old database record');release();await pending;
  ensure(localStorage.getItem(recoveryPrefix+key)===null,'journal removed only after database commit');
  try{await queueRecoveryWrite(Promise.resolve(),localStorage,record('Failed database fallback'),async()=>{throw new Error('Injected database failure')});}catch{/* expected */}
  ensure(JSON.parse(localStorage.getItem(recoveryPrefix+key)!).plan.name==='Failed database fallback','injected database failure retains real localStorage journal');
  const denied={getItem:localStorage.getItem.bind(localStorage),removeItem:localStorage.removeItem.bind(localStorage),setItem(){throw new DOMException('Injected quota','QuotaExceededError')}};
  await queueRecoveryWrite(Promise.resolve(),denied,record('Journal quota fallback'),r=>planStorage('put',r));
  ensure((await planStorage('read')).some(r=>r.key===key&&r.plan.name==='Journal quota fallback'),'injected journal quota still permits real IndexedDB commit');
  localStorage.setItem(recoveryPrefix+key,'{broken');
  const fallback=readRecoveryJournals(localStorage),valid=readPlanRecords([...(await planStorage('read')),...fallback.records],model,[]);
  ensure(fallback.damaged>0&&valid.drafts[0]?.plan.name==='Journal quota fallback','corrupt journal does not hide valid database draft');
  const named={...record('Named original'),key:'plan:'+model,plan:{...record('Named original').plan,kind:'cargo-plan' as const}};await planStorage('put',named,undefined,null);
  let conflict=false;try{await planStorage('put',{...named,plan:{...named.plan,name:'Stale overwrite'}},undefined,'2000-01-01T00:00:00Z');}catch{conflict=true;}
  ensure(conflict&&(await planStorage('read')).find(r=>r.key===named.key)?.plan.name==='Named original','stale expected revision rejects overwrite in real IndexedDB');
  setStatus(checks.join('\n')+'\nNo browser process crash, physical quota exhaustion or competing-tab scheduling was simulated.');
 }catch(e){setStatus(checks.join('\n')+'\nFAIL: '+String(e));}finally{setBusy(false);}
 }
 return <main><h1>Isolated browser storage checks</h1><button disabled={busy} onClick={run}>Run disposable storage checks</button><pre role="status">{status}</pre></main>;
}
createRoot(document.getElementById('root')!).render(<Harness/>);
