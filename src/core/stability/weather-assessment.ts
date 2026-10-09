import type {StabilityResult} from '../domain/stability-result';
import {gustLever,weatherRoll,weatherAreas} from './weather-criterion';
import {steadyWindEquilibrium} from './wind-equilibrium';
export type WeatherInputs={steady:number;draft:number;beam:number;lwl?:number;cb?:number;bilgeArea?:number;deckAngle?:number;floodAngle?:number};
export type WeatherCheck={id:string;label:string;unit:string;value?:number;limit?:number;margin?:number;status:'Meets numerical limit'|'Outside numerical limit'|'Insufficient data';reason:string};
const message=(e:unknown)=>e instanceof Error?e.message:String(e);
/** One numerical assessment for the table, chart and export. No time stepping or mesh work. */
export function assessWeather(curve:StabilityResult,i:WeatherInputs){
 const missing:string[]=[];
 if(!Number.isFinite(i.lwl)||i.lwl!<=0)missing.push('Waterline length LWL (m)');
 if(!Number.isFinite(i.cb)||i.cb!<=0||i.cb!>1)missing.push('Block coefficient CB (0–1)');
 if(!Number.isFinite(i.bilgeArea)||i.bilgeArea!<0)missing.push('Bilge-keel area (m²)');
 const deckValid=Number.isFinite(i.deckAngle)&&i.deckAngle!>0&&i.deckAngle!<=180;
 const floodValid=Number.isFinite(i.floodAngle)&&i.floodAngle!>0&&i.floodAngle!<=180;
 if(!deckValid)missing.push('Deck-edge immersion angle (°)');
 if(!floodValid)missing.push('Downflooding limit (°)');
 let eq:ReturnType<typeof steadyWindEquilibrium>|undefined,roll:ReturnType<typeof weatherRoll>|undefined,areas:ReturnType<typeof weatherAreas>|undefined,gust:number|undefined;
 let equilibriumError='',rollError='',areaError='';
 try{gust=gustLever(i.steady);eq=steadyWindEquilibrium(curve,i.steady);}catch(e){equilibriumError=message(e);}
 const rollMissing=missing.filter(x=>!['Deck-edge immersion angle (°)','Downflooding limit (°)'].includes(x));
 if(rollMissing.length)rollError='Missing or invalid: '+rollMissing.join(', ');
 else try{roll=weatherRoll({beam:i.beam,draft:i.draft,lwl:i.lwl!,cb:i.cb!,bilgeArea:i.bilgeArea!,kg:curve.condition.vcg,gm:curve.gmAtTrim?.correctedGm??NaN});}catch(e){rollError=message(e);}
 if(!floodValid)areaError='Enter a valid downflooding limit for the current condition.';
 else if(!roll)areaError=rollError;
 else try{areas=weatherAreas(curve,i.steady,roll.angle,i.floodAngle!);}catch(e){areaError=message(e);}
 const limit=deckValid?Math.min(16,.8*i.deckAngle!):undefined;
 const angle=eq?.angle;
 const heelMargin=angle===undefined||limit===undefined?undefined:limit-Math.abs(angle);
 const status=(margin:number|undefined):WeatherCheck['status']=>margin===undefined?'Insufficient data':margin>=0?'Meets numerical limit':'Outside numerical limit';
 const checks:WeatherCheck[]=[
  {id:'heel',label:'Steady-wind heel',unit:'°',value:angle===undefined?undefined:Math.abs(angle),limit,margin:heelMargin,status:status(heelMargin),reason:angle===undefined?equilibriumError||eq?.message||'Steady-wind equilibrium unavailable.':limit===undefined?'Enter a valid deck-edge immersion angle for the current condition.':'|φ₀| ≤ min(16°, 0.8 × deck-edge immersion angle).'},
  {id:'energy',label:'Gust and rolling energy balance',unit:'m·rad',value:areas?.b,limit:areas?.a,margin:areas?.margin,status:status(areas?.margin),reason:areas?'Area b ≥ area a over the fully covered integration interval.':areaError},
 ];
 return {checks,missing,eq,roll,areas,gust,limit,rollError,areaError,
  numericalStatus:checks.some(c=>c.status==='Outside numerical limit')?'Outside numerical limit':checks.some(c=>c.status==='Insufficient data')?'Insufficient data':'Meets numerical limit',
  basis:curve.derivedPort?'Includes symmetry-based port estimate':'Supplied GZ curve',
  scope:'Numerical weather checks for the selected profile and operator-supplied condition inputs. Profile applicability, input provenance and port flooding remain separate qualifications. No overall compliance verdict.'};
}
