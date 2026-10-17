import {useState} from 'react';
/** Keep the editing buffer separate from the last valid calculation value. */
export function CapacityNumber({value,onChange,zeroWhenEmpty=false,...props}:{value:number|undefined;onChange:(n:number|undefined)=>void;zeroWhenEmpty?:boolean;'aria-label':string;min:number;step:number|'any'}){
 const [draft,setDraft]=useState<string|null>(null);
 return <input {...props} type="number" value={draft??value??''} onFocus={e=>setDraft(e.currentTarget.value)} onChange={e=>{const raw=e.currentTarget.value;setDraft(raw);if(raw===''){if(!e.currentTarget.validity.badInput)onChange(zeroWhenEmpty?0:undefined);}else if(Number.isFinite(e.currentTarget.valueAsNumber))onChange(e.currentTarget.valueAsNumber);}} onBlur={()=>setDraft(null)}/>;
}
