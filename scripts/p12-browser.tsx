// Development-only test fixture; no user storage or saved plans are read/written.
import {createRoot} from 'react-dom/client';
import {useState} from 'react';
import {SecuringAssessment} from '../src/components/securing-assessment';
import {AssessmentContext,parseAssessmentSettings,type AssessmentSettings} from '../src/app/assessment-settings';
import {emptySecuringGroup,securingReviewKey} from '../src/app/securing-assessment';
import type {WeightDraft} from '../src/app/loading-state';
import manifest from '../validation-references/reviewed-apples-vessel/manifest.json';
import '../src/index.css';
const ship={manifest,baseUrl:'/built-in-ship-models/reviewed-apples-vessel/'};
const areas=[{id:'floor',name:'Synthetic floor',xMin:-20,xMax:20,yMin:-20,yMax:20,deckZ:0}];
const cargo:WeightDraft={id:'test-cargo',name:'Synthetic crate',category:'cargo',massTonnes:'10',lcg:'0',tcg:'0',vcg:'.5',freeSurfaceMomentTransverse:'0',footprint:{length:4,width:4,height:1,rotation:0,deckZ:0,areaId:'floor'}};
export function Harness(){
 const [weights,setWeights]=useState([cargo]),[settings,setSettings]=useState<AssessmentSettings>({}),[saved,setSaved]=useState('');
 function worked(){const g=emptySecuringGroup(manifest.id);g.name='Synthetic worked case';g.referenceStatus='current';g.cargoIds=[cargo.id];g.source='Synthetic verification only; no ship-specific approval';g.confirmed=true;g.reviewKey=securingReviewKey(weights,'test',areas);g.values={ax:'1',ay:'2',az:'1',friction:'.3',forceX:'0',forceY:'0',forceHeight:'0',x:'0',y:'0',z:'0',length:'4',width:'4',bearingKPa:'100'};setSettings({securing:{groups:[g]}});}
 return <AssessmentContext.Provider value={{weights,conditionKey:'test',settings,setSettings}}><main><h1>P12 synthetic verification</h1><p>No user plans or ship approval data are changed.</p><button onClick={worked}>Load worked case</button><button onClick={()=>setWeights(weights.map(w=>({...w,massTonnes:String(+w.massTonnes+1)})))}>Change cargo mass</button><button onClick={()=>setSaved(JSON.stringify(settings))}>Save test settings</button><button onClick={()=>setSettings({})}>Clear test settings</button><button disabled={!saved} onClick={()=>setSettings(parseAssessmentSettings(JSON.parse(saved)))}>Reopen test settings</button><SecuringAssessment ship={ship} weights={weights} areas={areas}/></main></AssessmentContext.Provider>;
}
const root=import.meta.hot?.data.root??createRoot(document.getElementById('root')!);if(import.meta.hot)import.meta.hot.data.root=root;root.render(<Harness/>);
