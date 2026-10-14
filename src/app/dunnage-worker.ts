import {autoDunnageBatch} from './auto-dunnage';
import type {DunnageJobInput} from './dunnage-job';
self.onmessage=(event:MessageEvent<DunnageJobInput>)=>{try{const result=autoDunnageBatch({...event.data,id:()=>crypto.randomUUID()});self.postMessage({result});}catch(error){self.postMessage({error:(error as Error).message});}};
