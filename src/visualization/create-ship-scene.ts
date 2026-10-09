import {CargoMarkingTextures} from './cargo-marking-textures';
import {addCargoOutline,disposeCargoOutline} from './cargo-outline';
import { setSurfaceOpacity } from './material-opacity';
import { gltfLayer } from './gltf-layer';
import type { Footprint } from '../app/cargo-layout';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { schematicOutline, heeledBox, hullPose, illustrativeAttitudePose, type BoxHull, type SceneCondition } from './ship-scene-data';
export type CameraView = 'perspective' | 'side' | 'top' | 'bow';
export type SceneWeight = { name?:string; footprint?: Footprint; cargoPoint?: {x:number;y:number;z:number}; id: string; label: string; point: { x: number; y: number; z: number } };
export type SceneOptions = { panelMode?:'installed'|'stored'|'ashore'; exterior: boolean; panels: boolean; cargo: boolean; allWeightLabels: boolean; weights: SceneWeight[]; selectedWeight: string; axes: boolean; water: boolean; hullTransparency: number; panelTransparency: number; cargoTransparency: number; selected: boolean; axisLength: number; axisThickness: number; labelSize: number; waterlineWidth: number; measurements: boolean; draftLabels: { aft: string; forward: string } };
export function createShipScene(host: HTMLElement, hull: BoxHull, onSelect: () => void, onError: () => void, onSelectWeight: (id: string) => void) {
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#e9f1f6');
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  const canvas = renderer.domElement; canvas.setAttribute('aria-hidden', 'true'); host.appendChild(canvas);
  const span = Math.max(hull.length, hull.beam, hull.depth);
  const camera = new THREE.PerspectiveCamera(40, 1, span / 1000, span * 60);
  const controls = new OrbitControls(camera, canvas);
  controls.minDistance = span * .15; controls.maxDistance = span * 8;
  controls.enableDamping = false;
  scene.add(new THREE.HemisphereLight(0xffffff, 0x526c85, 2.5));
  const light = new THREE.DirectionalLight(0xffffff, 3); light.position.set(span, span, span); scene.add(light);
  const body = new THREE.Group(); scene.add(body);
  const shape = new THREE.Shape();
  const outlinePoints = schematicOutline(hull);
  outlinePoints.forEach(([x,z],i)=>i===0?shape.moveTo(x,-z):shape.lineTo(x,-z)); shape.closePath();
  const geometry = hull.schematic ? new THREE.ExtrudeGeometry(shape,{depth:hull.depth,bevelEnabled:false}) : new THREE.BoxGeometry(hull.length,hull.depth,hull.beam);
  if(hull.schematic) geometry.rotateX(-Math.PI/2);

  const material = new THREE.MeshPhongMaterial({ color: '#769eb4', transparent: true, opacity: .38, side: THREE.DoubleSide, depthWrite: false });
  const mesh = new THREE.Mesh(geometry, material); mesh.position.y = hull.schematic ? 0 : hull.depth / 2; body.add(mesh);
  const outline = new THREE.LineSegments(new THREE.EdgesGeometry(geometry), new THREE.LineBasicMaterial({ color: '#29465a' })); outline.position.copy(mesh.position); body.add(outline);
  if(hull.model){mesh.visible=false;outline.visible=false;}
  const water = new THREE.Mesh(new THREE.PlaneGeometry(span * 4, span * 4), new THREE.MeshBasicMaterial({ color: '#81c8dc', transparent: true, opacity: .24, depthWrite: false, side: THREE.DoubleSide })); water.rotation.x = -Math.PI / 2; scene.add(water);
  const grid = new THREE.GridHelper(span * 4, 24, '#7bb7c7', '#a1c6cf'); grid.position.y = -.01; scene.add(grid);
  // Screen-space strokes stay legible regardless of zoom and native WebGL line limits.
  const waterlineHalo = new Line2(new LineGeometry(), new LineMaterial({ color: '#ffffff', linewidth: 10, worldUnits: false, depthTest: false, depthWrite: false, transparent: true }));
  const waterline = new Line2(new LineGeometry(), new LineMaterial({ color: '#005b78', linewidth: 6, worldUnits: false, depthTest: false, depthWrite: false, transparent: true }));
  waterlineHalo.renderOrder = 5; waterline.renderOrder = 6; body.add(waterlineHalo, waterline);
  const gravityMaterial = new THREE.MeshBasicMaterial({ color: '#d3680a', depthTest: false });
  const gravity = new THREE.Mesh(new THREE.SphereGeometry(span * .012, 20, 14), gravityMaterial); gravity.renderOrder = 10; body.add(gravity);
  const axes = new THREE.Group(); body.add(axes);
  const art=new CargoMarkingTextures();
  const labels: THREE.Sprite[] = [];
  const textures = new Set<THREE.Texture>();
  let appearance = { axisLength: 1, axisThickness: 1, labelSize: 1 };
  function paintLabel(sprite: THREE.Sprite, text: string, color: string) {
    if (sprite.userData.text === text) return;
    sprite.userData.text = text;
    const surface = document.createElement('canvas');
    const context = surface.getContext('2d')!;
    context.font = 'bold 36px sans-serif';
    const lines=text.split('\n');
    surface.width = Math.min(1024,Math.ceil(Math.max(...lines.map(line=>context.measureText(line).width),1)+24)); surface.height = 16+48*lines.length;
    context.font = 'bold 36px sans-serif'; context.textAlign = 'center';
    context.fillStyle = '#ffffffee'; context.fillRect(0, 0, surface.width, surface.height);
    context.fillStyle = color; lines.forEach((line,i)=>context.fillText(line, surface.width / 2, 45+i*48,surface.width-24));
    if (sprite.material.map) { textures.delete(sprite.material.map); sprite.material.map.dispose(); }
    const texture = new THREE.CanvasTexture(surface); textures.add(texture);
    sprite.material.map = texture; sprite.material.needsUpdate = true;
    sprite.userData.aspect = surface.width / surface.height;
  }
  function label(text: string, color: string) {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ depthTest: false, transparent: true }));
    paintLabel(sprite, text, color);
    sprite.renderOrder = 20; labels.push(sprite); return sprite;
  }
  const weightMarkers = new Map<string, { marker: THREE.Mesh<THREE.BoxGeometry, THREE.MeshBasicMaterial>; text: THREE.Sprite }>();
  const gLabel = label('G', '#9c4900'); body.add(gLabel);
  const oLabel = label('O', '#29465a'); axes.add(oLabel);
  // Mesh shafts stay visibly thick on WebGL implementations with one-pixel lines.
  // Draw axes over the translucent hull and water so their directions remain clear.
  const axisLength = span * .22;
  const headLength = span * .04;
  const shaftGeometry = new THREE.CylinderGeometry(span * .006, span * .006, axisLength - headLength, 16);
  const headGeometry = new THREE.ConeGeometry(span * .018, headLength, 20);
  const originMarker = new THREE.Mesh(new THREE.SphereGeometry(span * .009, 16, 12), new THREE.MeshBasicMaterial({ color: '#17364b', depthTest: false, depthWrite: false, transparent: true }));
  originMarker.renderOrder = 16; axes.add(originMarker);
  oLabel.userData.labelPixels = 28;
  const arrows = (['x', 'y', 'z'] as const).map((axis, index) => {
    const colors = ['#c52235', '#087b48', '#244bce'];
    const axisMaterial = new THREE.MeshBasicMaterial({ color: colors[index], depthTest: false, depthWrite: false, transparent: true });
    const arrow = new THREE.Group();
    const shaft = new THREE.Mesh(shaftGeometry, axisMaterial); shaft.position.y = (axisLength - headLength) / 2;
    const head = new THREE.Mesh(headGeometry, axisMaterial); head.position.y = axisLength - headLength / 2;
    shaft.renderOrder = 15; head.renderOrder = 15;
    arrow.add(shaft, head); axes.add(arrow);
    const text = label(`+${axis}`, colors[index]); text.userData.labelPixels = 32;
    axes.add(text); return { axis, arrow, text };
  });
  const aft = label('AP', '#29465a'); aft.position.set(-hull.length / 2 - span * .07, hull.depth / 2, 0); body.add(aft);
  const bow = label('FP', '#29465a'); bow.position.set(hull.length / 2, hull.depth + span * .035, 0); body.add(bow);
  const dimensions = new THREE.Group(); body.add(dimensions);
  const rulers = [-1, 1].map(sign => {
    const line = new Line2(new LineGeometry(), new LineMaterial({ color: '#653c88', linewidth: 3, depthTest: false, depthWrite: false, transparent: true }));
    line.renderOrder = 8; dimensions.add(line);
    const text = label('', '#653c88'); dimensions.add(text);
    return { sign, line, text };
  });
  let disposed = false;
  let contextLost = false;
  const render = () => {
    if (disposed || contextLost) return;
    scene.updateMatrixWorld(true);
    for (const sprite of labels) {
      const distance = camera.position.distanceTo(sprite.getWorldPosition(new THREE.Vector3()));
      const height = (sprite.userData.labelPixels ?? 22) * appearance.labelSize * 2 * distance * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) / Math.max(1, host.clientHeight);
      sprite.scale.set(height * sprite.userData.aspect, height, 1);
    }
    const axisDistance = camera.position.distanceTo(axes.getWorldPosition(new THREE.Vector3()));
    const pixelSize = 2 * axisDistance * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) / Math.max(1, host.clientHeight);
    for (const { arrow } of arrows) {
      const shaftScale = Math.max(1, 2.5 * pixelSize / (span * .006));
      const headScale = Math.max(1, 6 * pixelSize / (span * .018));
      arrow.children[0].scale.set(shaftScale * appearance.axisThickness, 1, shaftScale * appearance.axisThickness);
      arrow.children[1].scale.set(headScale * appearance.axisThickness, 1, headScale * appearance.axisThickness);
    }
    renderer.render(scene, camera);
  };
  const modelLayer=hull.model?gltfLayer(body,hull,render,onError):undefined;
  const cargoMeshes=new Map<string,THREE.Mesh<THREE.BoxGeometry,THREE.MeshPhongMaterial>>();
  controls.addEventListener('change', render);
  const resize = () => { if (disposed) return; const width = host.clientWidth, height = host.clientHeight; if (!width || !height) return; renderer.setSize(width, height); camera.aspect = width / height; camera.updateProjectionMatrix(); render(); };
  const observer = new ResizeObserver(resize); observer.observe(host);
  function view(value: CameraView) {
    controls.target.set(0, 0, 0); camera.up.set(0, 1, 0);
    const distance = span * (hull.schematic ? 1.15 : 1.8) / Math.min(1, camera.aspect);
    if (value === 'side') camera.position.set(0, hull.depth * .4, distance);
    else if (value === 'top') { camera.position.set(0, distance, .001); camera.up.set(1, 0, 0); }
    else if (value === 'bow') camera.position.set(hull.length/2 + Math.max(hull.beam,hull.depth)*2.6 / Math.min(1,camera.aspect), hull.depth * .4, 0);
    else camera.position.set(distance * .65, distance * .48, distance * .65);
    controls.update(); render();
  }
  let start: { x: number; y: number } | undefined;
  const down = (event: PointerEvent) => { start = event.isPrimary && event.button === 0 ? { x: event.clientX, y: event.clientY } : undefined; };
  const cancel = () => { start = undefined; };
  const up = (event: PointerEvent) => {
    if (!start || Math.hypot(event.clientX - start.x, event.clientY - start.y) > 5) { start = undefined; return; }
    start = undefined;
    const rect = canvas.getBoundingClientRect();
    const ray = new THREE.Raycaster(); ray.setFromCamera(new THREE.Vector2((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1), camera);
    const hits = ray.intersectObjects([...[...weightMarkers.values()].flatMap(w => [w.marker, w.text]), ...[...cargoMeshes.values()].filter(c=>c.visible)]);
    if (hits.length) onSelectWeight(hits[0].object.userData.weightId);
    else if (ray.intersectObjects([gravity, gLabel]).length) onSelect();
  };
  const lost = (event: Event) => { event.preventDefault(); contextLost = true; onError(); };
  canvas.addEventListener('pointerdown', down); canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', cancel); canvas.addEventListener('webglcontextlost', lost);
  resize(); view('perspective');
  return {
    view,
    zoom(factor: number) { const delta = camera.position.clone().sub(controls.target); delta.setLength(THREE.MathUtils.clamp(delta.length() * factor, controls.minDistance, controls.maxDistance)); camera.position.copy(controls.target).add(delta); controls.update(); render(); },
    update(data: SceneCondition, options: SceneOptions) {
      appearance = options;

      const cargoIds=new Set(options.weights.filter(w=>w.footprint).map(w=>w.id));
      const weightIds=new Set(options.weights.map(w=>w.id));
      for(const [id,cube] of cargoMeshes)if(!cargoIds.has(id)){body.remove(cube);disposeCargoOutline(cube);cube.geometry.dispose();cube.material.dispose();cargoMeshes.delete(id);}
      art.begin();
      for(const w of options.weights)if(w.footprint&&w.cargoPoint){
        let cube=cargoMeshes.get(w.id);
        if(!cube){cube=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshPhongMaterial({color:'#527cbd'}));cube.userData.weightId=w.id;addCargoOutline(cube);body.add(cube);cargoMeshes.set(w.id,cube);}
        const f=w.footprint;const map=art.get(w.name??w.label,f.markings,f.stackability,render);if(cube.material.map!==map){cube.material.map=map;cube.material.needsUpdate=true;}cube.scale.set(f.rotation===0?f.length:f.width,f.height,f.rotation===0?f.width:f.length);cube.position.set(w.cargoPoint.x,w.cargoPoint.y,w.cargoPoint.z);cube.visible=options.cargo;cube.material.color.set(w.id===options.selectedWeight?'#bf1674':f.kind==='dunnage'?'#a66b30':cube.material.map?'#ffffff':'#527cbd');setSurfaceOpacity(cube.material,1-options.cargoTransparency/100);cube.visible=options.cargo&&cube.material.opacity>0;for(const child of cube.children)if(child.userData.cargoOutline)(child as THREE.LineSegments<THREE.EdgesGeometry,THREE.LineBasicMaterial>).material.opacity=cube.material.opacity;
      }

      art.end();
      for (const [id, entry] of weightMarkers) if (!weightIds.has(id)) {
        body.remove(entry.marker, entry.text); entry.marker.geometry.dispose(); entry.marker.material.dispose();
        if (entry.text.material.map) { textures.delete(entry.text.material.map); entry.text.material.map.dispose(); }
        entry.text.material.dispose(); labels.splice(labels.indexOf(entry.text), 1); weightMarkers.delete(id);
      }
      options.weights.forEach((weight, index) => {
        let entry = weightMarkers.get(weight.id);
        if (!entry) {
          const marker = new THREE.Mesh(new THREE.BoxGeometry(span*.024,span*.024,span*.024), new THREE.MeshBasicMaterial({color:'#6b3997',depthTest:false,depthWrite:false}));
          const text = label(weight.label, '#6b3997'); marker.renderOrder = 12;
          marker.userData.weightId = weight.id; text.userData.weightId = weight.id;
          body.add(marker,text); entry = {marker,text}; weightMarkers.set(weight.id,entry);
        }
        entry.marker.position.set(weight.point.x,weight.point.y,weight.point.z);
        entry.marker.scale.setScalar(1);
        entry.marker.material.color.set(weight.id === options.selectedWeight ? '#bf1674' : '#6b3997');
        entry.text.visible = !hull.schematic || options.allWeightLabels || weight.id === options.selectedWeight;
        entry.text.position.copy(entry.marker.position).add(new THREE.Vector3(0,span*(.055 + (index%3)*.03),0));
        paintLabel(entry.text,options.allWeightLabels || weight.id === options.selectedWeight ? weight.label : String(index+1),'#6b3997');
      });
      waterline.material.linewidth = options.waterlineWidth; waterlineHalo.material.linewidth = options.waterlineWidth + 4;
      const pose = hullPose(hull, data); body.rotation.z = pose.pitch; body.rotation.x = 0; body.position.y = pose.heave;
      const pitchSection = hull.schematic || data.teachingTrimDeg === undefined ? undefined : heeledBox({...hull,beam:hull.length},data.draftAft,data.teachingTrimDeg);
      const visualHeel = hull.schematic && data.heelDeg !== undefined ? illustrativeAttitudePose(hull,data) : undefined;
      const heel = pitchSection || data.heelDeg === undefined || visualHeel ? undefined : heeledBox(hull,data.draftAft,data.heelDeg);
      if(visualHeel){body.rotation.z=visualHeel.pitch;body.rotation.x=visualHeel.angle;body.position.y=visualHeel.heave;}
      if (heel) { body.rotation.z=0; body.rotation.x=heel.angle; body.position.y=heel.heave; }
      if (pitchSection) { body.rotation.x=0; body.rotation.z=-pitchSection.angle; body.position.y=pitchSection.heave; }
      const waterNormal=new THREE.Vector3(0,1,0).applyQuaternion(body.quaternion.clone().invert());
      modelLayer?.update({panelMode:options.panelMode??'installed',exterior:options.exterior,panels:options.panels,hullOpacity:1-options.hullTransparency/100,panelOpacity:1-options.panelTransparency/100,plane:[waterNormal.x,waterNormal.y,waterNormal.z,body.position.y],lineWidth:options.waterlineWidth});
      gravity.position.set(data.gravity.x, data.gravity.y, data.gravity.z); gLabel.position.copy(gravity.position).add(new THREE.Vector3(0, span * .035, 0));
      gravity.scale.setScalar(options.selected ? 1.4 : 1); gravityMaterial.color.set(options.selected ? '#b13f00' : '#d3680a');
      setSurfaceOpacity(material,1-options.hullTransparency/100);
      if(!hull.model){mesh.visible=material.opacity>0;outline.visible=material.opacity>0;setSurfaceOpacity(outline.material,material.opacity);}
      water.visible = options.water; grid.visible = options.water;
      axes.visible = options.axes && Math.abs(data.origin.x) <= hull.length * 2;
      axes.position.set(data.origin.x, data.origin.y, data.origin.z); oLabel.position.set(-span * .025, -span * .025, 0);
      for (const { axis, arrow, text } of arrows) { const d = data.directions[axis]; const vector = new THREE.Vector3(d.x, d.y, d.z); arrow.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), vector); arrow.scale.y = options.axisLength; text.position.copy(vector.multiplyScalar(axisLength * options.axisLength + span * .035)); }
      dimensions.visible = options.measurements; aft.visible = !options.measurements; bow.visible = !options.measurements;
      for (const { sign, line, text } of rulers) {
        const x = sign * hull.length / 2, z = hull.beam / 2 + span * .025;
        const draft = sign < 0 ? data.draftAft : data.draftForward;
        const cap = span * .018;
        line.geometry.dispose();
        line.geometry = new LineGeometry().setPositions([x-cap,0,z, x+cap,0,z, x,0,z, x,draft,z, x-cap,draft,z, x+cap,draft,z]);
        text.position.set(x + sign * span * .09, -span * .085, z);
        paintLabel(text, sign < 0 ? options.draftLabels.aft : options.draftLabels.forward, '#653c88');
      }
      waterline.visible=waterlineHalo.visible=!hull.model&&!visualHeel;
      const waterlinePoints = hull.schematic ? schematicOutline(hull).map(([x,z])=>new THREE.Vector3(x,data.draftAft+(x/hull.length+.5)*(data.draftForward-data.draftAft),z)) : pitchSection ? [
        new THREE.Vector3(pitchSection.ends[0][1],pitchSection.ends[0][0],-hull.beam/2),new THREE.Vector3(pitchSection.ends[1][1],pitchSection.ends[1][0],-hull.beam/2),new THREE.Vector3(pitchSection.ends[1][1],pitchSection.ends[1][0],hull.beam/2),new THREE.Vector3(pitchSection.ends[0][1],pitchSection.ends[0][0],hull.beam/2),
      ] : heel ? [
        new THREE.Vector3(-hull.length/2,...heel.ends[0] as [number,number]), new THREE.Vector3(hull.length/2,...heel.ends[0] as [number,number]), new THREE.Vector3(hull.length/2,...heel.ends[1] as [number,number]), new THREE.Vector3(-hull.length/2,...heel.ends[1] as [number,number]),
      ] : [
        new THREE.Vector3(-hull.length / 2, data.draftAft, -hull.beam / 2), new THREE.Vector3(hull.length / 2, data.draftForward, -hull.beam / 2),
        new THREE.Vector3(hull.length / 2, data.draftForward, hull.beam / 2), new THREE.Vector3(-hull.length / 2, data.draftAft, hull.beam / 2),
      ];
      const positions = [...waterlinePoints, waterlinePoints[0]].flatMap(point => [point.x, point.y, point.z]);
      waterline.geometry.dispose(); waterlineHalo.geometry.dispose();
      waterlineHalo.geometry = new LineGeometry().setPositions(positions);
      waterline.geometry = new LineGeometry().setPositions(positions);
      render();
    },
    dispose() {
      disposed = true; art.dispose(); modelLayer?.dispose(); observer.disconnect(); controls.removeEventListener('change', render); controls.dispose();
      canvas.removeEventListener('pointerdown', down); canvas.removeEventListener('pointerup', up); canvas.removeEventListener('pointercancel', cancel); canvas.removeEventListener('webglcontextlost', lost);
      const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>();
      scene.traverse(object => { const drawable = object as THREE.Mesh; if (drawable.geometry) geometries.add(drawable.geometry); if (drawable.material) for (const material of Array.isArray(drawable.material) ? drawable.material : [drawable.material]) materials.add(material); });
      geometries.forEach(geometry => geometry.dispose()); materials.forEach(material => material.dispose()); textures.forEach(texture => texture.dispose()); renderer.dispose(); renderer.forceContextLoss(); canvas.remove();
    },
  };
}
