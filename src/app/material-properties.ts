/** Declared values are documentary data, not a computed securing assessment. */
export type MaterialProperties={source:string;applicability:string;contact:string;capacityKN?:number;frictionCoefficient?:number};
export function parseMaterialProperties(raw:unknown):MaterialProperties{
 const p=raw as MaterialProperties;
 if(!p||[p.source,p.applicability,p.contact].some(v=>typeof v!=='string'||v.length>500))throw new Error('Invalid material property notes.');
 if(p.capacityKN!==undefined&&(!Number.isFinite(p.capacityKN)||p.capacityKN<=0))throw new Error('Declared capacity must be positive (kN).');
 if(p.frictionCoefficient!==undefined&&(!Number.isFinite(p.frictionCoefficient)||p.frictionCoefficient<0||p.frictionCoefficient>2))throw new Error('Enter a documented friction coefficient between 0 and 2.');
 if((p.capacityKN!==undefined||p.frictionCoefficient!==undefined)&&(!p.source.trim()||!p.applicability.trim()))throw new Error('Capacity and friction require a source and validity conditions.');
 return {source:p.source,applicability:p.applicability,contact:p.contact,...(p.capacityKN===undefined?{}:{capacityKN:p.capacityKN}),...(p.frictionCoefficient===undefined?{}:{frictionCoefficient:p.frictionCoefficient})};
}
