import type {autoDunnageBatch} from './auto-dunnage';
export type DunnageJobInput=Omit<Parameters<typeof autoDunnageBatch>[0],'id'>;
export type DunnageJobResult=ReturnType<typeof autoDunnageBatch>;
/** One disposable worker per job: cancellation releases its heap and stops computation. */
export function runDunnageJob(input:DunnageJobInput,signal:AbortSignal,create=()=>new Worker(new URL('./dunnage-worker.ts',import.meta.url),{type:'module'})):Promise<DunnageJobResult>{
 return new Promise((resolve,reject)=>{
  if(signal.aborted){reject(new DOMException('Cancelled','AbortError'));return;}
  let worker:Worker;try{worker=create();}catch(error){reject(error);return;}
  const cleanup=()=>{signal.removeEventListener('abort',cancel);worker.terminate();};
  const cancel=()=>{cleanup();reject(new DOMException('Cancelled','AbortError'));};
  signal.addEventListener('abort',cancel,{once:true});
  worker.onmessage=e=>{cleanup();if(e.data.error)reject(new Error(e.data.error));else resolve(e.data.result);};
  worker.onerror=()=>{cleanup();reject(new Error('Dunnage calculation failed. Your layout is unchanged.'));};
  try{worker.postMessage(input);}catch(error){cleanup();reject(error);}
 });
}
