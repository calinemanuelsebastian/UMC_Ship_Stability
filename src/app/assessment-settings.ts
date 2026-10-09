import {createContext,useContext,type Dispatch,type SetStateAction} from 'react';
import {calculationKey} from '../core/calculations/shared-results';
export type WeatherSettings={conditionKey:string;profile:string;values:{lwl:string;cb:string;bilge:string;deck:string;flood:string};estimatePort:boolean;inputSource:string};
export type AssessmentSettings={weather?:WeatherSettings;draft?:{conditionKey:string;value?:number}};
export const emptyWeatherValues={lwl:'',cb:'',bilge:'',deck:'',flood:''};
export function assessmentKey(i:{displacementTonnes?:number;lcg?:number;vcg?:number;tcg?:number;freeSurfaceMomentTransverse?:number;waterDensity?:number;longitudinalFsm?:number}){return calculationKey([i.displacementTonnes,i.lcg,i.vcg,i.tcg,i.freeSurfaceMomentTransverse,i.waterDensity,i.longitudinalFsm]);}
export function parseAssessmentSettings(raw:unknown):AssessmentSettings{
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new Error('Invalid assessment settings.');
 const d=raw as AssessmentSettings;const out:AssessmentSettings={};
 const key=(v:unknown)=>typeof v==='string'&&v.length>0&&v.length<3000;
 if(d.weather!==undefined){const w=d.weather;if(!w||!key(w.conditionKey)||typeof w.profile!=='string'||w.profile.length>200||typeof w.estimatePort!=='boolean'||typeof w.inputSource!=='string'||w.inputSource.length>4000||!w.values)throw new Error('Invalid weather settings.');const values={...emptyWeatherValues};for(const k of Object.keys(values) as (keyof typeof values)[]){const v=w.values[k];if(typeof v!=='string'||v.length>100||v.trim()!==''&&!Number.isFinite(Number(v)))throw new Error('Invalid weather input.');values[k]=v;}out.weather={conditionKey:w.conditionKey,profile:w.profile,values,estimatePort:w.estimatePort,inputSource:w.inputSource};}
 if(d.draft!==undefined){if(!d.draft||!key(d.draft.conditionKey)||d.draft.value!==undefined&&(!Number.isFinite(d.draft.value)||d.draft.value<=0))throw new Error('Invalid assessment draft.');out.draft={conditionKey:d.draft.conditionKey,value:d.draft.value};}
 return out;
}
export const AssessmentContext=createContext<{settings:AssessmentSettings;setSettings:Dispatch<SetStateAction<AssessmentSettings>>}>({settings:{},setSettings:()=>{}});
export const useAssessmentSettings=()=>useContext(AssessmentContext);
