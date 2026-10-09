import { createContext, useContext } from 'react';
import { romanian } from './romanian';
export type Language = 'en' | 'ro';
export function translate<T>(value: T, language: Language): T {
  if (language !== 'ro' || typeof value !== 'string') return value;
  const text = value.trim();
  const exact = romanian[text];
  if (exact !== undefined) return (value.slice(0, value.indexOf(text)) + exact + value.slice(value.indexOf(text) + text.length)) as T;
  // Variable fragments are matched separately; model/user names and numerical data remain intact.
  const replacements: [RegExp, (...parts: string[]) => string][] = [
    [/^Running reference checks… (\d+) completed\.$/, (_, n) => `Se verifică referințele… ${n} finalizate.`],
    [/^(\d+) of (\d+) cases passed\.$/, (_, n, total) => `${n} din ${total} cazuri validate.`],
    [/^(\d+) of (\d+) cases passed; (\d+) failed\.$/, (_, n, total, fail) => `${n} din ${total} cazuri validate; ${fail} eșuate.`],
    [/^Weight (\d+) name$/, (_, n) => `Denumirea masei ${n}`],
    [/^Weight (\d+) (.+)$/, (_, n, label) => `Masa ${n}: ${translate(label, language)}`],
    [/^Remove weight (\d+): (.*)$/, (_, n, name) => `Elimină masa ${n}: ${name}`],
    [/^ at (.+)°$/, (_, n) => ` la ${n}°`],
    [/^ at (.+) s$/, (_, n) => ` la ${n} s`],
    [/^Interpolation value (.+) is outside the available table range (.+) - (.+)\.$/, (_, value, low, high) => `Valoarea ${value} este în afara intervalului tabelat ${low} – ${high}.`],
    [/^Displacement (.+) t is outside the table range (.+)–(.+) t at density (.+) t\/m³\.$/, (_, value, low, high, density) => `Deplasamentul ${value} t este în afara intervalului ${low}–${high} t la densitatea ${density} t/m³.`],
    [/^Displacement is outside the cross-curve range (.+)–(.+) t at this water density\.$/, (_, low, high) => `Deplasamentul este în afara intervalului curbelor transversale ${low}–${high} t la această densitate a apei.`],
    [/^The hydrostatic table does not provide (.+) at this draft\.$/, (_, label) => `Tabelul hidrostatic nu furnizează ${label} la acest pescaj.`],
    [/^(.+): enter finite mass and coordinates\.$/, (_, name) => `${name}: introdu o masă și coordonate finite.`],
    [/^No compatible upright hydrostatic solver found for ship model: (.+)$/, (_, name) => `Nu există o metodă hidrostatică compatibilă pentru modelul: ${name}`],
    [/^Could not load hydrostatic table: (.+)$/, (_, path) => `Tabelul hidrostatic nu a putut fi încărcat: ${path}`],
    [/^No hydrostatic solver registered for resource kind: (.+)$/, (_, kind) => `Nu există o metodă hidrostatică pentru tipul de resursă: ${kind}`],
    [/^Missing required "draft" value in hydrostatic table row (.+)\.$/, (_, row) => `Lipsește valoarea obligatorie draft în rândul ${row} al tabelului hidrostatic.`],
    [/^Invalid draft value in hydrostatic table row (.+)\.$/, (_, row) => `Pescaj invalid în rândul ${row} al tabelului hidrostatic.`],
    [/^Draft cannot be negative in hydrostatic table row (.+)\.$/, (_, row) => `Pescajul nu poate fi negativ în rândul ${row} al tabelului hidrostatic.`],
    [/^Duplicate draft value in hydrostatic table: (.+)\.$/, (_, value) => `Valoare de pescaj duplicată în tabelul hidrostatic: ${value}.`],
    [/^Resource "(.+)" is missing a path to the hydrostatic table\.$/, (_, id) => `Resursei „${id}” îi lipsește calea tabelului hidrostatic.`],
    [/^Cross-curve row (.+) needs positive volume, heel in −180…180°, and KN\.$/, (_, row) => `Rândul ${row} al curbelor transversale necesită volum pozitiv, înclinare între −180 și 180° și KN.`],
    [/^Duplicate cross-curve volume\/heel pair: (.+)\.$/, (_, pair) => `Pereche volum/înclinare duplicată: ${pair}.`],
    [/^Invalid numeric value in column "(.+)": (.+)$/, (_, column, value) => `Valoare numerică invalidă în coloana „${column}”: ${value}`],
    [/^Built-in ship model not found: (.+)$/, (_, id) => `Modelul inclus nu a fost găsit: ${id}`],
    [/^Could not load ship model manifest: (.+)$/, (_, path) => `Manifestul modelului nu a putut fi încărcat: ${path}`],
    [/^Built-in ship model registry entry "(.+)" is missing (.+)\.$/, (_, id, field) => `Intrării „${id}” din registrul modelelor îi lipsește câmpul ${field}.`],
    [/^Invalid (.+) in validation case (.+)\.$/, (_, field, id) => `Valoare invalidă (${field}) în cazul de validare ${id}.`],
    [/^Missing weights in validation case (.+)\.$/, (_, id) => `Lipsesc masele în cazul de validare ${id}.`],
    [/^Unsupported validation case kind: (.+)$/, (_, kind) => `Tip de caz de validare neacceptat: ${kind}`],
  ];
  for (const [pattern, replacement] of replacements) if (pattern.test(value)) return value.replace(pattern, replacement) as T;
  return value;
}
export const LanguageContext = createContext<{ language: Language; setLanguage: (language: Language) => void }>({ language: 'en', setLanguage: () => {} });
export function useLanguage() {
  const { language, setLanguage } = useContext(LanguageContext);
  return { language, setLanguage, t: <T,>(value: T): T => translate(value, language) };
}
