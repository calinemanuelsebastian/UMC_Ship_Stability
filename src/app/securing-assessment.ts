import {CargoNeighbours} from './cargo-neighbours';
import {cargoBounds,fitsFloor,fitsArea,layoutIssues,type CargoArea} from './cargo-layout';
import type {WeightDraft} from './loading-state';
export const securingFields=['ax','ay','az','friction','forceX','forceY','forceHeight','x','y','z','length','width','bearingKPa'] as const;
export type SecuringValues=Record<typeof securingFields[number],string>;
export type Lashing={id:string;anchorId:string;material:string;source:string;msl:string;anchorMsl:string;cargoMsl:string;azimuth:string;elevation:string};
export type SupportRating={id:string;kind:'pad'|'brace'|'rack'|'beam';source:string;capacity:string;area:string;compression:string;span:string;width:string;depth:string;bending:string;shear:string;joint:string};
export type SecuringGroup={id:string;name:string;cargoIds:string[];vesselId:string;referenceStatus:'unverified'|'current'|'superseded';source:string;loadSharingSource:string;reviewKey:string;confirmed:boolean;unitised:boolean;values:SecuringValues;lashings:Lashing[];supports:SupportRating[]};
export type SecuringPlan={groups:SecuringGroup[]};
const number=(s:string|undefined)=>s?.trim()?Number(s):NaN;
export function securingReviewKey(weights:WeightDraft[],conditionKey:string,areas:CargoArea[]){return JSON.stringify([conditionKey,weights.map(w=>[w.id,w.massTonnes,w.lcg,w.tcg,w.vcg,w.footprint&&[w.footprint.length,w.footprint.width,w.footprint.height,w.footprint.rotation,w.footprint.deckZ,w.footprint.bottomZ,w.footprint.areaId,w.footprint.kind]]),areas]);}
export function emptySecuringGroup(vesselId:string):SecuringGroup{return {id:crypto.randomUUID(),name:'Securing group',cargoIds:[],vesselId,referenceStatus:'unverified',source:'',loadSharingSource:'',reviewKey:'',confirmed:false,unitised:false,values:Object.fromEntries(securingFields.map(k=>[k,''])) as SecuringValues,lashings:[],supports:[]};}
/** Preserve incomplete editable drafts, reject malformed/nonfinite imported values; never import verdicts. */
export function parseSecuringPlan(raw:unknown):SecuringPlan{
 const p=raw as SecuringPlan;
 const str=(v:unknown,max=4000)=>typeof v==='string'&&v.length<=max;
 const numeric=(v:unknown)=>str(v,100)&&(!(v as string).trim()||Number.isFinite(Number(v)));
 if(!p||!Array.isArray(p.groups)||p.groups.length>200)throw new Error('Invalid securing plan.');
 const ids=new Set<string>();
 return {groups:p.groups.map(g=>{
  if(!g||!str(g.id,120)||!g.id||ids.has(g.id)||!str(g.name,120)||!str(g.vesselId,200)||!['unverified','current','superseded'].includes(g.referenceStatus)||!str(g.source)||!str(g.loadSharingSource)||!str(g.reviewKey,8000000)||typeof g.confirmed!=='boolean'||typeof g.unitised!=='boolean'||!Array.isArray(g.cargoIds)||g.cargoIds.length>40000||g.cargoIds.some(id=>!str(id,200))||new Set(g.cargoIds).size!==g.cargoIds.length||!g.values||securingFields.some(k=>!numeric(g.values[k]))||!Array.isArray(g.lashings)||g.lashings.length>200||!Array.isArray(g.supports)||g.supports.length>1000)throw new Error('Invalid securing group.');
  ids.add(g.id);
  const lineIds=new Set<string>();const lashings=g.lashings.map(l=>{if(!l||!str(l.id,120)||!l.id||lineIds.has(l.id)||!str(l.anchorId,120)||!str(l.material,120)||!str(l.source)||['msl','anchorMsl','cargoMsl','azimuth','elevation'].some(k=>!numeric(l[k as keyof Lashing])))throw new Error('Invalid lashing.');lineIds.add(l.id);return {id:l.id,anchorId:l.anchorId,material:l.material,source:l.source,msl:l.msl,anchorMsl:l.anchorMsl,cargoMsl:l.cargoMsl,azimuth:l.azimuth,elevation:l.elevation};});
  const supportIds=new Set<string>();const supports=g.supports.map(r=>{if(!r||!str(r.id,200)||supportIds.has(r.id)||!['pad','brace','rack','beam'].includes(r.kind)||!str(r.source)||['capacity','area','compression','span','width','depth','bending','shear','joint'].some(k=>!numeric(r[k as keyof SupportRating])))throw new Error('Invalid support rating.');supportIds.add(r.id);return {id:r.id,kind:r.kind,source:r.source,capacity:r.capacity,area:r.area,compression:r.compression,span:r.span,width:r.width,depth:r.depth,bending:r.bending,shear:r.shear,joint:r.joint};});
  return {id:g.id,name:g.name,cargoIds:[...g.cargoIds],vesselId:g.vesselId,referenceStatus:g.referenceStatus,source:g.source,loadSharingSource:g.loadSharingSource,reviewKey:g.reviewKey,confirmed:g.confirmed,unitised:g.unitised,values:{...Object.fromEntries(securingFields.map(k=>[k,g.values[k]]))} as SecuringValues,lashings,supports};
 })};
}
export type SecuringCheck={label:string;demand?:number;capacity?:number;unit:string;status:'Within declared limit'|'Exceeds declared limit'|'Not assessed';reason?:string};
const check=(label:string,demand:number|undefined,capacity:number|undefined,unit:string,reason?:string):SecuringCheck=>({label,demand,capacity,unit,status:demand===undefined||capacity===undefined||!Number.isFinite(demand)||!Number.isFinite(capacity)?'Not assessed':demand>capacity+1e-9?'Exceeds declared limit':'Within declared limit',reason});
/** Conservative independent-axis screening, not a complete CSS Annex 13 implementation.
 * No pretension, downward-friction bonus or lashing tipping credit. CS=min(series MSL)/1.5.
 * Accelerations are supplied load-case envelopes; they are not inferred from a visual motion. */
