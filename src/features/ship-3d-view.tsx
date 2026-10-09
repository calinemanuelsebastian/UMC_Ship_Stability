import {CargoSpecifications} from '../components/cargo-specifications';
import {markingLines} from '../app/cargo-identification';
import { isCargo } from '../app/tank-operations';
import type { MovementHistory } from '../app/movement-history';
import type { Dispatch, SetStateAction } from 'react';
import type { WeightDraft } from '../app/loading-state';
import { WeightMovement } from '../components/weight-movement';
import { computeHeelView } from '../visualization/heel-view';
import { bodyPoint } from '../visualization/ship-scene-data';
import { sourceReference } from '../core/reference/reference-system';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ShipModelPackage } from '../core/domain/ship-model';
import { computeUprightHydrostatics } from '../core/hydrostatics/compute-upright-hydrostatics';
import {computeTrimView,hasTrimView} from '../visualization/trim-view';
import { useLanguage } from '../app/language-context';
import { useReference } from '../app/reference-context';
import { visualHullFor, sceneCondition } from '../visualization/ship-scene-data';
import { Ship3DCanvas } from '../components/ship-3d-canvas';
import type { TabId } from '../app/tabs';
type Props = { tweenDeck?:'installed'|'stored'|'ashore'; conditionMessage?: string; movementHistory: MovementHistory; weights: WeightDraft[]; setWeights: Dispatch<SetStateAction<WeightDraft[]>>; fromWeights: boolean; pending: boolean; ship: ShipModelPackage; displacementTonnes?: number; vcg?: number; lcg?: number; tcg?: number; freeSurfaceMomentTransverse?: number; trimDensity?: number; longitudinalFsm?: number; onTabChange: (tab: TabId) => void };
type ViewResult = { draftAft: number; draftForward: number; trimDeg: number; heelDeg?: number; illustrativeDrafts?:boolean; warnings?:string[]; initialTrimReference?:boolean };
export default function Ship3DView({ tweenDeck, conditionMessage, movementHistory, weights, setWeights, fromWeights, pending, ship, displacementTonnes, vcg, lcg, tcg, freeSurfaceMomentTransverse, trimDensity, longitudinalFsm, onTabChange }: Props) {
  const { t, language } = useLanguage(); const reference = useReference();
  const [mode, setMode] = useState<'upright' | 'trim' | 'heel' | 'teaching'>('upright');
  const [teachingAxis, setTeachingAxis] = useState<'heel' | 'trim'>('heel');
  const [teachingHeel, setTeachingHeel] = useState(0);
  const [teachingTrim, setTeachingTrim] = useState(0);
  const [inspectorTab,setInspectorTab]=useState<'display'|'condition'|'inspect'>('display');
  const [inspectorOpen,setInspectorOpen]=useState(true);
  const [selected, setSelected] = useState(false);
  const [displayTarget,setDisplayTarget]=useState<HTMLDivElement|null>(null);
  const [weightId, setWeightId] = useState('');
  const markers = useMemo(() => fromWeights && ship.manifest.resources.some(r => ['visualization.box-hull','visualization.schematic-cargo-hull'].includes(r.kind)) ? weights.filter(w => isCargo(ship,w) && [w.lcg,w.vcg,w.tcg].every(v => v.trim() !== '' && Number.isFinite(Number(v)))).map((w,index) => ({ id: w.id, name:w.name, label: w.footprint?.markings?markingLines(w).join('\n'):`${index+1} · ${w.name}`, ...(w.footprint?{footprint:w.footprint,cargoPoint:bodyPoint(ship,{x:Number(w.lcg),y:Number(w.tcg),z:(w.footprint.bottomZ??w.footprint.deckZ)+w.footprint.height/2})}:{}), point: bodyPoint(ship, { x: Number(w.lcg), y: Number(w.tcg), z: Number(w.vcg) }) })) : [], [weights, fromWeights, ship]);
  const geometry = useMemo(() => { try { return { hull: visualHullFor(ship) }; } catch (error) { return { error: (error as Error).message }; } }, [ship]);
  const density = trimDensity;
  const valid = !pending && [displacementTonnes, vcg, lcg, tcg, freeSurfaceMomentTransverse, density, ...(mode === 'trim' || mode==='heel'&&ship.manifest.resources.some(r=>r.kind==='stability.constant-lcb-cross-curves') ? [longitudinalFsm] : [])].every(value => value !== undefined && Number.isFinite(value));
  const referenceOnly=!!geometry.hull?.schematic&&!valid;
  const displayedMode = referenceOnly ? 'upright' : mode;
  const displayLcg = referenceOnly ? ship.manifest.defaultCondition.lcg : lcg;
  const displayTcg = referenceOnly ? ship.manifest.defaultCondition.tcg : tcg;
  const displayVcg = referenceOnly ? ship.manifest.defaultCondition.vcg : vcg;
  const canDisplay=valid||referenceOnly;
  const key = JSON.stringify([referenceOnly,mode, displacementTonnes, vcg, lcg, tcg, freeSurfaceMomentTransverse, density, longitudinalFsm]);
  const [calculation, setCalculation] = useState<{ ship:ShipModelPackage; key: string; result?: ViewResult; error?: string }>();
  useEffect(() => {
    let active = true;
    if (!canDisplay || !geometry.hull) return;
    const condition = referenceOnly ? {...ship.manifest.defaultCondition,draft:undefined,heelDeg:0,trimDeg:0} : { displacementTonnes, vcg: vcg!, lcg: lcg!, tcg: tcg!, waterDensity: density!, freeSurfaceMomentTransverse, heelDeg: 0, trimDeg: 0 };
    async function calculate() {
      try {
        const result = displayedMode === 'heel' ? await computeHeelView(ship,condition,longitudinalFsm ?? 0) : displayedMode === 'trim' ? await computeTrimView(ship, condition, longitudinalFsm!) : await computeUprightHydrostatics(ship, condition).then(value => {
          if (value.draft === undefined) throw new Error('No draft is available for the 3D view.');
          return { draftAft: value.draft, draftForward: value.draft, trimDeg: 0 };
        });
        // Check visual data as well before declaring the view ready.
        sceneCondition(ship, sourceReference(ship.manifest.coordinateSystem), { x: displayLcg!, y: displayTcg!, z: displayVcg! }, result.draftAft, result.draftForward);
        if (active) setCalculation({ ship, key, result });
      } catch (error) { if (active) setCalculation({ ship, key, error: error instanceof Error ? error.message : '3D calculation failed.' }); }
    }
    void calculate(); return () => { active = false; };
  }, [teachingAxis, ship, valid, canDisplay, referenceOnly, geometry, key, displayedMode, displayLcg, displayTcg, displayVcg, displacementTonnes, vcg, lcg, tcg, density, freeSurfaceMomentTransverse, longitudinalFsm]);
  const current = calculation?.ship === ship && calculation.key === key ? calculation : undefined;
  const result = canDisplay ? current?.result : undefined;
  const data = useMemo(() => result ? {...sceneCondition(ship, reference.settings, { x: displayLcg!, y: displayTcg!, z: displayVcg! }, result.draftAft, result.draftForward), heelDeg: displayedMode === 'teaching' ? teachingAxis === 'heel' ? teachingHeel : 0 : result.heelDeg, teachingTrimDeg: displayedMode === 'teaching' && teachingAxis === 'trim' ? teachingTrim : undefined, didactic: displayedMode === 'teaching'} : undefined, [displayedMode, displayLcg, displayTcg, displayVcg, teachingAxis, teachingHeel, teachingTrim, result, ship, reference.settings]);
  const lastData = useRef<typeof data>(undefined);
  if (data) lastData.current = data;
  const fmt = (value: number | undefined) => value === undefined ? '—' : new Intl.NumberFormat(language, { maximumFractionDigits: 4 }).format(value);
  return <><div className="page-heading"><p className="eyebrow">{t('UMC · Spatial learning')}</p><h1>{t('3D View')}</h1></div>

    <div className="scene-toolbar"><label>{t('Displayed condition')}<select value={displayedMode} disabled={referenceOnly} onChange={event => (()=>{setMode(event.target.value as 'upright' | 'trim' | 'heel' | 'teaching');if(event.target.value==='teaching'){setInspectorTab('inspect');setInspectorOpen(true);}})()}><option value="upright">{t('Upright reference')}</option><option disabled={!hasTrimView(ship)} value="trim">{t('Estimated trim')}</option><option disabled={!ship.manifest.resources.some(r=>['stability.cross-curves','stability.constant-lcb-cross-curves'].includes(r.kind)) || !!geometry.hull?.schematic&&!geometry.hull.model} value="heel">{t(ship.manifest.resources.some(r=>r.kind==='stability.constant-lcb-cross-curves')?'Calculated heel (constant LCB)':'Static heel (zero trim)')}</option><option disabled={!!geometry.hull?.schematic&&!geometry.hull.model} value="teaching">{t(geometry.hull?.schematic?'Imposed attitude (visual only)':'Didactical mode')}</option></select></label><button onClick={() => onTabChange('loading')}>{t('Edit loading')}</button><button onClick={()=>onTabChange('stability')}>{t('Review assessment')}</button><button aria-expanded={inspectorOpen} onClick={()=>setInspectorOpen(v=>!v)}>{t('Properties')}</button></div>

    {geometry.hull?.schematic && <details className="scene-limitations"><summary>{t('Reconstructed visual geometry')} · {t('Model limitations')}</summary><p>{t(geometry.hull.model ? 'Reconstructed exterior with documented cargo surfaces. Calculated attitudes reuse the shared stability results; the display mesh does not supply hydrostatics.' : 'Schematic hull · verified principal dimensions, generic outline. The waterline is an upright visual reference; hull offsets and the precise draft datum remain unverified. Trim is available only with suitable calculation data. Calculated heel requires cross curves. Imposed heel is visual only and does not preserve displaced volume.')}</p></details>}
    {result&&geometry.hull?.schematic&&(displayedMode ==='heel'||displayedMode ==='teaching')&&<p className="scene-exaggeration-banner" role="status">{t('Attitude display · displaced volume is not preserved by the reconstructed mesh. End drafts and flooding are not predicted.')}</p>}
    {geometry.hull?.schematic&&!ship.manifest.resources.some(r=>['stability.cross-curves','stability.constant-lcb-cross-curves'].includes(r.kind))&&<p className="muted">{t(ship.manifest.resources.some(r=>r.kind==='documentation.cross-curves-constant-lcb')?'Documented cross curves are included, but require a constant-LCB solver. Calculated heel is not enabled yet.':'No cross curves are supplied: calculated equilibrium heel is unavailable. Use Imposed heel for visual exploration.')}</p>}
    {result?.initialTrimReference&&<p className="scene-exaggeration-banner" role="status">{t('Calculated heel with initial trim reference. Pitch and vertical position use the unheeled loading condition; coupled heeled trim and draft are unavailable.')}</p>}
    {result?.warnings&&<details className="scene-limitations"><summary>{t('Heel calculation assumptions')}</summary><ul>{result.warnings.map(w=><li key={w}>{t(w)}</li>)}</ul></details>}
    {result?.illustrativeDrafts&&<p className="scene-exaggeration-banner" role="status">{t('Trim angle from tables · vertical placement is illustrative. The draft datum is unconfirmed; AP and FP draft measurements are unavailable.')}</p>}
    {displayedMode ==='trim'&&valid&&tcg!==0&&<p className="warnings">{t('Nonzero TCG: this is a longitudinal reference calculation, not the actual ship attitude.')}</p>}
    {referenceOnly&&<p className="scene-exaggeration-banner" role="status">{t('Upright reference preview: loading inputs are incomplete or updating. Drafts and centre of gravity use the original reference condition. Current cargo is hidden until the inputs are valid.')}</p>}
    <div className={'scene-workspace'+(inspectorOpen?'':' inspector-closed')}><div className="scene-column">
    {geometry.error ? <p role="alert">{t(geometry.error)}</p> : canDisplay && current?.error ? <p role="alert">{referenceOnly && <strong>{t('Upright reference preview unavailable')} · </strong>}{t(current.error)}{current.error==='No trim balance is bracketed by the available tables.'&&<><br/>{t('The available tables cannot balance this displacement and longitudinal centre of gravity. Calculated heel also requires that initial trim balance. Review the loading and ballast, or use Upright reference or Imposed attitude for visual inspection. No extrapolation is applied.')}</>}</p> : canDisplay && !current ? <p role="status">{t(referenceOnly ? 'Preparing the upright reference preview…' : 'Preparing the 3D condition…')}</p> : null}
    {!valid && <p role="status">{t(conditionMessage || 'Complete the shared loading inputs before opening the 3D view.')}</p>}
    {lastData.current && geometry.hull && <div className="scene-viewport" hidden={!data}><Ship3DCanvas draftsUnavailable={!!result?.illustrativeDrafts || !!geometry.hull?.schematic&&(displayedMode ==='heel'||displayedMode ==='teaching')} settingsTarget={displayTarget} referenceOnly={referenceOnly} panelMode={tweenDeck} weights={referenceOnly ? [] : markers} selectedWeight={weightId} onSelectWeight={id=>{setWeightId(id);setInspectorTab('inspect');setInspectorOpen(true);}} hull={geometry.hull} data={lastData.current} selected={selected} onSelect={() => {setSelected(value=>!value);setInspectorTab('condition');setInspectorOpen(true);}}/></div>}
    </div><aside hidden={!inspectorOpen} className="scene-inspector" aria-label={t('3D inspector')}><button className="mobile-inspector-close" onClick={()=>setInspectorOpen(false)}>{t('Close properties')}</button><div className="inspector-tabs" role="tablist">{(['display','condition','inspect'] as const).map(v=><button role="tab" aria-selected={inspectorTab===v} key={v} onClick={()=>setInspectorTab(v)}>{t({display:'Display',condition:'Condition',inspect:'Inspect'}[v])}</button>)}</div><div hidden={inspectorTab!=='display'}><div className="scene-settings-drawer" ref={setDisplayTarget}/></div><div hidden={inspectorTab!=='condition'}>{referenceOnly&&<section className="panel"><h2>{t('Upright visual reference only')}</h2><p>{reference.symbol('LCG')}: {fmt(reference.toDisplay('x',displayLcg))} m<br/>{reference.symbol('TCG')}: {fmt(reference.toDisplay('y',displayTcg))} m<br/>{reference.symbol('KG')}: {fmt(reference.toDisplay('z',displayVcg))} m</p><button onClick={()=>onTabChange('trim')}>{t('Open Trim & Drafts')}</button></section>}    {result && !referenceOnly && <section className="panel scene-results"><h2>{t('Displayed condition')}</h2><dl className="summary-grid">{([
      ['Displacement', displacementTonnes, 't'], ['Water density', density, 't/m³'], ...(displayedMode === 'teaching' ? [['Even-keel reference draft', result.draftAft, 'm'], ['Imposed angle', teachingAxis === 'heel' ? teachingHeel*reference.heelSign : teachingTrim*reference.trimSign, '°']] as const : displayedMode === 'heel' ? [...(result.initialTrimReference ? [['Initial reference draft at AP', result.draftAft, 'm'], ['Initial reference draft at FP', result.draftForward, 'm'], ['Initial reference trim angle', result.trimDeg * reference.trimSign, '°']] as const : [['Even-keel reference draft', result.draftAft, 'm']] as const), ['Equilibrium heel', (result.heelDeg ?? 0)*reference.heelSign, '°']] as const : result.illustrativeDrafts ? [] : [['Draft at AP', result.draftAft, 'm'], ['Draft at FP', result.draftForward, 'm']] as const), ...(displayedMode === 'teaching' || displayedMode ==='heel'&&ship.manifest.resources.some(r=>r.kind==='stability.constant-lcb-cross-curves') ? [] : [['Trim angle', result.trimDeg * reference.trimSign, '°']] as const),
    ] as const).map(([label, value, unit]) => <div key={label}><dt>{t(label)}</dt><dd>{fmt(value)} {unit}</dd></div>)}</dl>
      {selected && <div className="gravity-inspector" role="status"><h3>{t('G · Physical centre of gravity')}</h3><p>{reference.symbol('LCG')}: {fmt(reference.toDisplay('x', lcg))} m · {reference.symbol('TCG')}: {fmt(reference.toDisplay('y', tcg))} m · {reference.symbol('KG')}: {fmt(reference.toDisplay('z', vcg))} m</p><p>{t('These coordinates follow the selected reference. G uses physical KG; free-surface corrections do not move this marker.')}</p></div>}
    </section>}
</div><div hidden={inspectorTab!=='inspect'}>
    {displayedMode === 'teaching' && <section className="panel weight-movement"><h2>{t('Large-angle exploration')}</h2>
      <p className="scene-exaggeration-banner" role="status">{t('Imposed attitude · not calculated equilibrium')}</p>

      <label>{t('Rotation axis')} <select aria-label={t('Rotation axis')} value={teachingAxis} onChange={event => setTeachingAxis(event.target.value as 'heel' | 'trim')}><option value="heel">{t('Heel')}</option><option value="trim">{t('Trim')}</option></select></label>
      <label>{t('Imposed angle')} <output>{((teachingAxis === 'heel' ? teachingHeel*reference.heelSign : teachingTrim*reference.trimSign)).toFixed(1)}°</output><input aria-label={t('Imposed angle')} type="range" min={teachingAxis === 'heel' ? -90 : -45} max={teachingAxis === 'heel' ? 90 : 45} step={0.5} value={teachingAxis === 'heel' ? teachingHeel*reference.heelSign : teachingTrim*reference.trimSign} onChange={event => teachingAxis === 'heel' ? setTeachingHeel(Number(event.target.value)*reference.heelSign) : setTeachingTrim(Number(event.target.value)*reference.trimSign)}/></label>
      <div className="scene-toolbar">{[0,15,30,45,...(teachingAxis === 'heel' ? [60,90] : [])].map(angle => <button key={angle} onClick={() => teachingAxis === 'heel' ? setTeachingHeel(angle*reference.heelSign) : setTeachingTrim(angle*reference.trimSign)}>{angle}°</button>)}</div>
      <button onClick={() => {setTeachingHeel(0);setTeachingTrim(0);}}>{t('Reset teaching angles')}</button>
      <details className="inspector-help"><summary>{t('Teaching notes')}</summary><p>{t(geometry.hull?.schematic?'The reconstructed model rotates about the centreline at its upright reference water level. Displaced volume is not preserved. Cargo and tanks do not shift or spill; this is not equilibrium or a stability assessment.':'Explore one axis at a time. The sealed rectangular hull keeps the same displaced volume. These controls change only the illustration; loading and equilibrium calculations stay unchanged.')}</p><p>{t('Deck immersion is shown geometrically. Openings, flooding, waves and dynamic motion are not modelled. Large pitch is a geometric demonstration, not an extension of the small-trim solver.')}</p></details>
    </section>}
    <CargoSpecifications item={weights.find(w=>w.id===weightId)}/>
    {!referenceOnly && displayedMode !== 'teaching' && (fromWeights && weightId ? <WeightMovement history={movementHistory} ship={ship} weights={weights.filter(w=>isCargo(ship,w))} setWeights={setWeights} selectedId={weightId} onSelect={setWeightId} onMove={axis => setMode(axis === 'tcg' ? ship.manifest.resources.some(r=>['stability.cross-curves','stability.constant-lcb-cross-curves'].includes(r.kind)) ? 'heel' : 'upright' : hasTrimView(ship) ? 'trim' : 'upright')}/> : <p>{t('Select cargo in the ship view to inspect or move it.')}</p>)}
    </div></aside></div>
    <details className="panel scene-help"><summary>{t('About this view')}</summary>    <p className="muted">{t(geometry.hull?.schematic ? 'The schematic is for spatial orientation only and is not used in hydrostatic calculations.' : 'The pontoon is drawn from its declared dimensions, with true proportions by default. Optional trim exaggeration is labelled in the scene. AP marks the stern perpendicular and FP the bow perpendicular. Manual draft edits update this view automatically.')}</p><p className="muted">{t(referenceOnly ? 'Upright visual reference only' : displayedMode === 'teaching' ? 'Didactical mode imposes an angle; it does not solve equilibrium. Return to Static heel or Estimated trim to view calculated attitudes.' : displayedMode === 'heel' ? geometry.hull?.schematic?'Heel angle uses the shared corrected GZ curve. For constant-LCB data, pitch uses the initial trim calculation. This is not a coupled solution of heeled trim and draft.':'Heel-only equilibrium uses the interpolated corrected GZ curve at zero trim. The rectangular hull waterline preserves displaced volume. This is not coupled heel and trim equilibrium or stability approval.' : displayedMode === 'trim' ? 'Estimated trim uses the vessel’s trim method and shared inputs. Table LCB balance does not solve coupled heel and trim or establish stability. A trimmed buoyancy centre is not shown.' : 'Upright mode displays an even-keel reference, not a solved list or trim equilibrium. Water density follows the shared condition. Select Estimated trim to use the longitudinal calculation.')}</p></details>
  </>;
}
