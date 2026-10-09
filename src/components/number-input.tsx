import { useReference } from '../app/reference-context';
import type { Axis } from '../core/reference/reference-system';
import { useLanguage } from '../app/language-context';
import { useId } from 'react';
export function NumberInput({ label, value, onChange, min, coordinate, disabled }: {
    label: string;
    value: number | undefined;
    onChange: (value: number | undefined) => void;
    min?: number;
    disabled?: boolean;
    coordinate?: Axis | 'heel';
}) {
    const { t } = useLanguage();
    const id = useId();
    const reference = useReference();
    const displayed = coordinate === 'heel' ? value === undefined ? undefined : value * reference.heelSign : coordinate ? reference.toDisplay(coordinate, value) : value;
    const change = (next: number | undefined) => onChange(coordinate === 'heel' ? next === undefined ? undefined : next * reference.heelSign : coordinate ? reference.toSource(coordinate, next) : next);
    return <div className="field"><label htmlFor={id}>{t(reference.symbol(label))}</label><input disabled={disabled} id={id} type="number" step="any" min={min} value={displayed === undefined ? '' : Number(displayed.toPrecision(12))} onChange={event => change(Number.isFinite(event.target.valueAsNumber) ? event.target.valueAsNumber : undefined)}/></div>;
}
