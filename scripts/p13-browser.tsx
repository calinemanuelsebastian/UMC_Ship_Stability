import {createRoot} from 'react-dom/client';import {useState} from 'react';
import {TankControls} from '../src/components/tank-controls';
import {tankWeight,type TankCatalog} from '../src/app/tank-operations';
import type {WeightDraft} from '../src/app/loading-state';
import manifest from '../public/built-in-ship-models/training-pontoon-100x20/manifest.json';
import tanks from '../public/built-in-ship-models/training-pontoon-100x20/loading/tanks.json';
import '../src/index.css';
const catalog=tanks as TankCatalog;const ship={manifest,baseUrl:'/built-in-ship-models/training-pontoon-100x20/'};
export function Harness(){const [weights,setWeights]=useState<WeightDraft[]>([{id:'fixture-light',name:'Synthetic lightship',massTonnes:'4000',lcg:'51',tcg:'0',vcg:'2',freeSurfaceMomentTransverse:'0'},...catalog.tanks.filter(t=>t.group==='ballast').map(t=>tankWeight(t,{id:t.id,volumeM3:0,density:t.defaultDensity}))]);const state={scenario:'loading' as const,weights,manual:{},manualMode:'displacement' as const,density:1.025,longitudinalFsm:0};return <main><h1>P13 isolated verification</h1><p>No user plans are changed. Synthetic 4000 t condition, LCG 51 m from AP.</p><TankControls ballastOnly ship={ship} catalog={catalog} weights={weights} setWeights={setWeights} state={state}/></main>;}
const root=import.meta.hot?.data.root??createRoot(document.getElementById('root')!);if(import.meta.hot)import.meta.hot.data.root=root;root.render(<Harness/>);
