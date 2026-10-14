// Disposable, synthetic acceptance files; does not read browser storage.
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createServer} from './test-server.mjs';
async function bundle(root){const manifest=JSON.parse(await readFile(root+'/manifest.json','utf8')),files={};for(const r of manifest.resources)if(r.path)files[r.path]={encoding:'utf8',data:await readFile(root+'/'+r.path,'utf8')};return {format:'umc-ship-package',version:1,manifest,files};}
const pontoon=await bundle('public/built-in-ship-models/training-pontoon-100x20'),vectis=await bundle('validation-references/reviewed-apples-vessel');
function independent(){const b=structuredClone(pontoon);b.manifest.id='p16-independent-barge';b.manifest.name='Independent 20 m acceptance barge';b.manifest.principalDimensions={lbp:20,loa:20,beam:10,mouldedDepth:4,designDraft:2};b.manifest.coordinateSystem.amidshipsX=10;b.manifest.defaultCondition={draft:2,lcg:10,tcg:0,vcg:1,waterDensity:1.025};b.manifest.resources=[{id:'table',kind:'hydrostatics.upright-table',path:'hydro.csv'},{id:'weights',kind:'loading.weights',path:'weights.json',config:{fixedWeightIds:['lightship']}},{id:'deck',kind:'loading.cargo-surfaces',config:{surfaces:[{id:'deck',name:'Deck',xMin:0,xMax:20,yMin:-5,yMax:5,deckZ:4,clearHeight:4}]}}];const header='draft,displacementTonnes,volume,kb,lcb,tcb,bmTransverse,bmLongitudinal,kmTransverse,kmLongitudinal,waterplaneArea,transverseWaterplaneInertia,longitudinalWaterplaneInertia,tonnesPerCentimetre,lcf';const rows=[1,2,3].map(d=>[d,205*d,200*d,d/2,10,0,100/(12*d),400/(12*d),d/2+100/(12*d),d/2+400/(12*d),200,20*1000/12,10*8000/12,2.05,10].join(','));b.files={'hydro.csv':{encoding:'utf8',data:[header,...rows].join('\n')},'weights.json':{encoding:'utf8',data:JSON.stringify([{id:'lightship',name:'Lightship',massTonnes:300,lcg:10,tcg:0,vcg:1}])}};return b;}

const output=resolve(process.argv[2]??'/tmp/umc-p16-fixtures');await mkdir(output,{recursive:true});
const server=await createServer({server:{middlewareMode:true},appType:'custom'});
try {
 const {parseShipBundle,mountShipBundle}=await server.ssrLoadModule('/src/app/ship-package.ts');
 const {loadLoadingWeights}=await server.ssrLoadModule('/src/platform/ship-models/load-loading-weights.ts');
 const {draftWeights}=await server.ssrLoadModule('/src/app/loading-state.ts');
 const {loadTankCatalog,cleanLoadingPlan}=await server.ssrLoadModule('/src/app/tank-operations.ts');
 const {cargoSurfaces}=await server.ssrLoadModule('/src/app/cargo-surfaces.ts');
 const {modelSignature}=await server.ssrLoadModule('/src/app/saved-scenarios.ts');
 for(const [name,b] of [['pontoon',pontoon],['vectis',vectis],['independent',independent()]]) {
  await writeFile(resolve(output,name+'-ship.json'),JSON.stringify(b));
  const ship=mountShipBundle(parseShipBundle(b));
  try {
   const original=draftWeights(await loadLoadingWeights(ship)),catalog=await loadTankCatalog(ship);
   const weights=catalog?cleanLoadingPlan(ship,original,catalog):original,area=cargoSurfaces(ship,'installed')[0];
   const cargo={id:'acceptance-cargo',name:'Acceptance package',category:'cargo',massTonnes:'1',lcg:String((area.xMin+area.xMax)/2),tcg:String((area.yMin+area.yMax)/2),vcg:String(area.deckZ+.5),freeSurfaceMomentTransverse:'0',footprint:{areaId:area.id,length:1,width:1,height:1,rotation:0,deckZ:area.deckZ,bottomZ:area.deckZ}};
   const state={scenario:'loading',manualMode:'displacement',manual:{},density:1.025,longitudinalFsm:0,tweenDeck:'installed',weights:[...weights,cargo]};
   const plan={kind:'cargo-plan',version:1,id:'acceptance-'+name,name:'P16 '+name+' transfer',voyage:'Synthetic acceptance',savedAt:'2026-10-14T00:00:00Z',model:modelSignature(ship),state};
   await writeFile(resolve(output,name+'-plan.json'),JSON.stringify(plan));
   if(name==='pontoon') {
    const count=3376, cols=140;
    const many=Array.from({length:count},(_,i)=>({...cargo,id:`dense-${i}`,name:`Synthetic package ${i+1}`,massTonnes:'.01',lcg:String(area.xMin+1+(i%cols)*.6),tcg:String(area.yMin+1+Math.floor(i/cols)*.6),footprint:{...cargo.footprint,length:.5,width:.5}}));
    await writeFile(resolve(output,'pontoon-3376-plan.json'),JSON.stringify({...plan,id:'p16-dense',name:'P16 3376-unit persistence',state:{...state,weights:[...weights,...many]}}));
   }

  } finally {ship.release();}
 }
 console.log('Acceptance fixtures: '+output);
} finally {await server.close();}
