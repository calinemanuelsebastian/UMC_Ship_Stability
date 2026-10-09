import type { CoordinateSystem } from '../domain/ship-model';
export type ReferenceSettings = {
  profile: 'source' | 'custom' | 'uk' | 'russian';
  longitudinalOrigin: number;
  xPositive: CoordinateSystem['xPositive'];
  yPositive: CoordinateSystem['yPositive'];
  zPositive: CoordinateSystem['zPositive'];
  heelPositive: 'starboard' | 'port';
  trimPositive: 'bow' | 'stern';
  notation: 'nautical' | 'coordinates';
};
export type Axis = 'x' | 'y' | 'z';
export function createReferenceTransform(source: CoordinateSystem, settings: ReferenceSettings) {
  if (!Number.isFinite(settings.longitudinalOrigin)) throw new Error('Reference origin must be finite.');
  const custom = settings.profile !== 'source';
  const sign = (axis: Axis) => !custom || source[`${axis}Positive`] === settings[`${axis}Positive`] ? 1 : -1;
  const offset = (axis: Axis) => custom && axis === 'x' ? settings.longitudinalOrigin : 0;
  function convert(axis: Axis, value: number | undefined, inverse = false) {
    if (value === undefined) return undefined;
    const result = inverse ? value * sign(axis) + offset(axis) : (value - offset(axis)) * sign(axis);
    if (!Number.isFinite(result)) throw new Error('Reference conversion exceeds the supported numeric range.');
    return Object.is(result, -0) ? 0 : result;
  }
  return {
    toDisplay: (axis: Axis, value: number | undefined) => convert(axis, value),
    toSource: (axis: Axis, value: number | undefined) => convert(axis, value, true),
    moment: (axis: Axis, value: number, mass: number) => {
      const result = (value - mass * offset(axis)) * sign(axis);
      if (!Number.isFinite(result)) throw new Error('Reference conversion exceeds the supported numeric range.');
      return result;
    },
    heelSign: custom && settings.heelPositive === 'port' ? -1 : 1,
    trimSign: custom && settings.trimPositive === 'stern' ? -1 : 1,
  };
}
export function sourceReference(source: CoordinateSystem): ReferenceSettings {
  return { profile: 'source', longitudinalOrigin: 0, xPositive: source.xPositive, yPositive: source.yPositive, zPositive: source.zPositive, heelPositive: 'starboard', trimPositive: 'bow', notation: 'nautical' };
}

/** Specific textbook conventions, not universal national standards. */
export function textbookReference(source: CoordinateSystem, profile: 'uk' | 'russian'): ReferenceSettings | undefined {
  const origin = profile === 'uk'
    ? source.longitudinalOriginFromAP === undefined ? undefined : -source.longitudinalOriginFromAP * (source.xPositive === 'forward' ? 1 : -1)
    : source.amidshipsX;
  if (origin === undefined || !Number.isFinite(origin) || Math.abs(origin) > 1e6) return undefined;
  return { ...sourceReference(source), profile, longitudinalOrigin: origin, xPositive: 'forward', yPositive: 'starboard', zPositive: 'up', notation: profile === 'uk' ? 'nautical' : 'coordinates' };
}
