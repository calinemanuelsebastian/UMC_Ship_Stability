// Development-only verification fixture. It never reads or writes user cargo plans.
import {createRoot} from 'react-dom/client';
import {useState} from 'react';
import {CargoPlanner} from '../src/components/cargo-planner';
import manifest from '../public/built-in-ship-models/training-pontoon-100x20/manifest.json';
import '../src/index.css';
const area={id:'fixture',name:'P06 hold',xMin:0,xMax:20,yMin:0,yMax:10,deckZ:0,clearHeight:6};
const ship={baseUrl:'/',manifest:{...manifest,id:'p06-fixture',resources:[{id:'surfaces',kind:'loading.cargo-surfaces',config:{surfaces:[area]}}]}};
const initial=()=>[2,5,12].map((x,i)=>({id:`unit-${i+1}`,name:`Unit ${i+1}`,category:'cargo',massTonnes:'2',lcg:String(x),tcg:'3',vcg:'.4',freeSurfaceMomentTransverse:'0',footprint:{areaId:'fixture',length:2,width:1,height:1,rotation:0,deckZ:0,bottomZ:0,stackability:'stackable',maxTopLoadTonnes:20}}));
export function Harness(){const [weights,setWeights]=useState(initial),[surface,setSurface]=useState(area),[version,setVersion]=useState(0);return <><header style={{padding:8,background:'white'}}><strong>P06 isolated placement verification</strong> <button onClick={()=>{setWeights(initial());setVersion(v=>v+1);}}>Reset fixture</button><output id="fixture-summary">{weights.length} items · {weights.reduce((n,w)=>n+Number(w.massTonnes),0)} t</output><details><summary>Authoritative geometry</summary><pre id="fixture-geometry">{JSON.stringify(weights.map(w=>({id:w.id,x:w.lcg,y:w.tcg,z:w.footprint.bottomZ,rotation:w.footprint.rotation,mass:w.massTonnes,vcg:w.vcg})))}</pre></details></header><CargoPlanner key={version} ship={ship} weights={weights} setWeights={setWeights} area={surface} setArea={setSurface} ready/></>;}
const root=import.meta.hot?.data.root??createRoot(document.getElementById('root'));if(import.meta.hot)import.meta.hot.data.root=root;root.render(<Harness/>);
