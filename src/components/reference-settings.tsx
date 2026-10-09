import { ReferenceDiagram } from './reference-diagram';
import { useState, type ReactNode } from 'react';
import type { ShipModelPackage } from '../core/domain/ship-model';
import { createReferenceTransform, sourceReference, textbookReference } from '../core/reference/reference-system';
import { ReferenceContext, useReference } from '../app/reference-context';
import { useLanguage } from '../app/language-context';
export function ReferenceProvider({ ship, children }: { ship: ShipModelPackage; children: ReactNode }) {
  const [settings, setSettings] = useState(() => sourceReference(ship.manifest.coordinateSystem));
  return <ReferenceContext.Provider value={{ settings, setSettings, ...createReferenceTransform(ship.manifest.coordinateSystem, settings) }}>{children}</ReferenceContext.Provider>;
}
export function ReferenceSettings({ ship }: { ship: ShipModelPackage }) {
  const { t } = useLanguage();
  const { settings, setSettings } = useReference();
  const [offsetText, setOffsetText] = useState('0');
  const profiles = { uk: textbookReference(ship.manifest.coordinateSystem, 'uk'), russian: textbookReference(ship.manifest.coordinateSystem, 'russian') };
  const profileLabels = { source: 'Model source', custom: 'Custom', uk: 'UK — AP / forward', russian: 'Russian — amidships / forward' };
  const offsetValid = offsetText.trim() !== '' && Number.isFinite(Number(offsetText)) && Math.abs(Number(offsetText)) <= 1e6;
  return <details className="reference-settings"><summary>{t('Reference system')} · {t(profileLabels[settings.profile])}</summary><div className="panel reference-settings-panel">
    <p>{t('Reference settings change displayed coordinates and inputs, not the physical loading. Calculations retain the model source convention. Language is independent.')}</p>
    <div className="curve-inputs"><label>{t('Reference profile')}<select value={settings.profile} onChange={event => { const profile = event.target.value; const next = profile === 'source' ? sourceReference(ship.manifest.coordinateSystem) : profile === 'custom' ? { ...settings, profile: 'custom' as const } : profiles[profile as 'uk' | 'russian']; if (next) { setOffsetText(String(next.longitudinalOrigin)); setSettings(next); } }}>
      <option value="source">{t('Model source')}</option><option value="custom">{t('Custom')}</option>
      {(['uk', 'russian'] as const).map(profile => <option key={profile} value={profile} disabled={!profiles[profile]}>{t(profileLabels[profile])}</option>)}
    </select></label><label>{t('Notation')}<select value={settings.notation} onChange={event => setSettings({ ...settings, notation: event.target.value as 'nautical' | 'coordinates' })}><option value="nautical">{t('Nautical symbols')}</option><option value="coordinates">{t('Coordinate symbols')}</option></select></label></div>
    {settings.profile === 'custom' && <div className="curve-inputs"><label>{t('New origin x in source coordinates (m)')}<input type="number" step="any" value={offsetText} aria-invalid={!offsetValid} onChange={event => { const text = event.target.value; setOffsetText(text); if (text.trim() && Number.isFinite(Number(text)) && Math.abs(Number(text)) <= 1e6) setSettings({ ...settings, longitudinalOrigin: Number(text) }); }} /></label>
      {(['xPositive', 'yPositive', 'zPositive', 'heelPositive', 'trimPositive'] as const).map(key => <label key={key}>{t({ xPositive: 'Positive x', yPositive: 'Positive y', zPositive: 'Positive z', heelPositive: 'Positive heel', trimPositive: 'Positive trim' }[key])}<select value={settings[key]} onChange={event => setSettings({ ...settings, [key]: event.target.value })}>{({ xPositive: ['forward','aft'], yPositive: ['starboard','port'], zPositive: ['up','down'], heelPositive: ['starboard','port'], trimPositive: ['bow','stern'] }[key]).map(value => <option value={value} key={value}>{t(value)}</option>)}</select></label>)}
    </div>}
    <ReferenceDiagram ship={ship} />
    {(!profiles.uk || !profiles.russian) && <p className="muted">{t('Textbook presets require explicit AP or amidships datum metadata in the model package.')}</p>}
    {(settings.profile === 'uk' || settings.profile === 'russian') && <p>{t(settings.profile === 'uk' ? 'UK preset: longitudinal positions forward of AP, nautical symbols (Barrass & Derrett, sixth edition, chapter 48). Starboard-positive y and heel, up-positive z and bow-positive trim are app conventions.' : 'Russian preset: origin at amidships, x forward, y starboard, z up (Sizov, 2003, section 1.1). Starboard-positive heel and bow-positive trim are app conventions; coordinate symbols use the app notation.')}</p>}
    {!offsetValid && <p role="alert">{t('Enter a finite origin within ±1000000 m. The last valid reference remains active.')}</p>}
    <p className="muted">{t('Source origin')}: {t(ship.manifest.coordinateSystem.origin)}. {t('Baseline and centreline are unchanged. Lengths remain in metres; masses remain in tonnes. GM and free-surface corrections remain physical distances, not signed heights.')}</p>
    <p className="muted">{t('Theory equations and validation references use their stated source convention. With a display reference, chart heel and signed GZ use the selected heel direction; Trim & Drafts uses the selected trim sign; other solvers retain zero trim.')}</p>
    <p><strong>{t('Displayed coordinates')}:</strong> {settings.profile !== 'source' ? `x′ = ${settings.xPositive === ship.manifest.coordinateSystem.xPositive ? '+' : '−'}(x − ${settings.longitudinalOrigin}), y′ = ${settings.yPositive === ship.manifest.coordinateSystem.yPositive ? '+' : '−'}y, z′ = ${settings.zPositive === ship.manifest.coordinateSystem.zPositive ? '+' : '−'}z` : t('Model source')}. {t('Notation')}: {settings.notation === 'coordinates' ? 'LCG → xG; LCF → xF; TCG → yG; VCG/KG → zG; KB → zB; KMt → zMt; KMl → zMl' : 'LCG, LCF, TCG, VCG/KG, KB, KMt, KMl'}.</p>
    <details><summary>{t('Calculation methods and textbook references')}</summary><p>{t('Active methods: upright table interpolation, mass-weighted loading centres, KN-based GZ, linear free roll and small-trim equilibrium. Selecting a reference convention does not select a different solver.')}</p><p>{t('These are specific textbook conventions, not universal national standards. The Russian-language source is Sizov; notation and angle signs are stated above. Switching profiles preserves the physical loading.')}</p><ul><li><a href="https://home.hvl.no/ansatte/gste/ftp/MAS124_Intro_Marinteknikk/Litteratur/Kompendier_Books/ShipStabMastersMates.pdf#page=409">Barrass &amp; Derrett — Ship Stability for Masters and Mates, 6th ed. (2006), ch. 48, pp. 394–402</a></li><li><a href="https://www.studmed.ru/view/sizov-vg-teoriya-korablya_b68cf6d1fbd.html">Sizov — Theory of the Ship (2003), §1.1, p. 8</a></li></ul></details>
  </div></details>;
}
