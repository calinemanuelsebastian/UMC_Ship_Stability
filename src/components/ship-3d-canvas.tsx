import {createPortal} from 'react-dom';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createShipScene, type SceneWeight, type CameraView } from '../visualization/create-ship-scene';
import { exaggerateTrim, type BoxHull, type SceneCondition } from '../visualization/ship-scene-data';
import { useLanguage } from '../app/language-context';
export function Ship3DCanvas({ draftsUnavailable=false, settingsTarget, referenceOnly=false, panelMode='installed', weights, selectedWeight, onSelectWeight, hull, data, onSelect, selected }: { draftsUnavailable?:boolean; settingsTarget?:HTMLDivElement|null; referenceOnly?:boolean; panelMode?:'installed'|'stored'|'ashore'; weights: SceneWeight[]; selectedWeight: string; onSelectWeight: (id: string) => void; hull: BoxHull; data: SceneCondition; onSelect: () => void; selected: boolean }) {
  const { t, language } = useLanguage();
  const host = useRef<HTMLDivElement>(null);
  const scene = useRef<ReturnType<typeof createShipScene> | null>(null);
  const selectWeight = useRef(onSelectWeight); selectWeight.current = onSelectWeight;
  const select = useRef(onSelect); select.current = onSelect;
  const [cameraView,setCameraView]=useState<CameraView>('perspective');
  const [error, setError] = useState(false);
  const [detail, setDetail] = useState('');
  const [retry, setRetry] = useState(0);
  const [axes, setAxes] = useState(true), [water, setWater] = useState(true);
  const [exterior,setExterior]=useState(true),[panels,setPanels]=useState(true),[cargo,setCargo]=useState(true);
  const [allWeightLabels, setAllWeightLabels] = useState(false);
  const [factor, setFactor] = useState(1);
  const [measurements, setMeasurements] = useState(true);
  const defaults = { axisLength: 1, axisThickness: 1, labelSize: 1, waterlineWidth: 6, hullTransparency: 90, panelTransparency: 90, cargoTransparency: 0 };
  const [appearance, setAppearance] = useState(defaults);
  const amplified = exaggerateTrim(hull, data, data.heelDeg === undefined ? factor : 1);
  const effectiveFactor = data.heelDeg === undefined && amplified ? factor : 1;
  const visualData = amplified ?? data;
  const fmt = useCallback((n: number) => new Intl.NumberFormat(language, { maximumFractionDigits: 3 }).format(n), [language]);
  useEffect(() => {
    if (!host.current) return;
    try { scene.current = createShipScene(host.current, hull, () => select.current(), () => setError(true), id => selectWeight.current(id)); }
    catch { setError(true); }
    return () => { scene.current?.dispose(); scene.current = null; };
  }, [hull, retry]);
  useEffect(() => { try { scene.current?.update(visualData, { exterior, panelMode, panels:panels&&panelMode!=='ashore', cargo, allWeightLabels, weights, selectedWeight, axes, water, selected, ...appearance, measurements: measurements && !draftsUnavailable && data.heelDeg === undefined, draftLabels: { aft: `AP ${fmt(data.draftAft)} m`, forward: `FP ${fmt(data.draftForward)} m` } }); } catch (cause) { setError(true); setDetail(cause instanceof Error ? cause.message : String(cause)); } }, [draftsUnavailable, panelMode, exterior, panels, cargo, allWeightLabels, weights, selectedWeight, visualData, data, hull, axes, water, selected, appearance, measurements, fmt, retry]);
  const teachingView = data.didactic ? data.teachingTrimDeg === undefined ? 'bow' : 'side' : data.heelDeg!==undefined?'bow':undefined;
  useEffect(() => {
    if (teachingView) {scene.current?.view(teachingView);setCameraView(teachingView);}
  }, [teachingView, hull, retry]);
  const settings = <details className="scene-settings" open><summary>{t('Display settings')}</summary>    {hull.model&&<div className="scene-toggles">{([['Show exterior',exterior,setExterior],['Show tween-deck panels',panels,setPanels],['Show cargo footprints in 3D',cargo,setCargo]] as const).map(([label,value,change])=><label key={label}><input type="checkbox" disabled={label==='Show tween-deck panels'&&panelMode==='ashore'} checked={label==='Show tween-deck panels'?value&&panelMode!=='ashore':value} onChange={e=>change(e.target.checked)}/>{t(label)}</label>)}</div>}
    {axes && <div className="scene-axis-key" aria-label={t('Axis colour key')}><span className="scene-axis-x">+x · {t('Longitudinal')}</span><span className="scene-axis-y">+y · {t('Transverse')}</span><span className="scene-axis-z">+z · {t('Vertical')}</span><span>O · {t('Origin')}</span></div>}
    <p className="scene-waterline-key"><span aria-hidden="true"/>{t(effectiveFactor > 1 ? "Highlighted waterline · exaggerated display" : "Highlighted waterline · calculated intersection with the hull")}</p>
    <div className="scene-toggles">{([['All weight labels', allWeightLabels, setAllWeightLabels], ['Reference axes', axes, setAxes], ['Water surface', water, setWater], ['Draft measurements', measurements, setMeasurements]] as const).map(([label, value, change]) => <label key={label}><input type="checkbox" disabled={label === 'Draft measurements' && (draftsUnavailable || data.heelDeg !== undefined)} checked={label === 'Draft measurements' && (draftsUnavailable || data.heelDeg !== undefined) ? false : value} onChange={event => change(event.target.checked)}/>{t(label)}</label>)}</div>
    <div className="scene-display-settings">
      <div className="scene-sliders">{([
        ['hullTransparency','Hull transparency',true],
        ['panelTransparency','Tween-deck transparency',!!hull.model],
        ['cargoTransparency','Cargo transparency',true],
      ] as const).filter(([, ,visible])=>visible).map(([key,label])=><label key={key}>{t(label)} <output>{appearance[key]}%</output><input type="range" aria-label={t(label)} min="0" max="100" step="5" value={appearance[key]} onChange={event=>setAppearance(current=>({...current,[key]:Number(event.target.value)}))}/></label>)}</div>
      <p className="muted">{t('0% = opaque · 100% = invisible. Axes, waterline and centre-of-gravity markers remain visible.')}</p>
      {data.heelDeg === undefined && <><label>{t('Trim exaggeration')}<select aria-label={t('Trim exaggeration')} value={effectiveFactor} onChange={event => setFactor(Number(event.target.value))}>{[1,5,10].map(value => <option key={value} value={value} disabled={!exaggerateTrim(hull, data, value)}>{value === 1 ? t('True scale (×1)') : `×${value}`}</option>)}</select></label>
      <p className="muted">{t('Unavailable factors would put the illustrated waterline outside the hull. Exaggeration does not introduce trim into an even-keel condition.')}</p></>}
      <details><summary>{t('Appearance controls')}</summary><div className="scene-sliders">{([
        ['axisLength', 'Axis length', .5, 2, .1], ['axisThickness', 'Axis thickness', .5, 3, .1], ['labelSize', 'Label size', .75, 1.75, .05], ['waterlineWidth', 'Waterline thickness', 2, 12, 1],
      ] as const).map(([key, label, min, max, step]) => <label key={key}>{t(label)} <output>{appearance[key]}{key === 'waterlineWidth' ? ' px' : '×'}</output><input type="range" aria-label={t(label)} min={min} max={max} step={step} value={appearance[key]} onChange={event => setAppearance(current => ({ ...current, [key]: Number(event.target.value) }))}/></label>)}</div><button onClick={() => setAppearance(defaults)}>{t('Reset appearance')}</button></details>
    </div>
    </details>;
  return <div className="scene-panel">
    <div className="scene-toolbar viewport-navigation" aria-label={t('Camera controls')}><label>{t('Camera view')}<select value={cameraView} onChange={e=>{setCameraView(e.target.value as CameraView);scene.current?.view(e.target.value as CameraView);}}>{(['perspective','side','top','bow'] as CameraView[]).map(v=><option value={v} key={v}>{t({perspective:'Perspective',side:'Side view',top:'Top view',bow:'Bow view'}[v])}</option>)}</select></label><button onClick={()=>{setCameraView('perspective');scene.current?.view('perspective');}}>{t('Reset view')}</button></div>
    <div ref={host} className="ship-3d-canvas" role="group" aria-label={t('Interactive ship view')} hidden={error}>{data.didactic && <span className="scene-teaching-overlay">{t('Imposed attitude · not calculated equilibrium')}</span>}</div>

    <p className={effectiveFactor > 1 ? 'scene-exaggeration-banner' : 'scene-scale-note'} role="status">{effectiveFactor > 1 ? <><strong>{t('Visually exaggerated')} ×{effectiveFactor}</strong> · {t('Draft labels and numerical results show calculated values, not exaggerated dimensions.')}</> : t('True scale (×1)')}{!amplified && <> · {t('The previous factor no longer fits this condition; true scale is shown.')}</>}</p>
    {measurements && !draftsUnavailable && data.heelDeg === undefined && <p className="scene-draft-summary">{t(referenceOnly?'Reference drafts':'Calculated drafts')}: AP {fmt(data.draftAft)} m · FP {fmt(data.draftForward)} m · {t('Trim difference (FP − AP)')}: {fmt(data.draftForward - data.draftAft)} m</p>}


    {error && <p role="alert">{t('3D rendering is unavailable or the graphics context was lost. Numerical results remain available.')} <button onClick={() => { setError(false); setRetry(value => value + 1); }}>{t('Retry 3D')}</button> {detail}</p>}
    <div className="viewport-status"><button aria-label={t('Zoom out')} onClick={()=>scene.current?.zoom(1.12)}>−</button><button aria-label={t('Zoom in')} onClick={()=>scene.current?.zoom(1/1.12)}>+</button><button aria-pressed={selected} onClick={onSelect}>{t('Select G')}</button></div>
    {settingsTarget?createPortal(settings,settingsTarget):settings}
    <details className="scene-help"><summary>{t('Camera help')}</summary><p className="muted">{t('Drag to orbit · scroll or pinch to zoom · right-drag or two-finger drag to pan. Select the orange G marker to inspect the centre of gravity. Camera buttons also work with a keyboard.')}</p></details>
    {axes && Math.abs(data.origin.x) > hull.length * 2 && <p>{t('The selected origin is outside the scene; its axes are hidden rather than moved.')}</p>}
  </div>;
}
