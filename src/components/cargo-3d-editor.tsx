import {useCargoDragCancellation} from './use-cargo-drag-cancellation';
import {InstancedCargo} from '../visualization/instanced-cargo';
import {CargoSpecifications} from './cargo-specifications';
import {syncCargoMeshes,disposeCargoNameTextures} from '../visualization/cargo-meshes';
import {demandRender} from '../visualization/demand-render';
import {useWindowSelection,type SelectionRect} from './use-window-selection';
import {useEffect,useRef,useState} from 'react';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import type {CargoArea} from '../app/cargo-layout';
import type {WeightDraft} from '../app/loading-state';
import {cargoBottom,translateCargoGroup} from '../app/cargo-placement';
import {useLanguage} from '../app/language-context';
type Position={x:number;y:number;z:number};
type Props={placement?:{deckZ:number;preview:(p:Position)=>WeightDraft[];commit:(p:Position)=>void};panMode?:boolean;onContextMenu?:(id:string|undefined,x:number,y:number)=>void;onSelectWindow?:(ids:string[],add:boolean)=>void;areas:CargoArea[];weights:WeightDraft[];selected:string;selectedIds?:string[];multiSelect?:boolean;onSelect:(id:string,additive?:boolean)=>void;preview:(id:string,p:Position)=>WeightDraft;commit:(id:string,p:Position)=>void};
export default function Cargo3DEditor(props:Props){
 const {t}=useLanguage(),host=useRef<HTMLDivElement>(null),current=useRef(props);current.current=props;
 const [cameraView,setCameraView]=useState('camera'),cameraViewRef=useRef(cameraView);cameraViewRef.current=cameraView;
 const [mode,setMode]=useState<'camera'|'floor'|'side'|'end'>('floor'),modeRef=useRef(mode);modeRef.current=mode;
 const [selectMode,setSelectMode]=useState(false);
 useEffect(()=>{if(props.panMode)setSelectMode(false);},[props.panMode]);
 const [zoom,setZoom]=useState(1),zoomRef=useRef(1);
 const changeZoom=(v:number)=>{const next=Math.max(1,Math.min(15,v));zoomRef.current=next;setZoom(next);api.current?.zoom(next);};
 const [message,setMessage]=useState(''),[failed,setFailed]=useState(false);
 const api=useRef<{paint:()=>void;cancel:()=>void;view:(v:string)=>void;zoom:(v:number)=>void;rects:()=>SelectionRect[]}|undefined>(undefined);
 useCargoDragCancellation(()=>api.current?.cancel(),props.weights,`${props.panMode}:${mode}:${selectMode}:${!!props.placement}`);
 const selectionWindow=useWindowSelection(selectMode&&!props.panMode&&!props.placement,(ids,add)=>current.current.onSelectWindow?.(ids,add),()=>api.current?.rects()??[]);
 const shape=JSON.stringify(props.areas);
 useEffect(()=>{
  if(failed||!host.current||shape==='[]')return;
  let renderer:THREE.WebGLRenderer;try{renderer=new THREE.WebGLRenderer({antialias:true});}catch{setFailed(true);return;}
  const scene=new THREE.Scene();scene.background=new THREE.Color('#edf3f7');
  const areas=JSON.parse(shape) as CargoArea[],minX=Math.min(...areas.map(a=>a.xMin)),maxX=Math.max(...areas.map(a=>a.xMax)),minY=Math.min(...areas.map(a=>a.yMin)),maxY=Math.max(...areas.map(a=>a.yMax)),floor=Math.min(...areas.map(a=>a.deckZ)),top=Math.max(...areas.map(a=>a.deckZ+(a.clearHeight??10)));
  const centre=new THREE.Vector3((minX+maxX)/2,(floor+top)/2,(minY+maxY)/2),span=Math.max(maxX-minX,maxY-minY,top-floor);
  const camera=new THREE.PerspectiveCamera(45,1,.05,span*100);camera.position.copy(centre).add(new THREE.Vector3(span*.8,span*.9,span));
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));host.current.appendChild(renderer.domElement);renderer.domElement.style.touchAction='none';renderer.domElement.tabIndex=0;renderer.domElement.setAttribute('role','img');renderer.domElement.setAttribute('aria-label','3D cargo layout');
  const controls=new OrbitControls(camera,renderer.domElement);controls.target.copy(centre);
  const fitDistance=span*1.6;controls.minDistance=fitDistance/15;controls.maxDistance=fitDistance;
  let targetDistance:number|undefined;
  let invalidate=()=>{};
  const syncZoom=()=>{invalidate();if(targetDistance!==undefined)return;const value=Math.max(1,Math.min(15,fitDistance/camera.position.distanceTo(controls.target)));zoomRef.current=value;setZoom(value);};
  const cancelZoom=()=>{targetDistance=undefined;syncZoom();};controls.addEventListener('start',cancelZoom);
  controls.addEventListener('change',syncZoom);controls.update();
  scene.add(new THREE.HemisphereLight(0xffffff,0x627488,2));
  const group=new THREE.Group();scene.add(group);const meshes=new Map<string,THREE.Mesh<THREE.BufferGeometry,THREE.MeshStandardMaterial>>();
  for(const area of areas)for(const r of area.supportRegions??area.regions??[area]){
   const geometry=new THREE.BoxGeometry(r.xMax-r.xMin,area.clearHeight??10,r.yMax-r.yMin),edges=new THREE.EdgesGeometry(geometry);geometry.dispose();const lines=new THREE.LineSegments(edges,new THREE.LineBasicMaterial({color:'#5c7585',transparent:true,opacity:.6}));lines.position.set((r.xMin+r.xMax)/2,area.deckZ+(area.clearHeight??10)/2,(r.yMin+r.yMax)/2);scene.add(lines);
   const plane=new THREE.Mesh(new THREE.PlaneGeometry(r.xMax-r.xMin,r.yMax-r.yMin),new THREE.MeshBasicMaterial({color:'#b8c9d4',side:THREE.DoubleSide,transparent:true,opacity:.15,depthWrite:false}));plane.rotation.x=-Math.PI/2;plane.position.set((r.xMin+r.xMax)/2,area.deckZ,(r.yMin+r.yMax)/2);scene.add(plane);
  }
  for(const area of areas)for(const p of area.panels??[]){const points=[new THREE.Vector3(p.xMin,area.deckZ+.008,p.yMin),new THREE.Vector3(p.xMax,area.deckZ+.008,p.yMin),new THREE.Vector3(p.xMax,area.deckZ+.008,p.yMax),new THREE.Vector3(p.xMin,area.deckZ+.008,p.yMax)];scene.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:'#527c60'})));}
  const ghostGroup=new THREE.Group();scene.add(ghostGroup);
  const ghostMeshes=new Map<string,THREE.Mesh<THREE.BufferGeometry,THREE.MeshStandardMaterial>>();
  const clearGhost=()=>{syncCargoMeshes(ghostGroup,ghostMeshes,[],new Set());invalidate();};
  const instanced=new InstancedCargo();scene.add(instanced.group);let batching=false;
  const paint=()=>{clearGhost();batching=current.current.weights.length>500;if(batching){syncCargoMeshes(group,meshes,[],new Set());instanced.sync(current.current.weights,new Set(current.current.selectedIds??[current.current.selected]),invalidate);}else{instanced.sync([],new Set(),invalidate);syncCargoMeshes(group,meshes,current.current.weights,new Set(current.current.selectedIds??[current.current.selected]),invalidate);}invalidate();};
  const view=(v:string)=>{targetDistance=undefined;camera.up.set(0,1,0);const d=v==='top'?new THREE.Vector3(0,span*1.6,.001):v==='side'?new THREE.Vector3(0,0,span*1.6):v==='end'?new THREE.Vector3(span*1.6,0,0):new THREE.Vector3(.8,.9,1).normalize().multiplyScalar(fitDistance);camera.position.copy(centre).add(d);controls.target.copy(centre);controls.update();};
  view(cameraViewRef.current==='floor'?'top':cameraViewRef.current);
  api.current={paint,cancel:()=>cancelDrag(),view,rects:()=>{camera.updateMatrixWorld();group.updateMatrixWorld(true);const screen=renderer.domElement.getBoundingClientRect();return [...(batching?instanced.proxies:meshes).entries()].flatMap(([id,mesh])=>{const bounds=new THREE.Box3().setFromObject(mesh),points:THREE.Vector3[]=[];for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z])points.push(new THREE.Vector3(x,y,z).project(camera));if(points.some(p=>p.z< -1||p.z>1))return [];return [{id,left:screen.left+(Math.min(...points.map(p=>p.x))+1)*screen.width/2,right:screen.left+(Math.max(...points.map(p=>p.x))+1)*screen.width/2,top:screen.top+(1-Math.max(...points.map(p=>p.y)))*screen.height/2,bottom:screen.top+(1-Math.min(...points.map(p=>p.y)))*screen.height/2}];});},zoom:(v:number)=>{targetDistance=fitDistance/v;invalidate();}};paint();
  const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();
  const cast=(e:{clientX:number;clientY:number})=>{const b=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-b.left)/b.width*2-1,-(e.clientY-b.top)/b.height*2+1);ray.setFromCamera(pointer,camera);};
  const pick=()=>{if(batching)return instanced.pick(ray);const hit=ray.intersectObjects([...meshes.values()])[0];return hit?{id:hit.object.userData.id as string,point:hit.point}:undefined;};
  let drag:{id:string;plane:THREE.Plane;hit:THREE.Vector3;origin:Position;position?:Position;valid:boolean;before:WeightDraft[]}|undefined;
  let placePress:{x:number;y:number}|undefined;
  const placementPoint=(e:PointerEvent)=>{cast(e);const placement=current.current.placement;if(!placement)return;const p=ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),-placement.deckZ),new THREE.Vector3());return p?{x:p.x,y:p.z,z:placement.deckZ}:undefined;};
  const previewPlacement=(e:PointerEvent)=>{const p=placementPoint(e);if(!p){clearGhost();setMessage('Choose Top or Perspective to place cargo on the loading surface.');return;}try{const next=current.current.placement!.preview(p);syncCargoMeshes(ghostGroup,ghostMeshes,next,new Set());for(const mesh of ghostMeshes.values()){mesh.material.color.set('#16845b');mesh.material.transparent=true;mesh.material.opacity=.55;mesh.material.depthWrite=false;}setMessage('Click to place. Escape finishes.');}catch(error){clearGhost();setMessage((error as Error).message);}invalidate();};
  let emptyPress:{x:number;y:number}|undefined;
  const cancelDrag=()=>{placePress=undefined;emptyPress=undefined;controls.enabled=true;clearGhost();if(!drag)return;drag=undefined;controls.enabled=true;setMessage('');paint();};
  const down=(e:PointerEvent)=>{if(!e.isPrimary){cancelDrag();return;}controls.mouseButtons.LEFT=current.current.panMode?THREE.MOUSE.PAN:THREE.MOUSE.ROTATE;controls.touches.ONE=current.current.panMode?THREE.TOUCH.PAN:THREE.TOUCH.ROTATE;if(current.current.panMode||e.button!==0)return;renderer.domElement.focus({preventScroll:true});if(current.current.placement){e.stopImmediatePropagation();controls.enabled=false;placePress={x:e.clientX,y:e.clientY};renderer.domElement.setPointerCapture(e.pointerId);previewPlacement(e);return;}cast(e);const hit=pick();emptyPress=hit?undefined:{x:e.clientX,y:e.clientY};if(!hit)return;const id=hit.id;if(e.shiftKey||e.ctrlKey||e.metaKey||(current.current.multiSelect&&!(current.current.selectedIds??[]).includes(id))){current.current.onSelect(id,true);e.stopImmediatePropagation();return;}current.current.onSelect(id);if(modeRef.current==='camera')return;
   e.stopImmediatePropagation();controls.enabled=false;renderer.domElement.setPointerCapture(e.pointerId);
   const w=current.current.weights.find(w=>w.id===id)!;const origin={x:Number(w.lcg),y:Number(w.tcg),z:cargoBottom(w)};
   const normal=modeRef.current==='floor'?new THREE.Vector3(0,1,0):modeRef.current==='side'?new THREE.Vector3(0,0,1):new THREE.Vector3(1,0,0);const plane=new THREE.Plane().setFromNormalAndCoplanarPoint(normal,hit.point);
   drag={id,plane,hit:hit.point.clone(),origin,valid:false,before:current.current.weights};setMessage('');
  };
  const move=(e:PointerEvent)=>{if(current.current.placement&&!current.current.panMode){previewPlacement(e);return;}if(!drag)return;if(drag.before!==current.current.weights){cancelDrag();return;}cast(e);const point=ray.ray.intersectPlane(drag.plane,new THREE.Vector3());if(!point)return;const delta=point.sub(drag.hit);const p={x:drag.origin.x+delta.x,y:drag.origin.y+delta.z,z:drag.origin.z+delta.y};drag.position=p;
   const mesh=(batching?instanced.proxies:meshes).get(drag.id);if(!mesh)return;
   const anchor=current.current.weights.find(w=>w.id===drag!.id)!;
   const group=current.current.weights.filter(w=>(current.current.selectedIds??[]).includes(drag!.id)?(current.current.selectedIds??[]).includes(w.id):w.id===drag!.id);
   const show=(next:WeightDraft,color:string)=>{for(const w of translateCargoGroup(group,anchor,next)){const m=(batching?instanced.proxies:meshes).get(w.id);if(m){m.position.set(Number(w.lcg),cargoBottom(w)+w.footprint!.height/2,Number(w.tcg));if(batching)m.userData.syncInstance(color);else m.material.color.set(color);}}};
   try{const next=current.current.preview(drag.id,p);show(next,'#16845b');drag.valid=true;setMessage('Release to place cargo.');}catch(error){show({...anchor,lcg:String(p.x),tcg:String(p.y),footprint:{...anchor.footprint!,bottomZ:p.z}},'#d32f2f');drag.valid=false;setMessage((error as Error).message);}
   invalidate();

  };
  const end=(e:PointerEvent)=>{if(placePress){const press=placePress;placePress=undefined;controls.enabled=true;if(e.type==='pointerup'&&!current.current.panMode&&Math.hypot(e.clientX-press.x,e.clientY-press.y)<5){const p=placementPoint(e);if(p)try{current.current.placement!.preview(p);current.current.placement!.commit(p);}catch(error){setMessage((error as Error).message);}}clearGhost();return;}if(emptyPress){if(e.type==='pointerup'&&Math.hypot(e.clientX-emptyPress.x,e.clientY-emptyPress.y)<4)current.current.onSelect('');emptyPress=undefined;}if(!drag)return;const d=drag;drag=undefined;controls.enabled=true;if(e.type==='pointerup'&&d.valid&&d.position&&d.before===current.current.weights){current.current.commit(d.id,d.position);setMessage('');}paint();};
  const panWheel=(e:WheelEvent)=>{
    if(!current.current.panMode||e.ctrlKey)return;
    e.preventDefault();e.stopImmediatePropagation();cancelZoom();
    const unit=e.deltaMode===1?16:e.deltaMode===2?renderer.domElement.clientHeight:1;
    const scale=2*camera.position.distanceTo(controls.target)*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))/Math.max(1,renderer.domElement.clientHeight);
    const movement=new THREE.Vector3().setFromMatrixColumn(camera.matrix,0).multiplyScalar(e.deltaX*unit*scale).add(new THREE.Vector3().setFromMatrixColumn(camera.matrix,1).multiplyScalar(-e.deltaY*unit*scale));
    camera.position.add(movement);controls.target.add(movement);controls.update();invalidate();
  };
  renderer.domElement.addEventListener('wheel',panWheel,{capture:true,passive:false});
  const context=(e:MouseEvent)=>{cast(e);const hit=pick();if(hit&&current.current.onContextMenu){e.preventDefault();e.stopPropagation();current.current.onContextMenu(hit.id,e.clientX,e.clientY);}};
  renderer.domElement.addEventListener('contextmenu',context);
  renderer.domElement.addEventListener('pointerdown',down,true);renderer.domElement.addEventListener('pointermove',move);renderer.domElement.addEventListener('pointerup',end);renderer.domElement.addEventListener('pointercancel',end);renderer.domElement.addEventListener('lostpointercapture',cancelDrag);
  const resize=new ResizeObserver(()=>{if(!host.current)return;const w=host.current.clientWidth,h=host.current.clientHeight;if(!w||!h)return;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();invalidate();});resize.observe(host.current);
  let inViewport=true,lastTime=performance.now();const render=()=>{const now=performance.now(),dt=Math.min(.05,(now-lastTime)/1000);lastTime=now;
   if(targetDistance!==undefined){const offset=camera.position.clone().sub(controls.target),distance=offset.length();const next=distance+(targetDistance-distance)*(1-Math.exp(-18*dt));camera.position.copy(controls.target).addScaledVector(offset.normalize(),Math.abs(next-targetDistance)<.0001?targetDistance:next);if(Math.abs(next-targetDistance)<.0001)targetDistance=undefined;}
   controls.update();renderer.render(scene,camera);return targetDistance!==undefined;};
  const loop=demandRender(render,()=>inViewport&&!document.hidden&&!!host.current?.clientWidth&&!!host.current?.clientHeight);invalidate=loop.invalidate;
  const visibility=new IntersectionObserver(entries=>{inViewport=entries[0].isIntersecting;lastTime=performance.now();invalidate();});visibility.observe(host.current);document.addEventListener('visibilitychange',invalidate);invalidate();
  const contextLost=(event:Event)=>{event.preventDefault();api.current?.cancel();setFailed(true);};renderer.domElement.addEventListener('webglcontextlost',contextLost);
  return()=>{renderer.domElement.removeEventListener('webglcontextlost',contextLost);instanced.dispose();disposeCargoNameTextures(group);disposeCargoNameTextures(ghostGroup);renderer.domElement.removeEventListener('wheel',panWheel,true);renderer.domElement.removeEventListener('contextmenu',context);loop.dispose();visibility.disconnect();document.removeEventListener('visibilitychange',invalidate);resize.disconnect();controls.removeEventListener('change',syncZoom);controls.removeEventListener('start',cancelZoom);controls.dispose();renderer.domElement.removeEventListener('pointerdown',down,true);renderer.domElement.removeEventListener('pointermove',move);renderer.domElement.removeEventListener('pointerup',end);renderer.domElement.removeEventListener('pointercancel',end);renderer.domElement.removeEventListener('lostpointercapture',cancelDrag);scene.traverse(o=>{const m=o as THREE.Mesh;m.geometry?.dispose();if(m.material){for(const mat of Array.isArray(m.material)?m.material:[m.material])mat.dispose();}});renderer.dispose();renderer.domElement.remove();api.current=undefined;};
 },[shape,failed]);
 useEffect(()=>{host.current?.querySelector('canvas')?.setAttribute('aria-label',t('3D cargo layout'));},[t,failed,shape]);
 useEffect(()=>api.current?.paint(),[props.weights,props.selected,props.selectedIds,props.placement,props.panMode]);
 return <section className="cargo-spatial" tabIndex={0} onKeyDown={e=>{if((e.target as HTMLElement).closest('input,select,textarea')||e.ctrlKey||e.metaKey||e.altKey)return;if(['+','=','-','0'].includes(e.key)){e.preventDefault();if(e.key==='0')api.current?.view(cameraViewRef.current==='floor'?'top':cameraViewRef.current);else changeZoom(zoomRef.current*(e.key==='-'?1/1.12:1.12));}}}><div className="scene-toolbar"><label><input type="checkbox" checked={selectMode&&!props.panMode&&!props.placement} disabled={failed||props.panMode||!!props.placement} onChange={e=>setSelectMode(e.target.checked)}/>{t('Window selection')}</label><label>{t('Camera view')} <select disabled={failed} value={cameraView} onChange={e=>{const v=e.target.value;setCameraView(v);setMode(v==='side'?'side':v==='end'?'end':'floor');setZoom(1);api.current?.view(v==='floor'?'top':v);}}>{(['camera','floor','side','end'] as const).map(v=><option key={v} value={v}>{t({camera:'Perspective',floor:'Top',side:'Side',end:'End'}[v])}</option>)}</select></label><details className="drag-options"><summary>{t('Move cargo')}</summary><label>{t('Movement plane')}<select disabled={failed} value={mode} onChange={e=>{setMode(e.target.value as typeof mode);setSelectMode(false);}}><option value="camera">{t('Camera only')}</option><option value="floor">{t('Length / width')}</option><option value="side">{t('Length / height')}</option><option value="end">{t('Width / height')}</option></select></label></details></div><p>{props.placement?t('Click the loading surface to place cargo. Pan view pauses placement; Escape finishes.'):t('Drag cargo on the selected movement plane. Top and Perspective use length/width, Side uses length/height, and End uses width/height. Pan view moves the camera. Green previews are valid; red previews cannot be placed.')}</p>{failed?<p role="alert">{t('3D is unavailable. Choose Top, Side or End above to continue editing.')} <button onClick={()=>setFailed(false)}>{t('Retry 3D')}</button></p>:<div className="cargo-spatial-stage"><div className="cargo-spatial-canvas" ref={host}/><p className="cargo-pointer-status" role="status">{t(message)}</p>{selectMode&&!props.panMode&&!props.placement&&<svg className="cargo-selection-overlay" tabIndex={0} aria-label={t('3D window selection')} {...selectionWindow.handlers}>{selectionWindow.overlay}</svg>}</div>}<div className="planner-zoom"><button aria-label={t('Zoom out')} disabled={failed||zoom<=1.0001} onClick={()=>changeZoom(zoomRef.current/1.12)}>−</button><label>{t('Plan zoom')}<input disabled={failed} type="range" min="1" max="15" step="0.01" value={zoom} onChange={e=>changeZoom(Number(e.target.value))}/></label><button aria-label={t('Zoom in')} disabled={failed||zoom>=14.9999} onClick={()=>changeZoom(zoomRef.current*1.12)}>+</button><output aria-live="off">{Math.round(zoom*100)}%</output><button disabled={failed} onClick={()=>{api.current?.view(cameraViewRef.current==='floor'?'top':cameraViewRef.current);}}>{t('Fit planning area')}</button></div><CargoSpecifications item={props.weights.find(w=>w.id===props.selected)}/></section>;
}
