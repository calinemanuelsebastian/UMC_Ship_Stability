import { useLanguage } from '../app/language-context';
import { useId } from 'react';
export function SelectInput({ label, value, options, onChange, disabled }: {
    disabled?: boolean;
    label: string;
    value: string;
    options: {
        value: string;
        disabled?: boolean;
    label: string;
    }[];
    onChange: (value: string) => void;
}) {
    const { t } = useLanguage();
    const id = useId();
    return <div className="field"><label htmlFor={id}>{t(label)}</label><select id={id} value={value} onChange={event => onChange(event.target.value)} disabled={disabled || !options.length}>{t(!options.length && <option value="">{t("No models available")}</option>)}{t(options.map(option => <option key={option.value} value={option.value}>{t(option.label)}</option>))}</select></div>;
}
