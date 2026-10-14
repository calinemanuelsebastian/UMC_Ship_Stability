import {createRoot} from 'react-dom/client';import {useState} from 'react';
import {VoyageReview} from '../src/components/voyage-review';
import {parseScenario,modelSignature,type SavedScenario,type ScenarioState} from '../src/app/saved-scenarios';
import {tankWeight,type TankCatalog} from '../src/app/tank-operations';
import manifest from '../public/built-in-ship-models/training-pontoon-100x20/manifest.json';
import '../src/index.css';
const ship={manifest,baseUrl:'/built-in-ship-models/training-pontoon-100x20/'},model=modelSignature(ship);
const tank={id:'test-fuel',name:'Test fuel',group:'mdo' as const,capacityM3:100,defaultDensity:.85,fullCentre:[50,0,1],sourcePage:0,tableEnd:100,box:{length:10,width:10,height:1,bottomZ:0},rows:[[0,50,0,0,0],[100,50,0,1,0]]};const catalog:TankCatalog={version:1,source:'Synthetic browser fixture',tanks:[tank]};
const initial:ScenarioState={scenario:'loading',manualMode:'displacement',density:1.025,longitudinalFsm:0,manual:{},weights:[{id:'fixture-light',name:'Synthetic lightship',category:'fixed',massTonnes:'4000',lcg:'50',tcg:'0',vcg:'2',freeSurfaceMomentTransverse:'0'},tankWeight(tank,{id:tank.id,volumeM3:80,density:.85})]};
export function Harness(){const [state,setState]=useState(initial),[items,setItems]=useState<SavedScenario[]>([]);return <main><h1>P14 isolated voyage verification</h1><p>No user storage is read or written.</p><p>Working fuel: {state.weights.find(w=>w.tank)?.tank?.volumeM3} m³. Saved snapshots: {items.length}</p><VoyageReview ship={ship} catalog={catalog} state={state} items={items} ready onLoad={s=>setState(structuredClone(s))} onSave={async(name,next,voyageStage)=>{setItems(items=>[...items,parseScenario({version:1,id:crypto.randomUUID(),model,name,savedAt:new Date().toISOString(),state:next,voyageStage},model)]);}}/></main>;}
const root=import.meta.hot?.data.root??createRoot(document.getElementById('root')!);if(import.meta.hot)import.meta.hot.data.root=root;root.render(<Harness/>);
