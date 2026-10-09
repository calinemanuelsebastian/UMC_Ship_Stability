import type {FloodScreen} from '../core/stability/downflooding';
import {useLanguage} from '../app/language-context';
export function DownfloodingResults({result}: {result: FloodScreen}) {
 const {t}=useLanguage();
 return <section><h2>{t('Downflooding screening')}</h2>
 <p><strong>{t('Preliminary source · not a compliance verdict')}</strong></p><p>{t(result.message)}</p>
 {result.firstReachedAngle!==undefined&&<p>{t('First sampled angle with threshold reached')}: <strong>{result.firstReachedAngle}° SB</strong></p>}
 <p>{t('The manual requires the engine-room vent positions to be updated to the final Damage Control Plan. A dash is unknown. No exact onset angle, port-side result or safe range is inferred.')}</p>
 <details><summary>{t('View flooding threshold samples')}</summary><p>{t('Initial trim (source sign)')}: {result.initialTrimMetres.toFixed(4)} m</p>
 <table><thead><tr><th>{t('Opening')}</th><th>° SB</th><th>{t('Threshold (t)')}</th><th>{t('Screening result')}</th><th>{t('PDF page')}</th></tr></thead><tbody>{result.samples.map(s=><tr key={s.opening+s.heelDegrees}><td>{s.opening}</td><td>{s.heelDegrees}</td><td>{s.thresholdTonnes===null?'—':s.thresholdTonnes.toFixed(3)}</td><td>{t(s.status)}</td><td>{s.sourcePages.join(', ')}</td></tr>)}</tbody></table></details>
 </section>;
}
