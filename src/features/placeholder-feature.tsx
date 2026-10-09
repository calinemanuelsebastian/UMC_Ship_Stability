import { useLanguage } from '../app/language-context';
export function PlaceholderFeature({ title }: {
    title: string;
}) { const { t } = useLanguage(); return <h1>{t(title)}</h1>; }
