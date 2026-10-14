import {parseScenario,readScenarioRecords,type SavedScenario} from './saved-scenarios';
export type VoyageBackup={format:'umc-voyage-inputs';version:1;model:string;exportedAt:string;conditions:SavedScenario[]};
export function parseVoyageBackup(raw:unknown,model:string):VoyageBackup{
 const r=raw as VoyageBackup;
 if(!r||r.format!=='umc-voyage-inputs'||r.version!==1||r.model!==model||!Array.isArray(r.conditions)||!r.conditions.length||r.conditions.length>100||typeof r.exportedAt!=='string'||!Number.isFinite(Date.parse(r.exportedAt)))throw new Error('Choose a version 1 voyage backup for this vessel revision. Import its ship package first if the vessel is missing.');
 const conditions=r.conditions.map(c=>parseScenario(c,model)),byId=new Map(conditions.map(c=>[c.id,c]));
 if(byId.size!==conditions.length)throw new Error('Duplicate condition identifier.');
 for(const entry of conditions){const seen=new Set<string>();let node:SavedScenario|undefined=entry;while(node){if(seen.has(node.id))throw new Error('Voyage parent cycle.');seen.add(node.id);const parent:string|undefined=node.voyageStage?.parentId;if(parent&&!byId.has(parent))throw new Error('Voyage backup is missing a parent condition. Export the complete library.');node=parent?byId.get(parent):undefined;}}
 return {format:r.format,version:1,model,exportedAt:r.exportedAt,conditions};
}
export function decodeVoyageBackup(json:string,model:string){if(json.length>25_000_000)throw new Error('Voyage backup exceeds 25 MB.');return parseVoyageBackup(JSON.parse(json),model);}
/** Caller holds the same Web Lock as individual scenario saves. One atomic write;
 * all incoming IDs are remapped together, preserving branches and local originals. */
export function importVoyageBackup(storage:Pick<Storage,'getItem'|'setItem'>,key:string,model:string,raw:unknown){
 const backup=parseVoyageBackup(raw,model),current=readScenarioRecords(storage,key,model);
 const ids=new Map(backup.conditions.map(c=>[c.id,crypto.randomUUID()]));
 const added=backup.conditions.map(c=>({...c,id:ids.get(c.id)!,...(c.voyageStage?{voyageStage:{...c.voyageStage,...(c.voyageStage.parentId?{parentId:ids.get(c.voyageStage.parentId)!}:{})}}:{})}));
 const records=[...current.records,...added];if(records.length>100)throw new Error('The library can hold up to 100 scenarios. Export and remove unneeded saved scenarios first.');
 const json=JSON.stringify(records);if(json.length>25_000_000)throw new Error('Saved scenario library exceeds 25 MB.');
 storage.setItem(key,json);return readScenarioRecords(storage,key,model);
}
