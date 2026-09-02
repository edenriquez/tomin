import { OUTLIER, SCATTER } from "@/lib/data";
import type { MockPalette } from "./palette";

/** The movements scatter: a quiet cloud and the one outlier that matters. */
export function ScatterMock({ p, className }: { p: MockPalette; className?: string }) {
    return (
        <svg viewBox="0 0 100 80" className={className ?? "h-full w-full"} role="presentation">
            <line x1="0" y1="76" x2="100" y2="76" stroke={p.line} strokeWidth="1" />
            <line x1="0" y1="44" x2="100" y2="44" stroke={p.line} strokeWidth="0.6" strokeDasharray="1.5 2" />
            {SCATTER.map(([x, y, r], i) => (
                <circle key={i} cx={x} cy={y} r={r} fill={p.muted} opacity="0.75" />
            ))}
            <circle cx={OUTLIER[0]} cy={OUTLIER[1]} r={OUTLIER[2]} fill={p.accent} />
            <circle cx={OUTLIER[0]} cy={OUTLIER[1]} r={OUTLIER[2] + 3} fill="none" stroke={p.accent} strokeWidth="0.8" opacity="0.5" />
        </svg>
    );
}
