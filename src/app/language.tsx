import { useEffect, useState, type ReactNode } from 'react';
import { LanguageContext, useLanguage, type Language } from './language-context';
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    try { return localStorage.getItem('umc-language') === 'ro' ? 'ro' : 'en'; } catch { return 'en'; }
  });
  useEffect(() => {
    document.documentElement.lang = language;
    document.title = language === 'ro' ? 'UMC · Stabilitatea navei' : 'UMC · Ship Stability';
    try { localStorage.setItem('umc-language', language); } catch { /* Storage may be disabled; switching still works. */ }
  }, [language]);
  return <LanguageContext.Provider value={{ language, setLanguage }}>{children}</LanguageContext.Provider>;
}
export function LanguageSwitch() {
  const { language, setLanguage } = useLanguage();
  return <select className="language-switch" aria-label={language === 'ro' ? 'Limba interfeței' : 'Interface language'} value={language} onChange={event => setLanguage(event.target.value === 'ro' ? 'ro' : 'en')}>
    <option lang="en" value="en">EN</option>
    <option lang="ro" value="ro">RO</option>
  </select>;
}
