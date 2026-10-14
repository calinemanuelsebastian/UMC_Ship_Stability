// Disposable manual crash fixture. Never included in the production entry.
import {createRoot} from 'react-dom/client';
import {useState} from 'react';
import {planStorage, type PlanRecord} from '../src/app/cargo-plans';
import {queueRecoveryWrite,readPlanRecords,readRecoveryJournals,recoveryPrefix} from '../src/app/recovery';
const model='crash-inflight-20261014',key='draft:'+model;
const make=(latest:boolean):PlanRecord=>({key,model,plan:{kind:'recovery-plan',version:1,id:model,name:latest?'Pending revision 2':'Committed revision 1',voyage:'Disposable crash verification',model,savedAt:latest?'2026-10-14T17:00:02.000Z':'2026-10-14T17:00:01.000Z',state:{scenario:'loading',manualMode:'displacement',manual:{},density:latest?1.011:1.025,longitudinalFsm:latest?123:0,weights:[]}}});
const canonical=(value:unknown):string=>JSON.stringify(value,(_key,item)=>item&&typeof item==='object'&&!Array.isArray(item)?Object.fromEntries(Object.keys(item).sort().map(key=>[key,item[key]])):item);
const same=(a:unknown,b:unknown)=>canonical(a)===canonical(b);
// Keep a real write transaction active so the production write is blocked.
// No unload handlers: force termination must rely on the persisted journal.
async function blockWrites(){
 const db=await new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open('umc-cargo-plans',1);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
 const tx=db.transaction('plans','readwrite'),store=tx.objectStore('plans');
 const loop=()=>{const r=store.get(key);r.onsuccess=loop;};loop();
 tx.oncomplete=tx.onabort=()=>db.close();
 return tx;
}
export function CrashHarness(){
 const [status,setStatus]=useState('Ready. Use only the disposable Brave profile. Start once, force-quit the browser while PENDING is shown, reopen this exact URL, then Verify.');
 const [busy,setBusy]=useState(false);
 async function start(){setBusy(true);try{
  if((await planStorage('read')).some(r=>r.key===key)||localStorage.getItem(recoveryPrefix+key))throw new Error('Existing test data found; verify it instead of overwriting.');
  await planStorage('put',make(false));
  if(!same((await planStorage('read')).find(r=>r.key===key),make(false)))throw new Error('Baseline mismatch');
  const tx=await blockWrites();
  tx.addEventListener('complete',()=>setStatus('INVALID: blocker unexpectedly completed. Do not count this as a pending-write crash.'));
  tx.addEventListener('abort',()=>setStatus('INVALID: blocker aborted before browser termination.'));
  void queueRecoveryWrite(Promise.resolve(),localStorage,make(true),r=>planStorage('put',r)).then(()=>setStatus('INVALID: write completed before crash.')).catch(e=>setStatus('FAIL: '+String(e)));
  if(!same(JSON.parse(localStorage.getItem(recoveryPrefix+key)??'null'),make(true)))throw new Error('Pending journal mismatch');
  setStatus('PENDING — production queueRecoveryWrite has journaled revision 2. A live IndexedDB write transaction blocks the production planStorage write. Database baseline is revision 1. Force Quit this isolated Brave process now. Do not reload or close the tab normally.');
 }catch(e){setStatus('FAIL: '+String(e));setBusy(false);}}
 async function verify(){setBusy(true);try{
  const rows=await planStorage('read'),db=rows.find(r=>r.key===key),journal=readRecoveryJournals(localStorage).records;
  if(!same(db,make(false)))throw new Error('Database must still contain the old revision; otherwise pending-write crash was not demonstrated.');
  if(!journal.some(r=>same(r,make(true))))throw new Error('Latest pending journal did not survive.');
  const recovered=readPlanRecords([...rows,...journal],model,[]);
  if(recovered.damaged||!same(recovered.drafts[0]?.plan,make(true).plan))throw new Error('Production recovery merge did not return the complete latest record.');
  await queueRecoveryWrite(Promise.resolve(),localStorage,make(true),r=>planStorage('put',r));
  if(!same((await planStorage('read')).find(r=>r.key===key),make(true)))throw new Error('Recovered database commit mismatch');
  if(localStorage.getItem(recoveryPrefix+key)!==null)throw new Error('Journal not cleaned after successful recovery commit');
  setStatus('PASS: old database revision 1 survived.\nPASS: pending revision 2 journal survived abrupt termination.\nPASS: production parser/merge recovered the exact latest full record (density 1.011, longitudinal FSM 123).\nPASS: recovered revision committed through production storage.\nPASS: journal cleaned only after commit.\nScope: blocked pending database write after journaling; not pre-journal debounce or power loss.');
 }catch(e){setStatus('FAIL: '+String(e));}finally{setBusy(false);}}
 return <main style={{fontFamily:'system-ui',padding:24,maxWidth:900}}><h1>Pending-save crash check</h1><p>Disposable synthetic record; no operational vessel data. Keep this exact origin for restart.</p><button disabled={busy} onClick={start}>Start pending write</button>{' '}<button disabled={busy} onClick={verify}>Verify after crash</button><pre role="status" style={{whiteSpace:'pre-wrap',fontSize:18,lineHeight:1.6}}>{status}</pre></main>;
}
createRoot(document.getElementById('root')!).render(<CrashHarness/>);
