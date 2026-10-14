import {WeatherReferenceCases} from './weather-reference-cases';
import {WindAssessment} from './wind-assessment';
import {IntactAssessmentResults,type IntactInputs} from './intact-assessment-results';
import {TrimAssessmentResults} from './trim-assessment-results';
import {useEffect, useState} from 'react';
import {useLanguage} from '../app/language-context';
import type {ShipModelPackage} from '../core/domain/ship-model';
import {shipResourceUrl} from '../core/domain/ship-resource';
import {parseAssessmentBasis, type AssessmentBasis} from '../core/stability/assessment-basis';

export function StabilityAssessmentBasis({ship,inputs}: {ship: ShipModelPackage;inputs?:IntactInputs}) {
  const {t} = useLanguage();
  const resource = ship.manifest.resources.find(r => r.kind === 'stability.assessment-basis');
  const [state, setState] = useState<{ship: ShipModelPackage; data?: AssessmentBasis; error?: string}>();
  useEffect(() => {
    if (!resource?.path) return;
    const controller = new AbortController();
    fetch(shipResourceUrl(ship, resource.path), {signal: controller.signal})
      .then(response => {if (!response.ok) throw new Error('Could not load assessment basis.'); return response.json();})
      .then(raw => {if (!controller.signal.aborted) setState({ship, data: parseAssessmentBasis(raw)});})
      .catch(() => {if (!controller.signal.aborted) setState({ship, error: 'Could not load assessment basis.'});});
    return () => controller.abort();
  }, [ship, resource?.path]);
  const current = state?.ship === ship ? state : undefined;
  const data = current?.data;
  return <section className="panel assessment-basis" aria-label={t('Assessment basis')}>
    <h2>{t('Loading and stability assessment')}</h2>
    <p>{t('The supplied booklet is the educational reference basis. Numerical results and missing evidence are reported separately; no overall approval is inferred.')}</p>
    {!resource?.path ? <p>{t('No vessel-specific assessment basis has been supplied.')}</p> :
      current?.error ? <p role="alert">{t(current.error)}</p> : !data ? <p role="status">{t('Loading assessment basis…')}</p> : <>
        <p>{t(data.notice)}</p>
        {data.intactCriteria==='msc267-general-source-v1'&&inputs&&<IntactAssessmentResults ship={ship} inputs={inputs}/>}
        {data.trimLimits&&inputs&&<TrimAssessmentResults key={JSON.stringify([ship.manifest.id,inputs])} ship={ship} limits={data.trimLimits} inputs={inputs}/>}
        {inputs&&<WindAssessment key={`wind-${ship.manifest.id}`} ship={ship} inputs={inputs}/>}
        {data.weatherEvidence&&<WeatherReferenceCases key={`references-${ship.manifest.id}`} ship={ship} data={data.weatherEvidence} downloadUrl={shipResourceUrl(ship,resource.path!)}/>}
        <details><summary>{t('Documented requirements and limits')}</summary>
          <p>{data.vesselName} · IMO {data.imoNumber} · {data.source.documentNumber} · {t(data.source.date)}</p>
          <div className="assessment-requirements">{data.requirements.map(row => <article key={row.id}>
            <h3>{t(row.title)}</h3><p className="muted">{t(row.applicability)} · {t('Not assessed')}</p>
            <p>{t(row.requirement)}</p><p><strong>{t('Still needed')}: </strong>{t(row.gap)}</p>
            <small>{t('Source')}: {t(row.source)}</small>
          </article>)}</div>
          <h3>{t('Extracted source data')}</h3><ul>{ship.manifest.resources.filter(r=>['documentation.port-symmetry-audit','documentation.annotated-kg','documentation.annotated-kg-csv','stability.downflooding-samples','documentation.downflooding-csv'].includes(r.kind)&&r.path).map(r=><li key={r.id}><a href={shipResourceUrl(ship,r.path!)} download={r.path}>{t(r.label??r.id)}</a></li>)}</ul><h3>{t('Source review notes')}</h3><ul>{data.reviewNotes.map(note => <li key={note}>{t(note)}</li>)}</ul>
          <p className="muted">{data.source.file}</p><details><summary>{t('Source fingerprint')}</summary><code className="assessment-fingerprint">SHA-256: {data.source.sha256}</code></details>
        </details>
      </>}
  </section>;
}