export function assessSecuringGroup(g:SecuringGroup,weights:WeightDraft[],areas:CargoArea[],vesselId:string,reviewKey:string){
 const issues:string[]=[];const rows:SecuringCheck[]=[];
 const byId=new Map(weights.map(w=>[w.id,w])),items=g.cargoIds.map(id=>byId.get(id));
 if(g.vesselId!==vesselId)issues.push('The reference belongs to a different vessel.');
 if(/vectis isle|yzj2011-999/i.test(g.source)&&vesselId==='reviewed-apples-vessel')issues.push('The supplied Vectis Isle reference does not establish Vectis Castle applicability.');
 if(g.referenceStatus!=='current')issues.push('The reference has not been established as current and applicable.');
 if(g.referenceStatus==='superseded'||g.vesselId!==vesselId||(/vectis isle|yzj2011-999/i.test(g.source)&&vesselId==='reviewed-apples-vessel'))return {id:g.id,name:g.name,issues:[...issues,'Inapplicable or superseded limits are disabled.'],rows,status:'Incomplete assessment'};
 if(!g.source.trim())issues.push('Supply applicable vessel, acceleration, friction and contact references.');
 if(!g.confirmed||g.reviewKey!==reviewKey)issues.push('Review applicability for the current condition and layout.');
 if(items.length>1&&!g.unitised)issues.push('Multiple items require a documented rigid assembly and internal load path.');
 if(!items.length||items.some(w=>!w||!w.footprint||!cargoBounds(w)||[w.massTonnes,w.lcg,w.tcg,w.vcg].some(v=>!v.trim()||!Number.isFinite(+v))||+w.massTonnes<=0))return {id:g.id,name:g.name,issues:[...issues,'Select located cargo/supports with positive masses and valid centres of gravity.'],rows,status:'Incomplete assessment'};
 const valid=items as WeightDraft[],mass=valid.reduce((s,w)=>s+(+w.massTonnes),0);
 const cg={x:valid.reduce((s,w)=>s+(+w.massTonnes)*(+w.lcg),0)/mass,y:valid.reduce((s,w)=>s+(+w.massTonnes)*(+w.tcg),0)/mass,z:valid.reduce((s,w)=>s+(+w.massTonnes)*(+w.vcg),0)/mass};
 const v=Object.fromEntries(securingFields.map(k=>[k,number(g.values[k])])) as Record<typeof securingFields[number],number>;
 const basics=securingFields.filter(k=>k!=='bearingKPa').every(k=>Number.isFinite(v[k]))&&['ax','ay','az','friction','forceX','forceY','forceHeight'].every(k=>v[k as keyof typeof v]>=0)&&v.friction<=1&&v.length>0&&v.width>0&&cg.z>=v.z;
 if(!basics)return {id:g.id,name:g.name,mass,cg,issues:[...issues,'Complete nonnegative loads, friction (0–1) and positive rectangular contact dimensions.'],rows,status:'Incomplete assessment'};
 const contact={xMin:v.x-v.length/2,xMax:v.x+v.length/2,yMin:v.y-v.width/2,yMax:v.y+v.width/2};
 const baseRegions=valid.filter(w=>Math.abs((w.footprint!.bottomZ??w.footprint!.deckZ)-v.z)<1e-7).map(w=>cargoBounds(w)!);
 const contactCovered=baseRegions.length>0&&fitsArea({name:'Declared contact',...contact,deckZ:v.z,regions:baseRegions},contact);
 if(!contactCovered)issues.push('Declared full contact includes gaps or unsupported area; specify an engineered contact model.');
 const surface=areas.find(a=>Math.abs(a.deckZ-v.z)<1e-7&&fitsFloor(a,contact));
 if(!surface)issues.push('Contact is not on one continuous documented loading surface.');
 if(surface&&layoutIssues(valid,surface).length)issues.push('Resolve cargo geometry, overlap and surface errors before assessing the load path.');
 if(valid.some(w=>(w.footprint!.bottomZ??w.footprint!.deckZ)<v.z-1e-7))issues.push('Cargo or support lies below the declared contact plane.');
 if(!valid.some(w=>Math.abs((w.footprint!.bottomZ??w.footprint!.deckZ)-v.z)<1e-7))issues.push('The group has no element on the declared contact plane.');
 const panels=surface?.panels?.filter(p=>p.xMin<contact.xMax&&p.xMax>contact.xMin&&p.yMin<contact.yMax&&p.yMax>contact.yMin).map(p=>p.id)??[];
 if(panels.length>1)issues.push('Cargo spans hatch panels: individual reactions and panel capacities are not established.');
 const supportIndex=new CargoNeighbours(valid);
 if(valid.some(w=>{const bottom=w.footprint!.bottomZ??w.footprint!.deckZ,b=cargoBounds(w)!;return bottom>v.z+1e-7&&!supportIndex.query(b).some(other=>{const p=other.footprint!,a=cargoBounds(other)!;return other.id!==w.id&&Math.abs((p.bottomZ??p.deckZ)+p.height-bottom)<1e-7&&a.xMin<b.xMax&&a.xMax>b.xMin&&a.yMin<b.yMax&&a.yMax>b.yMin;});}))issues.push('An item has no touching support in this group.');
 const outside=valid.some(w=>{const b=cargoBounds(w)!;return b.xMin<contact.xMin-1e-7||b.xMax>contact.xMax+1e-7||b.yMin<contact.yMin-1e-7||b.yMax>contact.yMax+1e-7;});
 if(outside)issues.push('Cargo overhang requires a separately justified contact/load path.');
 // An unselected item over this contact may load the same supports. Do not silently omit it.
 if(weights.some(w=>!g.cargoIds.includes(w.id)&&w.footprint&&cargoBounds(w)&&cargoBounds(w)!.xMin<contact.xMax&&cargoBounds(w)!.xMax>contact.xMin&&cargoBounds(w)!.yMin<contact.yMax&&cargoBounds(w)!.yMax>contact.yMin&&(w.footprint.bottomZ??w.footprint.deckZ)>=v.z))issues.push('Other cargo shares this footprint: include it or resolve the load path.');
 const nMin=mass*(9.81-v.az),h=cg.z-v.z,fx=mass*v.ax+v.forceX,fy=mass*v.ay+v.forceY;
 if(nMin<=0)issues.push('Loss of contact/uplift is outside this screening method.');
 const anchors=new Set<string>();let lineMissing=false;
 const lines=g.lashings.map(l=>{
  const m=number(l.msl),a=number(l.anchorMsl),c=number(l.cargoMsl),alpha=number(l.elevation),beta=number(l.azimuth);
  const ok=[m,a,c,alpha,beta].every(Number.isFinite)&&m>0&&a>0&&c>0&&alpha>=0&&alpha<=90&&Math.abs(beta)<=360&&!!l.source.trim()&&!!l.anchorId.trim()&&!!l.material.trim()&&!anchors.has(l.anchorId);
  anchors.add(l.anchorId);if(!ok)lineMissing=true;
  const cs=ok?Math.min(m,a,c)/1.5:0,r=Math.PI/180;
  return {id:l.id,csKN:ok?cs:undefined,x:cs*Math.cos(alpha*r)*Math.cos(beta*r),y:cs*Math.cos(alpha*r)*Math.sin(beta*r),down:cs*Math.sin(alpha*r)};
 });
 if(lineMissing)issues.push('Missing/invalid lashing or attachment rating, source, direction, or reused anchor. No lashing credit applied.');
 if(g.lashings.length>1&&!g.loadSharingSource.trim()){lineMissing=true;issues.push('Multiple lashings require a compatible load-sharing/stiffness reference.');}
 const normal=Math.max(0,nMin),friction=normal*v.friction;
 for(const [axis,force,size,offset] of [['x',fx,v.length,cg.x-v.x],['y',fy,v.width,cg.y-v.y]] as const)for(const sign of [-1,1]){
  const restraint=lineMissing?undefined:lines.reduce((s,l)=>s+Math.max(0,-sign*l[axis]),0);
  rows.push(check(`Sliding ${axis}${sign>0?'+':'−'}`,force,nMin<=0?undefined:restraint===undefined?undefined:friction+restraint,'kN','No pretension or lashing-induced friction credit.'));
  const moment=mass*v[axis==='x'?'ax':'ay']*h+v[axis==='x'?'forceX':'forceY']*v.forceHeight;
  rows.push(check(`Tipping ${axis}${sign>0?'+':'−'}`,moment,nMin<=0?undefined:Math.max(0,normal*(size/2-sign*offset)),'kN·m','Gravity-only resistance; lashings receive no tipping credit.'));
 }
 const maximum=mass*(9.81+v.az)+lines.reduce((s,l)=>s+l.down,0);
 const eccentric=6*Math.abs(cg.x-v.x)/v.length+6*Math.abs(cg.y-v.y)/v.width;
 const mx=mass*v.ax*h+v.forceX*v.forceHeight,my=mass*v.ay*h+v.forceY*v.forceHeight;
 const fullContact=nMin>0&&eccentric+6*mx/(normal*v.length)+6*my/(normal*v.width)<=1+1e-9;
 const pressure=fullContact&&contactCovered&&!lineMissing&&g.lashings.length===0?maximum/(v.length*v.width)*(1+eccentric)+6*mx/(v.length*v.width*v.length)+6*my/(v.length*v.width*v.width):undefined;
 rows.push(check('Rectangular full-contact bearing',pressure,v.bearingKPa>0?v.bearingKPa:undefined,'kPa','Requires actual full rectangular contact. Partial lift, feet/runners, flexible contacts or lashing attachment moments need a separate model.'));
 for(const s of g.supports){
  const linked=valid.find(w=>w.id===s.id&&w.footprint?.kind==='dunnage');
  if(!linked||!s.source.trim()){issues.push('Support ratings require a selected dunnage element and applicable source.');rows.push(check('Support '+s.id,undefined,undefined,'kN'));continue;}
  const demand=s.kind==='brace'?Math.max(fx,fy):lineMissing?undefined:maximum;
  const cap=number(s.capacity);rows.push(check(`${s.kind} ${linked.name}`,demand,cap>0?cap:undefined,'kN','Full group demand on each support; no equal-sharing assumption.'));
  const joint=number(s.joint);if(s.kind!=='pad')rows.push(check('Joint '+linked.name,demand,joint>0?joint:undefined,'kN'));
  const area=number(s.area),compression=number(s.compression);
  if(area>linked.footprint!.length*linked.footprint!.width)issues.push('Declared support contact area exceeds its physical footprint.');
  if(s.kind!=='brace')rows.push(check('Crushing '+linked.name,demand!==undefined&&area>0?demand/area/1000:undefined,compression>0?compression:undefined,'MPa'));
  if(s.kind==='beam'){
   const span=number(s.span),b=number(s.width),d=number(s.depth),bending=number(s.bending),shear=number(s.shear),geometry=[span,b,d].every(n=>Number.isFinite(n)&&n>0);
   if(geometry&&(span>Math.max(linked.footprint!.length,linked.footprint!.width)||b>Math.min(linked.footprint!.length,linked.footprint!.width)||d>linked.footprint!.height||Math.abs(+linked.lcg-cg.x)>1e-7||Math.abs(+linked.tcg-cg.y)>1e-7))issues.push('Beam dimensions or central-load assumption conflict with the cargo geometry.');
   rows.push(check('Bending '+linked.name,demand!==undefined&&geometry?demand*span/4/(b*d*d/6)/1000:undefined,bending>0?bending:undefined,'MPa','Simply supported rectangular beam; full group point load at midspan.'));
   rows.push(check('Shear '+linked.name,demand!==undefined&&geometry?1.5*demand/(2*b*d)/1000:undefined,shear>0?shear:undefined,'MPa'));
  }
 }
 if(valid.some(w=>w.footprint?.kind==='dunnage'&&!g.supports.some(s=>s.id===w.id)))issues.push('Selected dunnage has no support-role/rating assessment.');
 return {id:g.id,name:g.name,mass,cg,panels,lines,issues,rows,status:rows.some(r=>r.status==='Exceeds declared limit')?'Exceeds declared limit':issues.length||rows.some(r=>r.status==='Not assessed')?'Incomplete assessment':'Screened within declared limits'};
}
export function assessSecuringPlan(plan:SecuringPlan,weights:WeightDraft[],areas:CargoArea[],vesselId:string,conditionKey:string){
 const key=securingReviewKey(weights,conditionKey,areas);
 const groups=plan.groups.map(g=>assessSecuringGroup(g,weights,areas,vesselId,key));
 const cargoUse=new Map<string,number>(),anchorUse=new Map<string,number>();
 for(const g of plan.groups){for(const id of g.cargoIds)cargoUse.set(id,(cargoUse.get(id)??0)+1);for(const l of g.lashings)if(l.anchorId)anchorUse.set(l.anchorId,(anchorUse.get(l.anchorId)??0)+1);}
 for(let j=0;j<groups.length;j++)if(plan.groups[j].cargoIds.some(id=>cargoUse.get(id)!>1)||plan.groups[j].lashings.some(l=>anchorUse.get(l.anchorId)!>1)){groups[j].issues.push('Cargo, supports or anchors are shared across groups; combined reactions are unresolved.');if(groups[j].status!=='Exceeds declared limit')groups[j].status='Incomplete assessment';}
 return {method:'Conservative independent-axis screening v1',groups,unassigned:weights.filter(w=>!cargoUse.has(w.id)).map(w=>w.id),longitudinalStrength:'Not assessed: validated weight/buoyancy distribution and current permissible limits are required.',scope:'Declared-input screening only; no ship-specific securing approval. Uniform surface loading, hatch reactions and hull strength remain separate.'};
}
