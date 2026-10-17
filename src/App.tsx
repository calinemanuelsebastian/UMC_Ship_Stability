import {SecuringAssessment} from './components/securing-assessment';
import {FinalAssessment} from './components/final-assessment';
import {UserGuide,GuideLink} from './app/user-guide';
import {InformationFooter,InformationPageView} from './app/site-information';
import {useInformationPage,showInformation} from './app/site-information-state';
import {OnboardEquipment} from './components/onboard-equipment';
import {planDeckChange} from './app/onboard-operations';
import {conditionTransaction,conditionRevision,canUndoCondition,type ConditionTransaction} from './app/condition-transaction';
import {loadingSteps,nextLoadingStep} from './app/loading-workflow';
import {CargoCapacity} from './components/cargo-capacity';
import {defaultCapacitySettings,type CapacitySettings,type CapacityCargoTemplate} from './app/cargo-capacity';
import {ConditionSummary} from './components/condition-summary';
import {AssessmentContext,assessmentKey,type AssessmentSettings} from './app/assessment-settings';
import {AssessmentReportExport} from './components/assessment-report-export';
import {LoadingConditionPresets} from './components/loading-condition-presets';
import {ShipLibrary} from './components/ship-library';
import {shipLibrary,loadLocalShip,type LocalShipRecord} from './platform/ship-models/local-ship-models';
import {shipResourceUrl} from './core/domain/ship-resource';
import { Home } from './features/home';
import {readNavigation,writeNavigation,type LoadingSection} from './app/navigation';
import {panelWeight,parseDeckMode,type TweenDeckMode} from './app/tween-deck';
import { TankControls } from './components/tank-controls';
import { cleanLoadingPlan, loadTankCatalog, normalizeTankWeights, isFixedWeight, type TankCatalog } from './app/tank-operations';
import { cargoSurfaces, restoredCargoArea } from './app/cargo-surfaces';
import { CargoPlanner } from './components/cargo-planner';
import type { CargoArea } from './app/cargo-layout';
import { CargoPlans } from './components/cargo-plans';
import type { ScenarioState } from './app/saved-scenarios';
import type { ReactNode, SetStateAction } from 'react';
import { SavedScenarios } from './components/saved-scenarios';
import { MovementHistory } from './app/movement-history';
import { TrimEquilibrium } from './features/trim-equilibrium';
import { createPortal } from 'react-dom';
import { ReferenceProvider, ReferenceSettings } from './components/reference-settings';
import { LanguageSwitch } from './app/language';
import { useLanguage } from './app/language-context';
import { lazy, Suspense, useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { FeatureBoundary } from './components/feature-boundary';
const loadViewer = () => lazy(() => import('./features/ship-3d-view'));
import { type TabId } from './app/tabs';
import { TabBar } from './components/tab-bar';
import { SelectInput } from './components/select-input';
import { HydrostaticSandbox } from './features/hydrostatic-sandbox';
import { LoadingCondition } from './features/loading-condition';
import { RollSimulation } from './features/roll-simulation';
import { StabilityCurves } from './features/stability-curves';
import { computeUprightHydrostatics } from './core/hydrostatics/compute-upright-hydrostatics';
import { Validation } from './features/validation';
import { Theory } from './features/theory';
import { loadBuiltInShipModel, loadBuiltInShipModelRegistry, type BuiltInShipModelRegistryEntry } from './platform/ship-models/built-in-ship-model-source';
import { draftWeights, evaluateWeights, type WeightDraft } from './app/loading-state';
import { loadLoadingWeights } from './platform/ship-models/load-loading-weights';
import { NumberInput } from './components/number-input';
import type { ShipModelPackage } from './core/domain/ship-model';
function App() {
    const informationPage=useInformationPage();
    const { t } = useLanguage();
    const [referenceTarget, setReferenceTarget] = useState<HTMLDivElement | null>(null);
    const [activeTab, setActiveTab] = useState<TabId>(()=>readNavigation(new URL(window.location.href),[]).page);
    const [models, setModels] = useState<BuiltInShipModelRegistryEntry[]>([]);
    const [modelId, setModelId] = useState('');
    const [error, setError] = useState('');
    const [libraryOpen,setLibraryOpen]=useState(false);
    const [localShips,setLocalShips]=useState<LocalShipRecord[]>([]);
    const refreshLibrary=async()=>{const records=await shipLibrary('list');setLocalShips(records);setModels(previous=>[...previous.filter(m=>!m.id.startsWith('local-')),...records.map(r=>({id:r.id,name:r.name+' (Local)',path:''}))]);};
    useEffect(() => {
        let active = true;
        Promise.all([loadBuiltInShipModelRegistry(),shipLibrary('list').catch(()=>{if(active)setError('Local ship storage is unavailable. Built-in ships remain available.');return [] as LocalShipRecord[];})]).then(([registry,records]) => {
            registry={...registry,models:[...registry.models,...records.map(r=>({id:r.id,name:r.name+' (Local)',path:''}))]};
            if(active)setLocalShips(records);
            if (active) {
                setModels(registry.models);
                const route=readNavigation(new URL(window.location.href),registry.models.map(m=>m.id));
                setModelId(route.vessel);setActiveTab(route.page);writeNavigation({page:route.page,vessel:route.vessel},true);
            }
        }).catch(reason => { if (active)
            setError(reason instanceof Error ? reason.message : 'Could not load registry.'); });
        return () => { active = false; };
    }, []);
    useEffect(()=>{
      if(!models.length)return;
      const restore=()=>{const route=readNavigation(new URL(window.location.href),models.map(m=>m.id));setActiveTab(route.page);setModelId(route.vessel);};
      window.addEventListener('popstate',restore);window.addEventListener('hashchange',restore);
      return ()=>{window.removeEventListener('popstate',restore);window.removeEventListener('hashchange',restore);};
    },[models]);
    const changeTab=(page:TabId)=>{if(informationPage)showInformation(null);writeNavigation({page,vessel:modelId});setActiveTab(page);};
    const changeModel=(vessel:string)=>{writeNavigation({page:activeTab,vessel});setModelId(vessel);};
    return <><header className="app-header"><span className="brand">{t("UMC")}<span>{t(" / Ship Stability")}</span></span><span className="version">{t("Teaching simulator \u00B7 Ship stability")}</span><div className="header-controls"><div ref={setReferenceTarget}/><button onClick={()=>setLibraryOpen(v=>!v)}>{t("Ship library")}</button><GuideLink>{t("Help & documentation")}</GuideLink><LanguageSwitch /></div></header><TabBar activeTab={activeTab} onChange={changeTab}/><main hidden={!!informationPage} data-page={activeTab}>
    {t(error && <p role="alert" className="error">{t(error)}</p>)}
    {libraryOpen&&<ShipLibrary records={localShips} activeId={modelId} onRefresh={refreshLibrary} onUse={changeModel} onClose={()=>setLibraryOpen(false)}/>}
    {t(modelId && <ModelWorkspace modelPicker={<SelectInput label={t("Ship model")} value={modelId} options={models.map(model => ({ value: model.id, label: model.name }))} onChange={changeModel}/>} referenceTarget={referenceTarget} key={modelId} modelId={modelId} activeTab={activeTab} onTabChange={changeTab}/>)}
  </main>{informationPage&&((informationPage==='guide'||informationPage==='capabilities')?<UserGuide/>:<InformationPageView page={informationPage}/>)}<footer><InformationFooter/>{t("UMCsShipStabilityApp \u00B7 Hydrostatics learning workspace")}</footer></>;
}
function ModelWorkspace({ modelPicker, modelId, activeTab, onTabChange, referenceTarget }: {
    modelPicker: ReactNode;
    referenceTarget: HTMLDivElement | null;
    modelId: string;
    activeTab: TabId;
    onTabChange: (tab: TabId) => void;
}) {
    const { t } = useLanguage();
    const [ship, setShip] = useState<ShipModelPackage>();
    const [error, setError] = useState('');
    const [loadAttempt,setLoadAttempt]=useState(0);
    useEffect(() => {
        setError('');
        let active = true;
        let mounted:ShipModelPackage|undefined;
        (modelId.startsWith('local-')?loadLocalShip(modelId):loadBuiltInShipModel(modelId)).then(value => { if (active){
            mounted=value;setShip(value); }else value.release?.(); }).catch(reason => { if (active)
            setError(reason instanceof Error ? reason.message : 'Could not load model.'); });
        return () => { active = false; mounted?.release?.(); };
    }, [modelId,loadAttempt]);
    if (error)
        return <div role="alert" className="error"><p>{t(error)}</p><button onClick={()=>setLoadAttempt(n=>n+1)}>{t('Retry vessel loading')}</button></div>;
    if (!ship)
        return <p role="status">{t("Loading ship model\u2026")}</p>;
    return <ReferenceProvider ship={ship}>{referenceTarget && createPortal(<ReferenceSettings ship={ship}/>, referenceTarget)}<Simulator modelPicker={modelPicker} ship={ship} activeTab={activeTab} onTabChange={onTabChange}/></ReferenceProvider>;
}
function Simulator({ modelPicker, ship, activeTab, onTabChange }: {
    modelPicker: ReactNode;
    ship: ShipModelPackage;
    activeTab: TabId;
    onTabChange: (tab: TabId) => void;
}) {
    const { t } = useLanguage();
    const defaults = ship.manifest.defaultCondition;
    const [recoveryAvailable,setRecoveryAvailable]=useState(false);
    const [assessment,setAssessment]=useState<AssessmentSettings>({});
    const [Ship3DView, setViewer] = useState(loadViewer);
    const [studyRequested,setStudyRequested]=useState(false);
    const [conditionName,setConditionName]=useState('Working condition');
    const [savedRevision,setSavedRevision]=useState('');
    const [teachingView,setTeachingView]=useState(false);
    const [conditionEntry,setConditionEntry]=useState<'preset'|'create'|null>(null);
    const openSavedCondition=()=>{const menu=document.getElementById('save-open-menu') as HTMLDetailsElement|null;const panel=document.getElementById('condition-snapshots') as HTMLDetailsElement|null;if(menu)menu.open=true;if(panel){panel.open=true;panel.querySelector('select')?.focus();panel.scrollIntoView({block:'start'});}};
    const [saveRequest,setSaveRequest]=useState<{name:string;id:number}>();
    const [loadingSection, setLoadingSection] = useState<LoadingSection>(()=>readNavigation(new URL(window.location.href),[]).section);
    const [planIntent,setPlanIntent]=useState<{mode:'save'|'open';id:number}>();
    const planReturnSection=useRef<LoadingSection>('layout');
    function openPlans(mode:'save'|'open'){if(loadingSection!=='plans')planReturnSection.current=loadingSection;setLoadingSection('plans');writeNavigation({page:'loading',section:'plans'});setPlanIntent({mode,id:Date.now()});}
    const nextLoading=nextLoadingStep(loadingSection);
    useEffect(()=>{const restore=()=>setLoadingSection(readNavigation(new URL(window.location.href),[]).section);window.addEventListener('popstate',restore);return ()=>window.removeEventListener('popstate',restore);},[]);
    const [cargoArea,setCargoArea] = useState<CargoArea|undefined>(() => {
      const documented=cargoSurfaces(ship);if(documented.length)return documented[0];
      const d=ship.manifest.principalDimensions, c=ship.manifest.coordinateSystem;
      if(!ship.manifest.resources.some(r=>r.kind==='visualization.box-hull') || d.mouldedDepth===undefined || c.longitudinalOriginFromAP===undefined) return undefined;
      const sign=c.xPositive==='forward'?1:-1, a=-c.longitudinalOriginFromAP*sign,b=(d.lbp-c.longitudinalOriginFromAP)*sign;
      return {name:'Pontoon deck',xMin:Math.min(a,b),xMax:Math.max(a,b),yMin:-d.beam/2,yMax:d.beam/2,deckZ:d.mouldedDepth};
    });
    const [scenario, setScenario] = useState<'loading' | 'manual'>('loading');
    const movementHistory = useRef(new MovementHistory()).current;
    const [weights, rawSetWeights] = useState<WeightDraft[]>([]);
    const [tweenDeck,setTweenDeck]=useState<TweenDeckMode>('installed');
    const deckModeRef=useRef<TweenDeckMode>('installed');
    const fixedWeights = useRef<WeightDraft[]>([]);
    const referenceWeights = useRef<WeightDraft[]>([]);
    const [previousDeck,setPreviousDeck]=useState<ConditionTransaction>();
    const [deckError,setDeckError]=useState('');
    const [previousPlan,setPreviousPlan]=useState<ConditionTransaction>();
    const [tankCatalog,setTankCatalog]=useState<TankCatalog>();
    const tankCatalogRef=useRef<TankCatalog|undefined>(undefined);
    const setWeights = useCallback((value: SetStateAction<WeightDraft[]>) => rawSetWeights(previous => {
      const next = normalizeTankWeights(ship,typeof value === 'function' ? value(previous) : value,tankCatalogRef.current);
      return [...next.map(w => fixedWeights.current.some(f=>f.id===w.id)?panelWeight(fixedWeights.current.find(f=>f.id===w.id)!,deckModeRef.current,ship):w), ...fixedWeights.current.filter(f => !next.some(w => w.id === f.id)).map(f=>panelWeight(f,deckModeRef.current,ship))];
    }), [ship]);
    const [ready, setReady] = useState(false);
    const [loadError, setLoadError] = useState('');
    const [weightLoadAttempt,setWeightLoadAttempt]=useState(0);
    useEffect(() => {
        let active = true;
        setReady(false);setLoadError('');
        Promise.all([loadLoadingWeights(ship),loadTankCatalog(ship)]).then(([items,catalog]) => { if (active) {
          tankCatalogRef.current=catalog;setTankCatalog(catalog);
          const drafts = draftWeights(items);referenceWeights.current=drafts;
          fixedWeights.current = drafts.filter(w => isFixedWeight(ship,w.id));
          setWeights(catalog?cleanLoadingPlan(ship,drafts,catalog):drafts);setReady(true);
        } })
          .catch(error => { if (active) setLoadError(error instanceof Error ? error.message : 'Unable to load weights.'); });
        return () => { active = false; };
    }, [ship, setWeights,weightLoadAttempt]);
    const [restoreVersion, setRestoreVersion] = useState(0);
    const loading = useMemo(() => evaluateWeights(weights), [weights]);
    const [manual, setManual] = useState<{ vcg?: number; lcg?: number; tcg?: number; displacementTonnes?: number; freeSurfaceMomentTransverse?: number }>({ vcg: defaults.vcg, lcg: defaults.lcg, tcg: defaults.tcg, displacementTonnes: defaults.displacementTonnes, freeSurfaceMomentTransverse: defaults.freeSurfaceMomentTransverse ?? 0 });
    const [manualMode, setManualMode] = useState<'draft' | 'displacement'>(defaults.draft === undefined ? 'displacement' : 'draft');
    const [draft, setDraft] = useState<number | undefined>(defaults.draft);
    const [capacityCargo,setCapacityCargo]=useState<CapacityCargoTemplate>();
    const [capacity,setCapacity]=useState<CapacitySettings>({...defaultCapacitySettings});
    const [density, setDensity] = useState<number | undefined>(defaults.waterDensity);
    const [longitudinalFsm, setLongitudinalFsm] = useState<number | undefined>(0);
    const fromWeights = scenario === 'loading';
    const values = fromWeights ? loading.result ?? {} : manual;
    const { vcg, lcg, tcg, freeSurfaceMomentTransverse } = values;
    const mode = fromWeights ? 'displacement' : manualMode;
    const input = mode === 'draft' ? draft : values.displacementTonnes;
    const key = JSON.stringify([scenario, mode, input, vcg, lcg, tcg, freeSurfaceMomentTransverse, density]);
    const valid = (!fromWeights || ready && !!loading.result) && [input, vcg, lcg, tcg, freeSurfaceMomentTransverse, density].every(n => n !== undefined && Number.isFinite(n)) && density! > 0;
    const [resolved, setResolved] = useState<{ ship:ShipModelPackage; key: string; mass?: number; error?: string }>();
    useEffect(() => {
        let active = true;
        if (!valid) return;
        const timer = setTimeout(() => {
            computeUprightHydrostatics(ship, { draft: mode === 'draft' ? input : undefined, displacementTonnes: mode === 'displacement' ? input : undefined, vcg: vcg!, lcg: lcg!, tcg: tcg!, waterDensity: density!, freeSurfaceMomentTransverse, heelDeg: 0, trimDeg: 0 })
              .then(result => { if (active) setResolved({ ship, key, mass: result.displacementTonnes, error: result.displacementTonnes === undefined ? 'Displacement is unavailable.' : undefined }); })
              .catch(error => { if (active) setResolved({ ship, key, error: error instanceof Error ? error.message : 'Calculation failed.' }); });
        }, 300);
        return () => { active = false; clearTimeout(timer); };
    }, [ship, valid, key, mode, input, vcg, lcg, tcg, density, freeSurfaceMomentTransverse]);
    const current = resolved?.ship === ship && resolved.key === key ? resolved : undefined;
    const pending = !valid || !current || !!current.error;
    const displacementTonnes = mode === 'draft' ? !pending ? current?.mass : undefined : values.displacementTonnes;
    const update = (field: keyof typeof manual) => (value: number | undefined) => setManual(previous => ({ ...previous, [field]: value }));
    const shared = { ship, displacementTonnes, vcg, tcg, freeSurfaceMomentTransverse, pending };
    const editable = { readOnly: fromWeights, onDisplacementChange: (value: number | undefined) => { setManualMode('displacement'); update('displacementTonnes')(value); }, onVcgChange: update('vcg'), onTcgChange: update('tcg'), onFreeSurfaceMomentChange: update('freeSurfaceMomentTransverse') };
    const status = loadError ? 'Vessel data could not be loaded. Use Retry vessel weights.' : fromWeights && !ready ? 'Loading model weights…' : fromWeights && !loading.result ? loading.error : !valid ? 'Complete all shared inputs. Results are awaiting valid input.' : current?.error ?? (pending ? 'Updating all calculation tabs…' : 'All calculation tabs use the current condition.');
    const planState=useMemo<ScenarioState>(()=>({capacity,assessment,tweenDeck,scenario,weights,manual,manualMode,draft,density,longitudinalFsm,cargoArea}),[capacity,assessment,tweenDeck,scenario,weights,manual,manualMode,draft,density,longitudinalFsm,cargoArea]);
    const currentRevision=useMemo(()=>savedRevision?conditionRevision(planState):'', [savedRevision,planState]);
    const restoreState = (value: ScenarioState, name?:string) => {
      setConditionName(name??'Restored condition');setSavedRevision('');setStudyRequested(false);
      setPreviousDeck(undefined);setDeckError('');setPreviousPlan(undefined);setSaveRequest(undefined);setCapacityCargo(undefined);
      setCapacity(value.capacity??{...defaultCapacitySettings});
      setAssessment(value.assessment??{});
      value={...value,weights:normalizeTankWeights(ship,value.weights,tankCatalogRef.current)};
      deckModeRef.current=parseDeckMode(value.tweenDeck);setTweenDeck(deckModeRef.current);
      setCargoArea(restoredCargoArea(ship,deckModeRef.current,value.cargoArea));
      setScenario(value.scenario); setWeights(value.weights); setManual(value.manual); setManualMode(value.manualMode); setDraft(value.draft); setDensity(value.density); setLongitudinalFsm(value.longitudinalFsm);
      movementHistory.clear(); setRestoreVersion(version => version+1);
    };
    const changeDeck=(mode:TweenDeckMode)=>{
      const plan=planDeckChange(ship,weights,mode);
      if(plan.blocked.length){setDeckError('Move or remove cargo affected by this deck configuration before applying.');return;}
      const nextArea=plan.surfaces.find(a=>a.id===cargoArea?.id||a.sourceIds?.includes(cargoArea?.id??'')||!!cargoArea?.id&&a.id?.startsWith(cargoArea.id+'-lower'))??plan.surfaces[0];
      setPreviousDeck(conditionTransaction(planState,{...planState,tweenDeck:mode,weights:plan.weights,cargoArea:nextArea}));
      setDeckError('');deckModeRef.current=mode;setTweenDeck(mode);setWeights(plan.weights);setCargoArea(nextArea);movementHistory.clear();
    };
    return <AssessmentContext.Provider value={{conditionKey:assessmentKey({displacementTonnes,lcg,vcg,tcg,freeSurfaceMomentTransverse,waterDensity:density,longitudinalFsm}),weights:fromWeights?weights:undefined,settings:assessment,setSettings:setAssessment}}>
      <section className="active-context" aria-label={t('Active workspace context')} data-study={activeTab==='view3d'&&studyRequested}><div><strong>{t(activeTab==='view3d'&&studyRequested?'Documented simulation — read-only':activeTab==='view3d'&&teachingView?'Teaching view — imposed position':fromWeights?'Active calculation':'Manual calculation override')}</strong><span>{activeTab==='view3d'&&studyRequested?`${t('Active plan retained')}: `:''}{ship.manifest.name} · {t(conditionName)}</span></div>{activeTab==='view3d'&&studyRequested?<button onClick={()=>setStudyRequested(false)}>{t('Return to active condition')}</button>:<div><span>{t(savedRevision?(currentRevision===savedRevision?'Named copy saved':'Changes since named save'):'Working copy — no named save in this session')}</span><button onClick={()=>setSaveRequest({name:t(conditionName),id:Date.now()})}>{t('Save condition')}</button></div>}</section>
      {!(activeTab==='view3d'&&studyRequested)&&<ConditionSummary hideIdentity name={ship.manifest.name} fromWeights={fromWeights} displacement={valid?displacementTonnes:undefined} kg={valid?vcg:undefined} density={density} fsm={valid?freeSurfaceMomentTransverse:undefined}/>}
      {loadError&&<div role="alert"><p>{t(loadError)}</p><p>{t('Vessel weights are not ready. Editing and saving remain unavailable until loading succeeds.')}</p><button onClick={()=>setWeightLoadAttempt(n=>n+1)}>{t('Retry vessel weights')}</button></div>}
      {recoveryAvailable&&<p role="status">{t('A recovery draft is available. Review it or keep the current condition to resume automatic saving.')} <button onClick={()=>{setLoadingSection('plans');writeNavigation({page:'loading',section:'plans'});onTabChange('loading');}}>{t('Review recovery draft')}</button></p>}
      <div className="workspace-utilities">
      <details className="shared-condition-drawer"><summary>{t('Start / open condition')}</summary><section className="condition-bar" aria-label={t('Shared condition')}>
        <fieldset><legend>{t('Ship')}</legend>{modelPicker}</fieldset>

      </section>
      <div className="condition-entry-actions" role="group" aria-label={t('Start / open condition')}><button aria-pressed={conditionEntry==='preset'} onClick={()=>setConditionEntry('preset')}>{t('Use a preset')}</button><button aria-pressed={conditionEntry==='create'} onClick={()=>setConditionEntry('create')}>{t('Create a condition')}</button><button onClick={openSavedCondition}>{t('Open saved condition')}</button></div>
      {conditionEntry&&ready&&tankCatalog&&<LoadingConditionPresets key={conditionEntry} entryMode={conditionEntry} onInspect={()=>{const drawer=document.querySelector<HTMLDetailsElement>('.shared-condition-drawer');if(drawer)drawer.open=false;setStudyRequested(false);onTabChange('view3d');}} ship={ship} catalog={tankCatalog} reference={referenceWeights.current} canUndo={canUndoCondition(previousPlan,planState)} onUndo={()=>{if(previousPlan&&canUndoCondition(previousPlan,planState)){restoreState(previousPlan.before);setPreviousPlan(undefined);}}} onApply={(next,deck,waterDensity,name)=>{setStudyRequested(false);setConditionName(name);setSavedRevision('');setCapacityCargo(undefined);const nextArea=cargoSurfaces(ship,deck)[0];const normalized=normalizeTankWeights(ship,next,tankCatalogRef.current).map(w=>fixedWeights.current.some(f=>f.id===w.id)?panelWeight(fixedWeights.current.find(f=>f.id===w.id)!,deck,ship):w);setPreviousPlan(conditionTransaction(planState,{...planState,weights:normalized,tweenDeck:deck,scenario:'loading',density:waterDensity,longitudinalFsm:0,cargoArea:nextArea}));deckModeRef.current=deck;setTweenDeck(deck);setScenario('loading');setDensity(waterDensity);setLongitudinalFsm(0);setWeights(next);setCargoArea(cargoSurfaces(ship,deck)[0]);movementHistory.clear();setRestoreVersion(version=>version+1);}}/>}
        <details className="advanced-condition-settings"><summary>{t('Advanced calculation settings')}</summary><SelectInput label={t('Condition source')} value={scenario} options={[{ value: 'loading', label: 'Weight-based loading' }, { value: 'manual', label: 'Manual scenario' }]} onChange={value => setScenario(value as 'loading' | 'manual')}/>
        <div className="condition-settings-body"><div className="curve-inputs"><NumberInput label={t('Surrounding water density (t/m³)')} value={density} onChange={setDensity} min={0}/><NumberInput label={t('Longitudinal FSM (t·m)')} value={longitudinalFsm} onChange={setLongitudinalFsm} min={0}/></div><p className="muted">{t(fromWeights ? 'Edit cargo and tanks in Loading. Valid changes update every calculation tab automatically.' : 'Manual inputs are separate from the weight list. Change draft or displacement in Hydrostatic Sandbox; all tabs follow this manual scenario.')}</p></div>
        </details>
      </details>
      <details id="save-open-menu" className="shared-condition-drawer save-export-drawer" key={saveRequest?.id} open={saveRequest?true:undefined}><summary>{t('Save & open')}</summary><section className="condition-bar">
        <div className="scene-toolbar"><button onClick={()=>setSaveRequest({name:'',id:Date.now()})}>{t('Save condition')}</button><button onClick={openSavedCondition}>{t('Open saved condition')}</button><button onClick={()=>{openPlans('open');onTabChange('loading');}}>{t('Loading plans and recovery')}</button><GuideLink topic="save"/></div>
        <details><summary>{t('Saving and backup help')}</summary><p>{t('Condition snapshots preserve all inputs, including manual scenarios. Loading plans use weight-based loading. Each library has its own JSON import and backup; assessment reports contain results.')}</p></details>
        <details><summary>{t('Export assessment report')}</summary><AssessmentReportExport ship={ship} state={planState} inputs={{pending,displacementTonnes,lcg,vcg,tcg,freeSurfaceMomentTransverse,waterDensity:density,longitudinalFsm}}/></details>
        <SavedScenarios onSaved={(name,value)=>{if(name)setConditionName(name);setSavedRevision(value?conditionRevision(value):'');}} catalog={tankCatalog} saveRequest={saveRequest} ship={ship} ready={ready} state={planState} onRestore={restoreState}/>

      </section></details>
      </div>
      {status!=='All calculation tabs use the current condition.'&&<p className={pending?'condition-status pending':'condition-status'} role="status">{t(status?.replace(/\d+\.\d{5,}/g,n=>Number(n).toFixed(3)))}</p>}
      {ship.manifest.reviewNotes&&<details className="hydro-audit"><summary>{t('Hydrostatic table corrections — calculation review required')}</summary>{ship.manifest.reviewNotes.messages.map(message=><p key={message}>{t(message)}</p>)}{ship.manifest.resources.filter(r=>r.path&&ship.manifest.reviewNotes?.resourceIds.includes(r.id)).map(r=><a key={r.id} href={shipResourceUrl(ship,r.path!)} download>{t(r.label??r.id)} </a>)}</details>}

      {activeTab === 'home' && <Home onTabChange={onTabChange} onLoadingSection={section=>{writeNavigation({page:'loading',section});setLoadingSection(section);onTabChange('loading');}}/>}
      <div hidden={activeTab !== 'hydrostatics'}><HydrostaticSandbox {...shared} {...editable} waterDensity={density} draft={draft} onDraftChange={setDraft} mode={mode} onModeChange={value => { setManualMode(value); if (value === 'displacement' && manual.displacementTonnes === undefined) setManual(previous => ({ ...previous, displacementTonnes: current?.mass })); }} centres={{ lcg, tcg }}/></div>
      <div hidden={activeTab !== 'loading'}>
        <div className="page-heading compact-heading loading-heading"><h1>{t('Loading')}</h1><GuideLink topic={loadingSection==='onboard'||loadingSection==='tanks'?'onboard':loadingSection==='capacity'?'capacity':loadingSection==='layout'?'layout':loadingSection==='ballast'?'ballast':loadingSection==='plans'?'save':'assessment'}/></div>{!fromWeights&&<p role="status">{t('Manual scenario is active. Loading edits are saved but do not drive the assessment.')} <button onClick={()=>setScenario('loading')}>{t('Use weight-based loading')}</button></p>}

        <nav className="workspace-nav" aria-label={t('Loading sections')}>
          {loadingSteps.filter(([id])=>id!=='capacity').map(([id,label])=><button key={id} aria-current={loadingSection===id||id==='layout'&&loadingSection==='capacity'||id==='onboard'&&loadingSection==='tanks'?'page':undefined} onClick={()=>{writeNavigation({page:'loading',section:id});setLoadingSection(id);}}>{t(id==='layout'?'Cargo':id==='onboard'?'Onboard supplies':label)}</button>)}
        </nav>
        {(loadingSection==='layout'||loadingSection==='capacity')&&<nav className="workspace-nav cargo-task-nav" aria-label={t('Cargo tasks')}>{[['layout','Arrange cargo'],['capacity','Estimate capacity']].map(([id,label])=><button key={id} aria-current={loadingSection===id?'page':undefined} onClick={()=>{setLoadingSection(id as LoadingSection);writeNavigation({page:'loading',section:id as LoadingSection});}}>{t(label)}</button>)}</nav>}
        {loadingSection==='capacity'&&<CargoCapacity ship={ship} weights={weights} deck={tweenDeck} density={density} onDensityChange={setDensity} settings={capacity} onChange={setCapacity} onUseCargo={cargo=>{setCapacityCargo(cargo);setCargoArea(cargo.area);setLoadingSection('layout');writeNavigation({page:'loading',section:'layout'});}} ready={ready} onLayout={()=>{setLoadingSection('layout');writeNavigation({page:'loading',section:'layout'});}}/>}
        <div hidden={loadingSection!=='layout'}>{deckError&&<p role="alert">{t(deckError)}</p>}<CargoPlanner capacityCargo={capacityCargo} onCapacityCargoUsed={()=>setCapacityCargo(undefined)} key={restoreVersion} tweenDeck={tweenDeck} onDeckChange={changeDeck} ship={ship} weights={weights} setWeights={setWeights} area={cargoArea} setArea={setCargoArea} ready={ready}/></div>
        <div hidden={loadingSection!=='ballast'}>{tankCatalog?<TankControls key={restoreVersion} state={planState} ballastOnly onSaveCondition={name=>setSaveRequest({name:t(name),id:Date.now()})} ship={ship} catalog={tankCatalog} weights={weights} setWeights={setWeights}/>:<p role="status">{t('This model has no documented tank filling tables.')}</p>}</div>
        <div hidden={loadingSection!=='onboard'&&loadingSection!=='tanks'}><h2>{t('Onboard condition')}</h2><p>{t('Prepare fuel, service liquids, crew and stores before planning cargo. Current ballast is already included in the totals.')}</p>
        <details className="onboard-task" open><summary>{t('Fuel and bunkers')}</summary>{tankCatalog?<TankControls key={'fuel-'+restoreVersion} scope="fuel" ship={ship} catalog={tankCatalog} weights={weights} setWeights={setWeights}/>:<p role="status">{t('This model has no documented tank filling tables.')}</p>}
        </details><details className="onboard-task"><summary>{t('Ship equipment and tween-deck')}</summary><OnboardEquipment key={tweenDeck} ship={ship} weights={weights} mode={tweenDeck} onChange={changeDeck} onUndo={()=>{if(previousDeck&&canUndoCondition(previousDeck,planState))restoreState(previousDeck.before);}} canUndo={canUndoCondition(previousDeck,planState)} ready={ready} error={deckError}/></details><details className="onboard-task"><summary>{t('Service liquids, crew and stores')}</summary><section aria-label={t('Other onboard loads')}>{tankCatalog&&<TankControls key={'service-'+restoreVersion} scope="service" ship={ship} catalog={tankCatalog} weights={weights} setWeights={setWeights}/>}<LoadingCondition key={'onboard-'+restoreVersion} section="onboard" catalog={tankCatalog} ship={ship} weights={weights} setWeights={setWeights} ready={ready} loadError={loadError}/></section></details></div>
        <div hidden={loadingSection!=='weights'}><LoadingCondition section="review" onLayout={()=>{setLoadingSection('layout');writeNavigation({page:'loading',section:'layout'});}} catalog={tankCatalog} ship={ship} weights={weights} setWeights={setWeights} ready={ready} loadError={loadError}/></div>

        {nextLoading&&<div className="workflow-next"><button className="action-button" onClick={()=>{if(nextLoading.page==='view3d')onTabChange('view3d');else if(nextLoading.section){setLoadingSection(nextLoading.section);writeNavigation({page:'loading',section:nextLoading.section});}}}>{nextLoading.page==='view3d'?t(nextLoading.label):`${t('Next')}: ${t(nextLoading.label)}`} <span aria-hidden="true">→</span></button></div>}
        {loadingSection==='plans'&&<div className="workflow-next"><button onClick={()=>{setLoadingSection(planReturnSection.current);writeNavigation({page:'loading',section:planReturnSection.current});}}>{t('Back to Loading')}</button><button onClick={()=>onTabChange('view3d')}>{t('Continue to 3D inspection')}</button></div>}
        <div hidden={loadingSection!=='plans'}><CargoPlans intent={planIntent} onRecoveryAvailable={setRecoveryAvailable} ship={ship} ready={ready} fixed={fixedWeights.current} state={planState} onRestore={restoreState}/></div>
      </div>
      {(activeTab==='stability'||activeTab==='trim')&&<nav className="workspace-nav" aria-label={t('Assessment sections')}><button aria-current={activeTab==='stability'?'page':undefined} onClick={()=>onTabChange('stability')}>{t('Conclusions and graphs')}</button>{activeTab==='stability'&&[['assessment-gz','GZ curve'],['assessment-wind','Wind & rolling'],['assessment-securing','Securing']].map(([id,label])=><a key={id} href={'#'+id} onClick={()=>{const section=document.getElementById(id) as HTMLDetailsElement|null;if(section)section.open=true;}}>{t(label)}</a>)}<button aria-current={activeTab==='trim'?'page':undefined} onClick={()=>onTabChange('trim')}>{t('Trim & Drafts')}</button></nav>}
      <div hidden={activeTab !== 'trim'}><TrimEquilibrium {...shared} pending={mode === 'displacement' ? !valid : pending} {...editable} density={density} setDensity={setDensity} fsm={longitudinalFsm} setFsm={setLongitudinalFsm} lcg={lcg} onLcgChange={update('lcg')}/></div>
      {activeTab === 'stability' && <><FinalAssessment ship={ship} state={planState} inputs={{pending,displacementTonnes,lcg,vcg,tcg,freeSurfaceMomentTransverse,waterDensity:density,longitudinalFsm}} onSecuring={()=>{const section=document.getElementById('assessment-securing-editor') as HTMLDetailsElement|null;if(section){section.open=true;section.scrollIntoView({block:'start'});}}}/><SecuringAssessment id="assessment-securing-editor" ship={ship} weights={weights} areas={cargoSurfaces(ship,tweenDeck)}/><details id="assessment-details"><summary>{t('Calculation inputs and detailed assessment')}</summary><StabilityCurves onLcgChange={update('lcg')} lcg={lcg} longitudinalFsm={longitudinalFsm} {...shared} {...editable} waterDensity={density}/></details></>}
      <div hidden={activeTab !== 'roll'}><RollSimulation {...shared} waterDensity={density}/></div>
      {activeTab === 'view3d' && <FeatureBoundary message={t('The 3D viewer could not load. Your loading condition is still available.')} retryLabel={t('Retry 3D')} detailsLabel={t('Error details')} onRetry={()=>setViewer(loadViewer)}><Suspense fallback={<p role="status">{t('Loading 3D viewer…')}</p>}><Ship3DView onTeachingChange={setTeachingView} initialStudy={studyRequested} onStudyOpen={()=>setStudyRequested(true)} onStudyClosed={()=>setStudyRequested(false)} tweenDeck={tweenDeck} conditionMessage={status} key={restoreVersion} movementHistory={movementHistory} weights={weights} setWeights={setWeights} fromWeights={fromWeights} {...shared} lcg={lcg} trimDensity={density} longitudinalFsm={longitudinalFsm} onTabChange={onTabChange}/></Suspense></FeatureBoundary>}
      {activeTab === 'validation' && <Validation ship={ship}/>}
      {activeTab === 'theory' && <><section className="panel"><h1>{t('Learn')}</h1><div className="scene-toolbar">{ship.manifest.resources.some(r=>r.kind==='documentation.study-cases')&&<button onClick={()=>{setStudyRequested(true);onTabChange('view3d');}}>{t('Explore documented simulations')}</button>}<button onClick={()=>onTabChange('validation')}>{t('Reference checks')}</button><GuideLink>{t('Help & documentation')}</GuideLink></div><p>{t('Documented simulations show source results without changing your active loading condition.')}</p></section><Theory ship={ship} onTabChange={onTabChange}/></>}
    </AssessmentContext.Provider>;
}
export default App;
