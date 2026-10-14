// Development-only fixture. No user plans or browser storage are read or written.
import {createRoot} from 'react-dom/client';
import {useState} from 'react';
import {AssessmentContext,type AssessmentSettings} from '../src/app/assessment-settings';
import {StabilityCurves} from '../src/features/stability-curves';
import manifest from '../validation-references/reviewed-apples-vessel/manifest.json';
import '../src/index.css';
const ship={manifest,baseUrl:'/built-in-ship-models/reviewed-apples-vessel/'};
export function Harness(){const [settings,setSettings]=useState<AssessmentSettings>({}),[vcg,setVcg]=useState<number|undefined>(4.647);return <AssessmentContext.Provider value={{settings,setSettings}}><header><strong>P10 isolated verification · no saved plans changed</strong><button onClick={()=>setVcg(vcg===4.647?4.8:4.647)}>Change loading KG</button></header><StabilityCurves ship={ship} pending={false} readOnly waterDensity={1.025} displacementTonnes={13201.307} vcg={vcg} tcg={.004} lcg={58.731} freeSurfaceMomentTransverse={0} longitudinalFsm={0} onDisplacementChange={()=>{}} onVcgChange={setVcg} onTcgChange={()=>{}} onFreeSurfaceMomentChange={()=>{}}/></AssessmentContext.Provider>;}
const root=import.meta.hot?.data.root??createRoot(document.getElementById('root')!);if(import.meta.hot)import.meta.hot.data.root=root;root.render(<Harness/>);
