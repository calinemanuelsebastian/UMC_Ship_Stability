import { useLanguage } from '../app/language-context';
import type { TabId } from '../app/tabs';
import type { LoadingSection } from '../app/navigation';

export function Home({onTabChange,onLoadingSection}: {
  onTabChange:(page:TabId)=>void;onLoadingSection:(section:LoadingSection)=>void;
}) {
  const {t}=useLanguage();
  return <div className="home-workspace">
    <div className="page-heading"><p className="eyebrow">{t('Your ship workspace')}</p><h1>{t('Plan the load. Explore the ship.')}</h1><p>{t('Start with cargo and tanks, then inspect the same condition in 3D.')}</p></div>
    <div className="home-primary">
      <section className="home-feature home-loading">
        <WorkspaceDrawing kind="loading"/>
        <div className="home-feature-body"><p className="eyebrow">{t('01 · Prepare')}</p><h2>{t('Loading')}</h2><p>{t('Arrange cargo in the holds, adjust tank contents and review onboard weights.')}</p>
          <button onClick={()=>onLoadingSection('layout')}>{t('Open cargo planning')} <span aria-hidden="true">→</span></button>
          <div className="home-shortcuts"><button onClick={()=>onLoadingSection('ballast')}>{t('Ballast')}</button><button onClick={()=>onLoadingSection('tanks')}>{t('Tanks and liquids')}</button><button onClick={()=>onLoadingSection('plans')}>{t('Saved cargo plans')}</button><button onClick={()=>onLoadingSection('weights')}>{t('Weights and totals')}</button></div>
        </div>
      </section>
      <section className="home-feature home-visual">
        <WorkspaceDrawing kind="view3d"/>
        <div className="home-feature-body"><p className="eyebrow">{t('02 · Explore')}</p><h2>{t('3D View')}</h2><p>{t('Inspect the hull and cargo, adjust visibility and explore heel and trim in Teaching mode.')}</p>
          <button onClick={()=>onTabChange('view3d')}>{t('Open 3D workspace')} <span aria-hidden="true">→</span></button>
          <p className="home-feature-note">{t('The viewer uses the selected vessel and current condition. Available simulations depend on the vessel data.')}</p>
        </div>
      </section>
    </div>
    <section className="home-next"><div><h2>{t('03 · Assess')}</h2><p>{t('Review stability, weather and trim results, including any missing data, before exporting a report.')}</p></div><div className="home-shortcuts"><button onClick={()=>onTabChange('stability')}>{t('Review assessment')} <span aria-hidden="true">→</span></button><button onClick={()=>onTabChange('trim')}>{t('Trim & Drafts')}</button></div></section>
  </div>;
}

/** Decorative workflow illustrations; these do not depict the selected hull geometry. */
function WorkspaceDrawing({kind}:{kind:'loading'|'view3d'}) {
  return <svg className="home-illustration" viewBox="0 0 500 140" aria-hidden="true" focusable="false">
    {kind==='loading'?<g fill="none" stroke="currentColor" strokeWidth="2"><path d="M40 28H380L466 70 380 112H40Z"/><path d="M72 43H224V97H72ZM244 43H368V97H244Z"/>{[0,1,2,3,4,5].map(i=><rect key={i} x={82+i%3*44} y={51+Math.floor(i/3)*23} width="35" height="16" rx="2" fill="currentColor" fillOpacity=".2"/>)}<path d="M250 70H356M303 48V92" strokeDasharray="4 4"/></g>:<g fill="none" stroke="currentColor" strokeWidth="2"><path d="M65 70 285 30 445 60 225 103Z" fill="currentColor" fillOpacity=".12"/><path d="M65 70 90 104 223 132 225 103M223 132 416 91 445 60"/><path d="M120 64 168 56 212 65 164 76ZM235 44 278 36 323 45 279 56"/><path d="M26 99 465 99" strokeDasharray="6 5"/><path d="M380 44V12M380 44 415 36M380 44 353 29"/></g>}
  </svg>;
}
