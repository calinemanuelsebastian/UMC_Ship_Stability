import {parseShipBundle,type ShipBundle,type PackageFile} from './ship-package';
export type ShipDetails={name:string;id:string;lbp:string;beam:string;depth:string;draft:string;density:string;mass:string;lcg:string;vcg:string;tcg:string};
export type HoldDraft={name:string;xMin:string;xMax:string;yMin:string;yMax:string;deckZ:string;clearHeight:string};
export type EditorAttachment={kind:string;path:string;file:PackageFile};
export const emptyShipDetails:ShipDetails={name:'',id:'',lbp:'',beam:'',depth:'',draft:'',density:'1.025',mass:'',lcg:'',vcg:'',tcg:'0'};
export function buildEditorPackage(details:ShipDetails,holds:HoldDraft[],attachments:EditorAttachment[]):ShipBundle{
 if(!attachments.some(a=>a.kind==='hydrostatics.upright-table'))throw new Error('Attach the upright hydrostatics CSV before reviewing.');
 const number=(value:string,label:string)=>{if(!value.trim()||!Number.isFinite(Number(value)))throw new Error(`${label}: enter a finite number.`);return Number(value);};
 const n=(key:Exclude<keyof ShipDetails,'name'|'id'>)=>number(details[key],key);
 if(n('mass')<=0)throw new Error('Lightship mass must be positive.');
 const weight={id:'lightship',name:'Lightship',massTonnes:n('mass'),lcg:n('lcg'),vcg:n('vcg'),tcg:n('tcg')};
 const bundle:ShipBundle={format:'umc-ship-package',version:1,manifest:{schemaVersion:'1.0.0',id:details.id.trim(),name:details.name.trim(),version:'1.0.0',units:{length:'m',mass:'t',density:'t/m3',angle:'deg'},coordinateSystem:{origin:'Aft perpendicular, centreline, baseline',longitudinalOriginFromAP:0,amidshipsX:n('lbp')/2,xPositive:'forward',yPositive:'starboard',zPositive:'up'},principalDimensions:{lbp:n('lbp'),beam:n('beam'),mouldedDepth:n('depth')},defaultCondition:{draft:n('draft'),waterDensity:n('density'),lcg:weight.lcg,vcg:weight.vcg,tcg:weight.tcg},resources:[{id:'lightship',kind:'loading.weights',path:'editor-lightship.json',config:{fixedWeightIds:['lightship']}},{id:'display',kind:'visualization.schematic-cargo-hull'}]},files:{'editor-lightship.json':{encoding:'utf8',data:JSON.stringify([weight])}}};
 if(holds.length)bundle.manifest.resources.push({id:'cargo-surfaces',kind:'loading.cargo-surfaces',config:{surfaces:holds.map((h,i)=>{const result:Record<string,unknown>={id:`hold-${i+1}`,name:h.name.trim()};if(!result.name)throw new Error('Name each cargo space.');for(const k of ['xMin','xMax','yMin','yMax','deckZ','clearHeight'] as const)result[k]=number(h[k],`${h.name} ${k}`);if(Number(result.clearHeight)<=0)throw new Error('Cargo clear height must be positive.');return result;})}});
 for(const a of attachments){if(bundle.files[a.path])throw new Error(`Duplicate file name: ${a.path}`);bundle.files[a.path]=a.file;if(a.kind)bundle.manifest.resources.push({id:`resource-${bundle.manifest.resources.length}`,kind:a.kind,path:a.path});}
 return parseShipBundle(bundle);
}
