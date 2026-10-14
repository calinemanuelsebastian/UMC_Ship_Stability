import {parseSecuringPlan,type SecuringPlan} from './securing-assessment';
import {createContext,useContext,type Dispatch,type SetStateAction} from 'react';
import {calculationKey} from '../core/calculations/shared-results';
import type {WeightDraft} from './loading-state';
export type WeatherSettings={conditionKey:string;profile:string;layoutKey?:string;profileConfirmed?:boolean;direction?:'starboard'|'port';portDeck?:string;portFlood?:string;bilgeType?:'keels'|'round'|'sharp';values:{lwl:string;cb:string;bilge:string;deck:string;flood:string};estimatePort:boolean;inputSource:string};
export type AssessmentSettings={securing?:SecuringPlan;intact?:{conditionKey:string;starboard:string;port:string;source:string};weather?:WeatherSettings;draft?:{conditionKey:string;value?:number}};
export const emptyWeatherValues={lwl:'',cb:'',bilge:'',deck:'',flood:''};
export function assessmentKey(i:{displacementTonnes?:number;lcg?:number;vcg?:number;tcg?:number;freeSurfaceMomentTransverse?:number;waterDensity?:number;longitudinalFsm?:number}){return calculationKey([i.displacementTonnes,i.lcg,i.vcg,i.tcg,i.freeSurfaceMomentTransverse,i.waterDensity,i.longitudinalFsm]);}
export function parseAssessmentSettings(raw:unknown):AssessmentSettings{
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new Error('Invalid assessment settings.');
 const d=raw as AssessmentSettings;const out:AssessmentSettings={};
 if(d.securing!==undefined)out.securing=parseSecuringPlan(d.securing);
 const key=(v:unknown)=>typeof v==='string'&&v.length>0&&v.length<3000;
 if(d.intact!==undefined){const v=d.intact;if(!v||!key(v.conditionKey)||typeof v.source!=='string'||v.source.length>4000||[v.starboard,v.port].some(a=>typeof a!=='string'||a.length>100||a.trim()!==''&&(!Number.isFinite(Number(a))||Number(a)<=0||Number(a)>90)))throw new Error('Invalid intact flooding limit.');out.intact={conditionKey:v.conditionKey,starboard:v.starboard,port:v.port,source:v.source};}
 if(d.weather!==undefined){const w=d.weather;if(!w||!key(w.conditionKey)||typeof w.profile!=='string'||w.profile.length>200||typeof w.estimatePort!=='boolean'||typeof w.inputSource!=='string'||w.inputSource.length>4000||!w.values)throw new Error('Invalid weather settings.');const values={...emptyWeatherValues};for(const k of Object.keys(values) as (keyof typeof values)[]){const v=w.values[k];if(typeof v!=='string'||v.length>100||v.trim()!==''&&!Number.isFinite(Number(v)))throw new Error('Invalid weather input.');values[k]=v;}if(w.direction!==undefined&&!['starboard','port'].includes(w.direction)||w.bilgeType!==undefined&&!['keels','round','sharp'].includes(w.bilgeType)||w.profileConfirmed!==undefined&&typeof w.profileConfirmed!=='boolean'||w.layoutKey!==undefined&&(typeof w.layoutKey!=='string'||w.layoutKey.length>4000000)||[w.portDeck,w.portFlood].some(v=>v!==undefined&&(typeof v!=='string'||v.length>100||v.trim()!==''&&(!Number.isFinite(Number(v))||Number(v)<=0||Number(v)>90))))throw new Error('Invalid directional weather settings.');out.weather={...(w.layoutKey===undefined?{}:{layoutKey:w.layoutKey}),...(w.profileConfirmed===undefined?{}:{profileConfirmed:w.profileConfirmed}),...(w.direction===undefined?{}:{direction:w.direction}),...(w.portDeck===undefined?{}:{portDeck:w.portDeck}),...(w.portFlood===undefined?{}:{portFlood:w.portFlood}),...(w.bilgeType===undefined?{}:{bilgeType:w.bilgeType}),conditionKey:w.conditionKey,profile:w.profile,values,estimatePort:w.estimatePort,inputSource:w.inputSource};}
 if(d.draft!==undefined){if(!d.draft||!key(d.draft.conditionKey)||d.draft.value!==undefined&&(!Number.isFinite(d.draft.value)||d.draft.value<=0))throw new Error('Invalid assessment draft.');out.draft={conditionKey:d.draft.conditionKey,value:d.draft.value};}
 return out;
}
export const AssessmentContext=createContext<{conditionKey?:string;weights?:WeightDraft[];settings:AssessmentSettings;setSettings:Dispatch<SetStateAction<AssessmentSettings>>}>({settings:{},setSettings:()=>{}});
export const useAssessmentSettings=()=>useContext(AssessmentContext);

export function intactLimitsFor(settings:AssessmentSettings,conditionKey:string){
 const v=settings.intact;if(!v||v.conditionKey!==conditionKey||!v.source.trim())return {};
 const side=(text:string)=>text.trim()!==''&&Number.isFinite(Number(text))&&Number(text)>0&&Number(text)<=90?{angleDeg:Number(text),source:v.source}:undefined;
 return {starboard:side(v.starboard),port:side(v.port)};
}
