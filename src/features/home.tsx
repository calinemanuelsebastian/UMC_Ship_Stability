import {CapabilitiesSummary} from '../app/site-information';
import { useLanguage } from '../app/language-context';
import type { TabId } from '../app/tabs';
import type { LoadingSection } from '../app/navigation';

export function Home({onTabChange,onLoadingSection}: {
  onTabChange:(page:TabId)=>void;onLoadingSection:(section:LoadingSection)=>void;
}) {
  const {t}=useLanguage();
  return <div className="home-workspace">
    <div className="page-heading"><p className="eyebrow">{t('Your ship workspace')}</p><h1>{t('Plan the load. Explore the ship.')}</h1><p>{t('Start with cargo and tanks, then inspect the same condition in 3D.')}</p></div>
    <CapabilitiesSummary/>
    <div className="home-primary">
      <section className="home-feature home-loading">
        <WorkspaceDrawing kind="loading"/>
        <div className="home-feature-body"><p className="eyebrow">{t('01 · Prepare')}</p><h2>{t('Loading')}</h2><p>{t('Arrange cargo in the holds, adjust tank contents and review onboard weights.')}</p>
          <button onClick={()=>onLoadingSection('onboard')}>{t('Prepare onboard condition')} <span aria-hidden="true">→</span></button>
          <div className="home-shortcuts"><button onClick={()=>onLoadingSection('ballast')}>{t('Ballast')}</button><button onClick={()=>onLoadingSection('layout')}>{t('Cargo layout')}</button><button onClick={()=>onLoadingSection('plans')}>{t('Saved cargo plans')}</button><button onClick={()=>onLoadingSection('weights')}>{t('Review totals')}</button></div>
        </div>
      </section>
      <section className="home-feature home-visual">
        <WorkspaceDrawing kind="view3d"/>
        <div className="home-feature-body"><p className="eyebrow">{t('02 · Explore')}</p><h2>{t('3D View')}</h2><p>{t('Inspect the hull and cargo, adjust visibility and explore heel and trim in Teaching mode.')}</p>
          <button onClick={()=>onTabChange('view3d')}>{t('Open 3D workspace')} <span aria-hidden="true">→</span></button>
          <p className="home-feature-note">{t('The viewer uses the selected vessel and current condition. Available simulations depend on the vessel data.')}</p>
        </div>
      </section>
      <section className="home-feature home-assessment">
        <WorkspaceDrawing kind="assessment"/>
        <div className="home-feature-body"><p className="eyebrow">{t('03 · Assess')}</p><h2>{t('Assessment')}</h2><p>{t('Review stability, weather and trim results, including any missing data, before exporting a report.')}</p>
          <button onClick={()=>onTabChange('stability')}>{t('Review assessment')} <span aria-hidden="true">→</span></button>
          <div className="home-shortcuts"><button onClick={()=>onTabChange('trim')}>{t('Trim & Drafts')}</button></div>
        </div>
      </section>
    </div>
  </div>;
}

/** Decorative workflow illustrations; these do not depict the selected hull geometry. */
function WorkspaceDrawing({kind}:{kind:'loading'|'view3d'|'assessment'}) {
  return <svg className="home-illustration" viewBox={kind==='loading'?'0 0 500 140':'0 0 500 190'} preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">
    {kind==='assessment'?<g fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
      <path d="M65 25V150H450"/>
      <path d="M65 115H440M65 80H440M65 45H440M150 25V150M235 25V150M320 25V150M405 25V150" strokeOpacity=".15"/>
      <path d="M65 150C120 130 160 53 235 45S350 72 425 150Z" fill="currentColor" fillOpacity=".1" stroke="none"/>
      <path d="M65 150C120 130 160 53 235 45S350 72 425 150" strokeWidth="4"/>
      <text x="28" y="30" fill="currentColor" stroke="none" fontSize="18">GZ</text><text x="448" y="174" fill="currentColor" stroke="none" fontSize="18">φ</text>
    </g>:kind==='loading'?<g fill="none" stroke="currentColor" strokeWidth="2"><path d="M40 28H380L466 70 380 112H40Z"/><path d="M72 43H224V97H72ZM244 43H368V97H244Z"/>{[0,1,2,3,4,5].map(i=><rect key={i} x={82+i%3*44} y={51+Math.floor(i/3)*23} width="35" height="16" rx="2" fill="currentColor" fillOpacity=".2"/>)}<path d="M250 70H356M303 48V92" strokeDasharray="4 4"/></g>:<g fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
      <path d="M28 145 358 79 476 111 146 177Z" fill="#c7e1ec" stroke="none"/>
      <path d="M56 97 358 37 450 64 148 126Z" fill="#dce7ef"/>
      <path d="M56 97 75 128 151 153 148 126Z" fill="#8eabc1"/>
      <path d="M148 126 151 153 424 98 450 64Z" fill="#b0c8d9"/>
      <path d="M147 105 231 88 280 102 196 119ZM246 85 330 68 379 82 295 99Z" fill="#769eb4"/>
      <path d="M78 82 116 74 151 85 113 93Z" fill="#fff"/>
      <path d="M78 82V54L113 65V93M113 65 151 57V85M78 54 116 46 151 57 113 65Z" fill="#ecf3f7"/>
      <path d="M84 65 107 72M120 75 143 70" strokeWidth="4"/>
      <path d="M238 88V43L303 57M346 66V22L406 37" strokeWidth="3"/>
      <path d="M238 43 299 50 303 57M346 22 402 30 406 37" strokeWidth="1"/>
      <path d="M75 117 151 142 431 86" stroke="#167e96" strokeWidth="3"/>
    </g>}
  </svg>;
}
