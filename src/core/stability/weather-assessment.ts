import type {StabilityResult} from '../domain/stability-result';
import {gustLever,weatherRoll,weatherAreas} from './weather-criterion';
import {steadyWindEquilibrium} from './wind-equilibrium';
export type WeatherInputs={steady:number;draft:number;beam:number;lwl?:number;cb?:number;bilgeArea?:number;deckAngle?:number;floodAngle?:number;windwardFloodAngle?:number;bilgeType?:'keels'|'round'|'sharp'};
export type WeatherCheck={id:string;label:string;unit:string;value?:number;limit?:number;margin?:number;status:'Meets numerical limit'|'Outside numerical limit'|'Insufficient data';reason:string};
const message=(e:unknown)=>e instanceof Error?e.message:String(e);
/** One numerical assessment for the table, chart and export. No time stepping or mesh work. */
export function assessWeather(curve:StabilityResult,i:WeatherInputs){
 const missing:string[]=[];
 if(!Number.isFinite(i.lwl)||i.lwl!<=0)missing.push('Waterline length LWL (m)');
 if(!Number.isFinite(i.cb)||i.cb!<=0||i.cb!>1)missing.push('Block coefficient CB (0–1)');
 if((!i.bilgeType||i.bilgeType==='keels')&&(!Number.isFinite(i.bilgeArea)||i.bilgeArea!<0))missing.push('Bilge-keel area (m²)');
 const deckValid=Number.isFinite(i.deckAngle)&&i.deckAngle!>0&&i.deckAngle!<=90;
 const floodValid=Number.isFinite(i.floodAngle)&&i.floodAngle!>0&&i.floodAngle!<=90;
 if(!deckValid)missing.push('Deck-edge immersion angle (°)');
 if(!floodValid)missing.push('Downflooding limit (°)');
 let eq:ReturnType<typeof steadyWindEquilibrium>|undefined,roll:ReturnType<typeof weatherRoll>|undefined,areas:ReturnType<typeof weatherAreas>|undefined,gust:number|undefined;
 let equilibriumError='',rollError='',areaError='';
 try{gust=gustLever(i.steady);eq=steadyWindEquilibrium(curve,i.steady);}catch(e){equilibriumError=message(e);}
 const rollMissing=missing.filter(x=>!['Deck-edge immersion angle (°)','Downflooding limit (°)'].includes(x));
 if(rollMissing.length)rollError='Missing or invalid: '+rollMissing.join(', ');
 else try{roll=weatherRoll({beam:i.beam,draft:i.draft,lwl:i.lwl!,cb:i.cb!,bilgeArea:i.bilgeType&&i.bilgeType!=='keels'?0:i.bilgeArea!,bilgeType:i.bilgeType,kg:curve.condition.vcg,gm:curve.gmAtTrim?.correctedGm??NaN});}catch(e){rollError=message(e);}
 if(!floodValid)areaError='Enter a valid downflooding limit for the current condition.';
 else if(!roll)areaError=rollError;
 else try{areas=weatherAreas(curve,i.steady,roll.angle,i.floodAngle!);}catch(e){areaError=message(e);}
 if(areas&&i.windwardFloodAngle!==undefined&&(!Number.isFinite(i.windwardFloodAngle)||i.windwardFloodAngle<=0||i.windwardFloodAngle>90||areas.start<=-i.windwardFloodAngle)){areas=undefined;areaError='The windward roll reaches a flooding limit or its supplied limit is invalid.';}
 const limit=deckValid?Math.min(16,.8*i.deckAngle!):undefined;
 const angle=eq?.angle;
 const flooded=angle!==undefined&&((floodValid&&angle>=i.floodAngle!)||(Number.isFinite(i.windwardFloodAngle)&&i.windwardFloodAngle!>0&&angle<=-i.windwardFloodAngle!));
 const heelMargin=angle===undefined||limit===undefined||flooded?undefined:limit-Math.abs(angle);
 const status=(margin:number|undefined):WeatherCheck['status']=>margin===undefined?'Insufficient data':margin>=-1e-12?'Meets numerical limit':'Outside numerical limit';
 const checks:WeatherCheck[]=[
  {id:'heel',label:'Steady-wind heel',unit:'°',value:angle===undefined?undefined:Math.abs(angle),limit,margin:heelMargin,status:status(heelMargin),reason:flooded?'Steady-wind equilibrium reaches a declared flooding limit.':angle===undefined?equilibriumError||eq?.message||'Steady-wind equilibrium unavailable.':limit===undefined?'Enter a valid deck-edge immersion angle for the current condition.':'|φ₀| ≤ min(16°, 0.8 × deck-edge immersion angle).'},
  {id:'energy',label:'Gust and rolling energy balance',unit:'m·rad',value:areas?.b,limit:areas?.a,margin:areas?.margin,status:status(areas?.margin),reason:areas?'Area b ≥ area a over the fully covered integration interval.':areaError},
 ];
 return {checks,missing,eq,roll,areas,gust,limit,rollError,areaError,
  numericalStatus:checks.some(c=>c.status==='Outside numerical limit')?'Outside numerical limit':checks.some(c=>c.status==='Insufficient data')?'Insufficient data':'Meets numerical limit',
  basis:curve.derivedPort?'Includes symmetry-based port estimate':'Supplied GZ curve',
  scope:'Numerical weather checks for the selected profile and operator-supplied condition inputs. Profile applicability, input provenance and port flooding remain separate qualifications. No overall compliance verdict.'};
}

