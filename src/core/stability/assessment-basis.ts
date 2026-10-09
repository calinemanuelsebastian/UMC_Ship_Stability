import {parseWeatherEvidence,type WeatherEvidence} from './weather-evidence';
import {parseTrimLimits,type TrimLimits} from './trim-assessment';
export type AssessmentBasis = {
  format: 'umc-stability-assessment-basis'; version: 1;
  vesselName: string; imoNumber: string;
  source: {file: string; documentNumber: string; date: string; sha256: string};
  notice: string;
  intactCriteria?: 'msc267-general-source-v1';
  trimLimits?: TrimLimits;
  weatherEvidence?: WeatherEvidence;
  requirements: {id: string; title: string; applicability: 'Documented' | 'Conditional' | 'Unconfirmed'; requirement: string; source: string; gap: string}[];
  reviewNotes: string[];
};
export function parseAssessmentBasis(raw: unknown): AssessmentBasis {
  const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
  const text = (v: unknown) => typeof v === 'string' && v.trim().length > 0;
  if (!object(raw) || raw.format !== 'umc-stability-assessment-basis' || raw.version !== 1 ||
      !['vesselName', 'imoNumber', 'notice'].every(k => text(raw[k])) || !object(raw.source) ||
      !['file', 'documentNumber', 'date', 'sha256'].every(k => text((raw.source as Record<string, unknown>)[k])) ||
      !Array.isArray(raw.requirements) || !raw.requirements.length ||
      !Array.isArray(raw.reviewNotes) || !raw.reviewNotes.every(text)) throw new Error('Invalid stability assessment basis.');
  const ids = new Set();
  for (const row of raw.requirements) {
    if (!object(row) || !['id', 'title', 'requirement', 'source', 'gap'].every(k => text(row[k])) ||
        !['Documented', 'Conditional', 'Unconfirmed'].includes(String(row.applicability)) || ids.has(row.id)) {
      throw new Error('Invalid assessment requirement.');
    }
    ids.add(row.id);
  }
  if(raw.intactCriteria!==undefined&&raw.intactCriteria!=='msc267-general-source-v1')throw new Error('Unsupported intact criteria basis.');
  if(raw.trimLimits!==undefined)parseTrimLimits(raw.trimLimits);
  if(raw.weatherEvidence!==undefined)parseWeatherEvidence(raw.weatherEvidence);
  return raw as AssessmentBasis;
}
