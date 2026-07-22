export function MetricCard({
    label,
    value,
    hint,
    hintColor = "text-emerald-600",
}: {
    label: string;
    value: string;
    hint?: string;
    hintColor?: string;
}) {
    return (
        <div className="card">
            <div className="text-sm text-slate-500">{label}</div>
            <div className="text-3xl font-bold mt-1">{value}</div>
            {hint && <div className={`mt-2 text-sm ${hintColor}`}>{hint}</div>}
        </div>
    );
}
