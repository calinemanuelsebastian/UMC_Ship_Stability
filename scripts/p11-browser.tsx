// Development-only fixture; does not read/write user plans or browser storage.
import {createRoot} from 'react-dom/client';
import {useState} from 'react';
import {AssessmentContext,parseAssessmentSettings,type AssessmentSettings} from '../src/app/assessment-settings';
import {WeatherAssessment} from '../src/components/weather-assessment';
import type {StabilityResult} from '../src/core/domain/stability-result';
import {WindAssessment} from '../src/components/wind-assessment';
import type {WeightDraft} from '../src/app/loading-state';
import manifest from '../validation-references/reviewed-apples-vessel/manifest.json';
import '../src/index.css';
const ship={manifest,baseUrl:'/built-in-ship-models/reviewed-apples-vessel/'};
export function Harness(){
 const [synthetic,setSynthetic]=useState(false);
 const [settings,setSettings]=useState<AssessmentSettings>({}),[saved,setSaved]=useState(''),[vcg,setVcg]=useState(4.647);
 const [weights,setWeights]=useState<WeightDraft[]>([{id:'test',name:'Test cargo',category:'cargo',massTonnes:'1',lcg:'50',tcg:'0',vcg:'11',freeSurfaceMomentTransverse:'0',footprint:{length:2,width:1,height:2,rotation:0,deckZ:10}}]);
 return <AssessmentContext.Provider value={{settings,setSettings,weights}}><main style={{maxWidth:1100,margin:'auto',padding:20}}><h1>P11 isolated workflow</h1><p>No saved plans are changed.</p><button onClick={()=>setSaved(JSON.stringify(settings))}>Save test settings</button><button disabled={!saved} onClick={()=>setSettings(parseAssessmentSettings(JSON.parse(saved)))}>Reopen test settings</button><button onClick={()=>setSettings({})}>Clear test settings</button><button onClick={()=>setWeights(weights.map(w=>({...w,footprint:{...w.footprint!,rotation:w.footprint!.rotation===0?90:0}})))}>Rotate test cargo</button><button onClick={()=>setVcg(vcg===4.647?4.8:4.647)}>Change loading KG</button><button onClick={()=>{setSynthetic(true);setSettings({weather:{conditionKey:'synthetic',profile:'synthetic',values:{lwl:'100',cb:'.7',bilge:'0',deck:'30',flood:'60'},portDeck:'30',portFlood:'60',inputSource:'Synthetic verification only',estimatePort:false}});}}>Show synthetic complete case</button>{synthetic?<WeatherAssessment conditionKey="synthetic" profileConfirmed profileSource={{id:'synthetic',resourcePath:'synthetic-test-only',pressureKgPerM2:504/9.81}} curve={{condition:{vcg:10,waterDensity:1.025},gmAtTrim:{correctedGm:1.504**2},points:Array.from({length:121},(_,i)=>{const heelDeg=i-60;return {heelDeg,kn:0,gz:0,gzCorrected:.05*heelDeg-.00001*heelDeg**3};})} as StabilityResult} steady={.1} draft={10} beam={20}/>:<WindAssessment ship={ship} inputs={{pending:false,displacementTonnes:13201.307,waterDensity:1.025,vcg,lcg:58.731,tcg:.004,freeSurfaceMomentTransverse:0,longitudinalFsm:0}}/>}</main></AssessmentContext.Provider>;
}
const root=import.meta.hot?.data.root??createRoot(document.getElementById('root')!);if(import.meta.hot)import.meta.hot.data.root=root;root.render(<Harness/>);
