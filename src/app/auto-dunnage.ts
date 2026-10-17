import {fittedSeparator} from './fitted-support';
import {supportFrame,supportFrameGeometry} from './support-frame';
import {cargoBounds} from './cargo-layout';
import {CargoNeighbours} from './cargo-neighbours';
import {dunnageMembers} from './dunnage-arrangement';
import {dunnageJunctions,isClosedDunnageJunction,hasJunctionPair,indexDunnageFits} from './dunnage-junctions';
import {boundaryDunnageFits,permitsAutoDunnage,type DunnageFit} from './boundary-dunnage';
import {cargoGapPairs} from './cargo-gap-pairs';
import {dunnageGap,createDunnage,type DunnagePattern} from './dunnage';
import {dunnageMassTonnes} from './dunnage-materials';
import {cargoBottom,placeSupportedCargo} from './cargo-placement';
import type {CargoArea} from './cargo-layout';
import type {WeightDraft} from './loading-state';
export type DunnageDiagnostic={ids:string[];areaId?:string;reason:string;position?:DunnageFit};
/** Selected cargo scopes the operation, but neighbours remain available as gap boundaries. */
export function autoDunnageBatch({cargo,selection,areas,settings,maxGap,walls,id}:{cargo:WeightDraft[];selection:string[];areas:CargoArea[];settings:DunnagePattern;maxGap:number;walls:boolean;id:()=>string}){
 if(!Number.isFinite(maxGap)||maxGap<=0)throw new Error('Enter a positive maximum gap.');
 if(cargo.length>40000)throw new Error('This plan exceeds the 40,000-item limit, including support members.');
 const units=cargo.filter(w=>w.footprint&&w.footprint.kind!=='dunnage');
 const selected=new Set(selection),targeted=selection.length?units.filter(w=>selected.has(w.id)):units;
 if(settings.supportMode==='separators'||settings.supportMode==='racks'){
  const parts:WeightDraft[]=[],diagnostics:DunnageDiagnostic[]=[],affectedIds:string[]=[];
  const index=new CargoNeighbours(cargo);
  for(const w of targeted){try{
   if(w.footprint!.keepGapsClear||w.footprint!.markings?.hazard||w.footprint!.markings?.unNumber)throw new Error('Protected or dangerous cargo requires manual support review.');
   const area=areas.find(a=>a.id===w.footprint!.areaId);if(!area)throw new Error('No planning surface is available for this unit.');
   let region=cargoBounds(w)!;
   if(settings.supportMode==='racks'){const g=supportFrameGeometry([w],area,settings);region={xMin:g.x0,xMax:g.x1,yMin:g.y0,yMax:g.y1};}
   const near=index.query(region);
   const next=settings.supportMode==='separators'?[fittedSeparator(w,area,near,settings,id)]:supportFrame([w],area,near,{...settings,frameCopyCargo:false},id);
   if(cargo.length+parts.length+next.length>40000)throw new RangeError('This plan exceeds the 40,000-item limit, including support members.');
   parts.push(...next);for(const part of next)index.add(part);affectedIds.push(w.id);
  }catch(error){if(error instanceof RangeError)throw error;diagnostics.push({ids:[w.id],areaId:w.footprint!.areaId,reason:(error as Error).message});}}
  const massTonnes=parts.reduce((sum,w)=>sum+Number(w.massTonnes),0);
  const cg=massTonnes?{lcg:parts.reduce((s,w)=>s+Number(w.massTonnes)*Number(w.lcg),0)/massTonnes,tcg:parts.reduce((s,w)=>s+Number(w.massTonnes)*Number(w.tcg),0)/massTonnes,vcg:parts.reduce((s,w)=>s+Number(w.massTonnes)*Number(w.vcg),0)/massTonnes}:undefined;
  return {parts,diagnostics,affectedIds,massTonnes,solidMassTonnes:massTonnes,cg,skipped:diagnostics.length,reasons:[...new Set(diagnostics.map(d=>d.reason))],excluded:diagnostics.length,targetCount:targeted.length,eligibleCount:targeted.length};
 }
 const eligible=units.filter(permitsAutoDunnage),targets=targeted.filter(permitsAutoDunnage),targetIds=new Set(targets.map(w=>w.id));
 const diagnostics:DunnageDiagnostic[]=[];
 const candidates:{fit:DunnageFit;area:CargoArea;ids:string[];ceiling?:number}[]=[];
 for(const w of targeted.filter(w=>!permitsAutoDunnage(w)))diagnostics.push({ids:[w.id],areaId:w.footprint?.areaId,reason:w.footprint?.shape&&w.footprint.shape!=='box'?'Curved side contact needs a reviewed cradle or restraint. Use fitted separators only on flat top faces, or an independent rack.':w.footprint?.keepGapsClear?'Protected clearance: surrounding gaps remain open.':'Ventilation or specialist cargo: manual support review required.'});
 const touched=new Set<string>();

 const surface=(w:WeightDraft)=>areas.find(a=>a.id===w.footprint?.areaId);
 for(const [a,b] of cargoGapPairs(eligible,maxGap)){
  if(!targetIds.has(a.id)&&!targetIds.has(b.id))continue;
  const area=surface(a);touched.add(a.id);touched.add(b.id);if(area)candidates.push({fit:dunnageGap(a,b),area,ids:[a.id,b.id],ceiling:Math.min(cargoBottom(a)+a.footprint!.height,cargoBottom(b)+b.footprint!.height)});
 }
 if(walls)for(const w of targets){const area=surface(w);if(!area)continue;
  if(!settings.boundarySource?.trim()){diagnostics.push({ids:[w.id],areaId:area.id,reason:'Boundary support is unverified. Provide a source for the intended bearing surface.'});continue;}
  const fits=boundaryDunnageFits(w,area,maxGap);if(!fits.length)diagnostics.push({ids:[w.id],areaId:area.id,reason:'No eligible floor-level boundary gap; hatch edges and elevated boundaries are not inferred.'});
  for(const fit of fits){touched.add(w.id);candidates.push({fit,area,ids:[w.id],ceiling:cargoBottom(w)+w.footprint!.height});}
 }
 for(const w of targets)if(!touched.has(w.id))diagnostics.push({ids:[w.id],areaId:w.footprint?.areaId,reason:surface(w)?'No facing gap within the maximum width and overlapping height.':'No planning surface is available for this unit.'});
 const protectedUnits=units.filter(w=>!permitsAutoDunnage(w));
 const protectedIndex=new CargoNeighbours(protectedUnits);

 const neighbours=new CargoNeighbours(cargo);
 const parts:WeightDraft[]=[];const affectedIds=new Set<string>();let solidMassTonnes=0;let skipped=0;const reasons=new Set<string>();
 const place=(envelope:DunnageFit,area:CargoArea,ids:string[]=[],ceiling=Infinity)=>{const start=parts.length;try{
 if(envelope.z+settings.thickness>ceiling+1e-8)throw new Error('Spacer exceeds the shared cargo contact height.');
 const region={xMin:envelope.x-envelope.length/2,xMax:envelope.x+envelope.length/2,yMin:envelope.y-envelope.width/2,yMax:envelope.y+envelope.width/2};
 // A junction may border cargo outside the eligible pair. Never close its protected channel.
 if(protectedIndex.query({xMin:region.xMin-1e-7,xMax:region.xMax+1e-7,yMin:region.yMin-1e-7,yMax:region.yMax+1e-7}).some(w=>{const b=cargoBounds(w)!;return !!w.footprint&&w.footprint.areaId===area.id&&cargoBottom(w)<envelope.z+settings.thickness-1e-8&&cargoBottom(w)+w.footprint.height>envelope.z+1e-8&&b.xMax>=region.xMin-1e-8&&b.xMin<=region.xMax+1e-8&&b.yMax>=region.yMin-1e-8&&b.yMin<=region.yMax+1e-8;}))throw new Error('Protected clearance or specialist cargo contact.');

 for(const fit of dunnageMembers(envelope,settings)){
  if(cargo.length+parts.length>=40000)throw new RangeError('This plan exceeds the 40,000-item limit, including support members.');
  const existing=neighbours.query({xMin:fit.x-fit.length/2,xMax:fit.x+fit.length/2,yMin:fit.y-fit.width/2,yMax:fit.y+fit.width/2}).find(w=>{const b=cargoBounds(w);return w.footprint?.kind==='dunnage'&&w.footprint.areaId===area.id&&b&&Math.abs(cargoBottom(w)-fit.z)<1e-8&&Math.abs(w.footprint.height-settings.thickness)<1e-8&&Math.abs(b.xMin-(fit.x-fit.length/2))<1e-8&&Math.abs(b.xMax-(fit.x+fit.length/2))<1e-8&&Math.abs(b.yMin-(fit.y-fit.width/2))<1e-8&&Math.abs(b.yMax-(fit.y+fit.width/2))<1e-8;});
  if(existing)continue;
  const mass=dunnageMassTonnes(fit.length,fit.width,settings.thickness,settings.densityKgM3);
  const base=createDunnage({id:id(),area:{...area,supportRegions:undefined},areas,weights:[],length:fit.length,width:fit.width,thickness:settings.thickness,mass,material:settings.material,densityKgM3:settings.densityKgM3,massMode:'calculated',properties:settings.properties??(settings.boundarySource?.trim()?{source:settings.boundarySource,applicability:'Declared boundary bearing surface; capacity not evaluated',contact:'Geometric spacer'}:undefined),position:fit});
  const placed=placeSupportedCargo(base,[area],[...neighbours.query({xMin:fit.x-fit.length/2,xMax:fit.x+fit.length/2,yMin:fit.y-fit.width/2,yMax:fit.y+fit.width/2}),...parts.slice(start)],fit,Math.abs(fit.z-area.deckZ)>1e-8,false);
  if(Math.abs(cargoBottom(placed)-fit.z)>1e-8||Math.abs(Number(placed.lcg)-fit.x)>1e-8||Math.abs(Number(placed.tcg)-fit.y)>1e-8)throw new Error('Unsupported gap');
  if(settings.arrangement==='frame')placed.name=`${settings.material} · Dunnage member`;
  parts.push(placed);
 }
 if(parts.length===start)throw new Error('Already arranged: existing members retained, including intentional openings.');
 for(const id of ids)affectedIds.add(id);
 for(const part of parts.slice(start))neighbours.add(part);
 solidMassTonnes+=dunnageMassTonnes(envelope.length,envelope.width,settings.thickness,settings.densityKgM3);
 }catch(e){if(e instanceof RangeError)throw e;parts.splice(start);skipped++;reasons.add((e as Error).message);diagnostics.push({ids,areaId:area.id,position:envelope,reason:(e as Error).message});}};
 for(const {fit,area,ids,ceiling} of candidates)place(fit,area,ids,ceiling);
 // Candidate strips define the scoped network, including strips already present.
 // A junction is accepted only when actual existing/new dunnage covers all four sides.
 for(const area of areas){
  const scoped=candidates.filter(c=>c.area.id===area.id);
  if(!scoped.length)continue;
  const actual=[...cargo,...parts].filter(w=>w.footprint?.kind==='dunnage'&&w.footprint.areaId===area.id&&w.footprint.height>=settings.thickness-1e-8).map(w=>({length:w.footprint!.rotation===90?w.footprint!.width:w.footprint!.length,width:w.footprint!.rotation===90?w.footprint!.length:w.footprint!.width,x:Number(w.lcg),y:Number(w.tcg),z:cargoBottom(w)}));
  const scopedJunctions=dunnageJunctions(scoped.map(c=>c.fit),maxGap);
  const query=indexDunnageFits(actual);
  for(const fit of scopedJunctions){const near=query(fit).map(i=>actual[i]);if(hasJunctionPair(fit,near)&&isClosedDunnageJunction(fit,near))place(fit,area);else diagnostics.push({ids:[],areaId:area.id,position:fit,reason:'Junction left open: surrounding members do not form a closed connection.'});}
 }
 const mass=parts.reduce((sum,w)=>sum+Number(w.massTonnes),0);
 const cg=mass?{lcg:parts.reduce((sum,w)=>sum+Number(w.massTonnes)*Number(w.lcg),0)/mass,tcg:parts.reduce((sum,w)=>sum+Number(w.massTonnes)*Number(w.tcg),0)/mass,vcg:parts.reduce((sum,w)=>sum+Number(w.massTonnes)*Number(w.vcg),0)/mass}:undefined;
 return {diagnostics,cg,affectedIds:[...affectedIds],parts,massTonnes:parts.reduce((sum,w)=>sum+Number(w.massTonnes),0),solidMassTonnes,skipped,reasons:[...reasons],excluded:targeted.length-targets.length,targetCount:targeted.length,eligibleCount:targets.length};
}
