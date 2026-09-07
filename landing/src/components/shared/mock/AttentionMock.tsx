import type { MockPalette } from "./palette";

/**
 * The attention readings: three statement lines, the one that deserves a
 * look marked in Signal. Bars stand in for text so the mock reads at 40px.
 */
export function AttentionMock({ p, className }: { p: MockPalette; className?: string }) {
    const rows: { name: number; amount: number; hot: boolean; tag?: string }[] = [
        { name: 34, amount: 14, hot: false },
        { name: 26, amount: 18, hot: true, tag: "INUSUAL" },
        { name: 40, amount: 12, hot: false },
        { name: 30, amount: 16, hot: true, tag: "DUPLICADO" },
    ];
    return (
        <svg viewBox="0 0 100 80" className={className ?? "h-full w-full"} role="presentation">
            {rows.map((r, i) => {
                const y = 12 + i * 17;
                return (
                    <g key={i}>
                        {r.hot && <rect x="2" y={y - 6.5} width="96" height="13" rx="2" fill={p.accent} opacity="0.1" />}
                        <circle cx="8" cy={y} r="2.2" fill={r.hot ? p.accent : p.fog} />
                        <rect x="14" y={y - 1.5} width={r.name} height="3" rx="1.5" fill={r.hot ? p.ink : p.muted} />
                        {r.tag && (
                            <text
                                x={16 + r.name + 4}
                                y={y + 1.6}
                                fontSize="4.2"
                                fontFamily="var(--font-inter), sans-serif"
                                fontWeight="500"
                                letterSpacing="0.4"
                                fill={p.accent}
                            >
                                {r.tag}
                            </text>
                        )}
                        <rect x={96 - r.amount} y={y - 1.5} width={r.amount} height="3" rx="1.5" fill={r.hot ? p.accent : p.muted} />
                    </g>
                );
            })}
        </svg>
    );
}
