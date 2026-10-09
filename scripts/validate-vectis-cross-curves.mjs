import {readFile,writeFile} from 'node:fs/promises';
import {createServer} from './test-server.mjs';
const server=await createServer({server:{middlewareMode:true},appType:'custom'});
try{
 const {computeConstantLcb}=await server.ssrLoadModule('/src/core/stability/constant-lcb.ts');const {mountShipBundle}=await server.ssrLoadModule('/src/app/ship-package.ts');const {heelEquilibrium}=await server.ssrLoadModule('/src/core/stability/heel-equilibrium.ts');
 const dir='validation-references/reviewed-apples-vessel/',manifest=JSON.parse(await readFile(dir+'manifest.json','utf8')),files={};for(const r of manifest.resources)if(r.path)files[r.path]={encoding:'utf8',data:await readFile(dir+r.path,'utf8')};const ship=mountShipBundle({manifest,files});
 try{
 const condition={displacementTonnes:13201.307,waterDensity:1.025,vcg:4.647,lcg:58.731,tcg:.004,freeSurfaceMomentTransverse:0};
 const result=await computeConstantLcb(ship,condition,{initialTrimMetres:-.774});
 const kn=[0,.267,.668,1.335,1.603,2.004,2.678,3.359,4.006,4.623,5.229,6.204,6.798],gz=[-.004,.101,.259,.525,.633,.798,1.085,1.392,1.680,1.955,2.239,2.641,2.772];
 const rows=result.points.map((p,i)=>({...p,sourceKN:kn[i],sourceGZ:gz[i],knDifference:p.kn-kn[i],gzDifference:p.gzCorrected-gz[i]}));
 const report={source:'004_STABILITY_LOADING_MANUAL.pdf, PDF pp12–14 / printed 4.1–4.3',condition,inputNote:'VCG is already the printed corrected KG of 4.647 m; FSM is zero to avoid correcting twice. Initial trim is explicitly the worked-example value, not a new LCG balance.',initialTrimMetres:-.774,referenceDensityNote:'Restricted to 1.025 t/m3 seawater convention; no mass/volume rescaling applied to source curves.',maxKNError:Math.max(...rows.map(r=>Math.abs(r.knDifference))),maxGZError:Math.max(...rows.map(r=>Math.abs(r.gzDifference))),calculatedHeelDeg:heelEquilibrium(result).equilibrium.heelDeg,printedHeelDeg:.074,sourceIssues:['Page 14 prints trim -0.792 m, whereas pages 12–13 use -0.774 m. This report uses the detailed curve on pages 12–13.','Page 14 labels its 0.076-degree approximation to port despite positive starboard TCG and the detailed page-13 starboard result. The source text is preserved; no source PDF is modified.','Page 14 explicitly notes sensitivity to TCG/TCB rounding at such small angles.'],rows};
 if(report.maxKNError>.001||report.maxGZError>.001)throw new Error('Worked-example tolerance exceeded');await writeFile(dir+'cross-curves-worked-example.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({maxKNError:report.maxKNError,maxGZError:report.maxGZError,heelDeg:report.calculatedHeelDeg}));
 }finally{ship.release();}
}finally{await server.close();}