export function weatherDirection(curve:StabilityResult,direction:'starboard'|'port'):StabilityResult {
 if(direction==='starboard')return curve;
 return {...curve,downflooding:undefined,points:[...curve.points].reverse().map(p=>({...p,heelDeg:-p.heelDeg,kn:-p.kn,gz:-p.gz,gzCorrected:-p.gzCorrected}))};
}
/** Both directions use the same solver, with independent immersion limits. */
export function assessWeatherDirections(curve:StabilityResult,inputs:WeatherInputs,port:{deckAngle?:number;floodAngle?:number},evidence:{profileConfirmed:boolean;source:string}) {
 const starboard=assessWeather(curve,{...inputs,windwardFloodAngle:port.floodAngle});
 const portResult=assessWeather(weatherDirection(curve,'port'),{...inputs,deckAngle:port.deckAngle,floodAngle:port.floodAngle,windwardFloodAngle:Math.min(inputs.floodAngle??Infinity,curve.downflooding?.firstReachedAngle??Infinity)});
 const qualifications:string[]=[];
 if(!evidence.profileConfirmed)qualifications.push('Confirm that the selected silhouette includes the current ship and exposed cargo.');
 if(!evidence.source.trim())qualifications.push('Record the source of condition-specific roll and immersion inputs.');
 if(curve.derivedPort)qualifications.push('Port GZ is an educational symmetry estimate.');
 if(!Number.isFinite(port.floodAngle)||port.floodAngle!<=0||port.floodAngle!>90)qualifications.push('A port downflooding limit is required for windward rolling.');
 if(!Number.isFinite(inputs.floodAngle)||inputs.floodAngle!<=0||inputs.floodAngle!>90)qualifications.push('A starboard downflooding limit is required for windward rolling.');
 // Piecewise-linear estimates remain useful; disclose source resolution rather than densifying it.
 const maxStep=Math.max(0,...curve.points.slice(1).map((p,j)=>p.heelDeg-curve.points[j].heelDeg));
 if(maxStep>2)qualifications.push('GZ source spacing exceeds the app’s 2° assessment gate; energy and intersections remain interpolated estimates.');
 const results=[starboard,portResult];
 const status=results.some(r=>r.numericalStatus==='Outside numerical limit')?'Outside numerical limit':qualifications.length||results.some(r=>r.numericalStatus==='Insufficient data')?'Incomplete assessment':'Both directions meet numerical limits';
 return {starboard,port:portResult,status,qualifications,maxSourceStepDeg:maxStep,scope:'Numerical severe wind and rolling assessment; no overall compliance or approval verdict.'};
}
