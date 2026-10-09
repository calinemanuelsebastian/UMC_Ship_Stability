import type {ShipModelPackage} from '../domain/ship-model';
import {shipResourceUrl} from '../domain/ship-resource';
import {sharedResults} from '../calculations/shared-results';
import {parseTrimmedTable,validateTrimmedTableShip} from './trimmed-table';
export function loadTrimmedTable(ship:ShipModelPackage){
 return sharedResults.read(ship,'trim-table',null,async s=>{
  const resource=s.manifest.resources.find(r=>r.kind==='hydrostatics.trimmed-table');
  if(!resource?.path)throw new Error('No compatible trimmed table is supplied.');
  const response=await fetch(shipResourceUrl(s,resource.path));if(!response.ok)throw new Error('Could not load trimmed table.');
  const table=parseTrimmedTable(await response.json());validateTrimmedTableShip(table,s);return table;
 });
}
