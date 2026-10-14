import type {DunnagePattern} from './dunnage';
import {dunnageMassTonnes} from './dunnage-materials';
import {parseMaterialProperties} from './material-properties';
export type SupportTemplate={name:string;settings:DunnagePattern};
export const supportTemplateKey='umc-support-templates-v1';
export function parseSupportTemplate(raw:unknown):SupportTemplate{
 const r=raw as SupportTemplate,s=r?.settings;
 if(!r||typeof r.name!=='string'||!r.name.trim()||r.name.length>120||!s||typeof s.material!=='string'||!s.material.trim()||s.material.length>120||!['calculated','manual'].includes(s.massMode)||!Number.isInteger(s.count)||s.count<1||s.count>100||!Number.isFinite(s.gap)||s.gap<0||!['x','y'].includes(s.direction)||![s.length,s.width,s.thickness].every(v=>v>0&&v<=1000)||!Number.isFinite(s.mass)||s.mass<=0)throw new Error('Invalid support template.');
 const calculated=dunnageMassTonnes(s.length,s.width,s.thickness,s.densityKgM3)*s.count;
 if(s.massMode==='calculated'&&Math.abs(calculated-s.mass)>Math.max(1,calculated)*1e-8)throw new Error('Support template mass does not match volume and density.');
 const properties=s.properties?parseMaterialProperties(s.properties):undefined;
 // A support preset is a member pattern. A complete frame is saved as a selected assembly.
 return {name:r.name.trim(),settings:{material:s.material,length:s.length,width:s.width,thickness:s.thickness,densityKgM3:s.densityKgM3,massMode:s.massMode,mass:s.mass,count:s.count,gap:s.gap,direction:s.direction,...(properties?{properties}:{})}};
}
export function decodeSupportTemplates(json:string){
 if(json.length>1_000_000)throw new Error('Support template library exceeds 1 MB.');
 const r=JSON.parse(json);if(r?.format!=='umc-support-templates'||r.version!==1||!Array.isArray(r.templates)||r.templates.length>200)throw new Error('Unsupported support template library. Expected version 1.');return r.templates.map(parseSupportTemplate) as SupportTemplate[];
}
export function encodeSupportTemplates(templates:SupportTemplate[]){const json=JSON.stringify({format:'umc-support-templates',version:1,templates:templates.map(parseSupportTemplate)});decodeSupportTemplates(json);return json;}
