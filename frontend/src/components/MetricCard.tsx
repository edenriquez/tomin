export function MetricCard({
    label,
    value,
    hint,
    hintColor = "text-positive",
}: {
    label: string;
    value: string;
    hint?: string;
    hintColor?: string;
}) {
    return (
        <div className="card">
            <div className="text-body-sm text-pewter">{label}</div>
            <div className="tabular mt-1 text-metric font-semibold text-ink">{value}</div>
            {hint && <div className={`mt-2 text-body-sm ${hintColor}`}>{hint}</div>}
        </div>
    );
}
