import {createRoot} from 'react-dom/client';import {useState} from 'react';
import {AssessmentReportExport} from '../src/components/assessment-report-export';
import {SavedScenarios} from '../src/components/saved-scenarios';
import type {ScenarioState} from '../src/app/saved-scenarios';
import manifest from '../public/built-in-ship-models/training-pontoon-100x20/manifest.json';
import '../src/index.css';
const ship={manifest:{...manifest,id:'p15-isolated-handover-fixture'},baseUrl:'/built-in-ship-models/training-pontoon-100x20/'};
const initial:ScenarioState={scenario:'loading',manualMode:'displacement',density:1.025,longitudinalFsm:0,manual:{},weights:[{id:'lightship',name:'Synthetic lightship',category:'fixed',massTonnes:'4000',lcg:'50',tcg:'0',vcg:'2',freeSurfaceMomentTransverse:'0'}]};
export function Harness(){const [state,setState]=useState(initial);return <main><h1>P15 handover verification</h1><p>Synthetic pontoon condition. Saves use an isolated vessel key.</p><button onClick={()=>setState({...state,density:state.density===1.025?1:1.025})}>Change fixture density</button><p>Water density: {state.density} t/m³</p><AssessmentReportExport ship={ship} state={state} inputs={{pending:false}}/><SavedScenarios ship={ship} state={state} ready onRestore={setState}/></main>;}
const root=import.meta.hot?.data.root??createRoot(document.getElementById('root')!);if(import.meta.hot)import.meta.hot.data.root=root;root.render(<Harness/>);
