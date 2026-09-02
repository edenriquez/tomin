import { FIGURES } from "@/lib/data";
import type { MockPalette } from "./palette";

/**
 * The supermarket ticket read on the phone, with the one line that moved.
 * Numbers are drawn as text so they stay tabular and crisp at any size.
 */
export function TicketMock({ p, className }: { p: MockPalette; className?: string }) {
    const rows: [string, string, boolean][] = [
        ["Huevo 18", "62.00", false],
        [FIGURES.ticketItem, "28.50", true],
        ["Tortillas", "24.00", false],
        ["Jitomate", "31.80", false],
    ];
    return (
        <svg viewBox="0 0 100 80" className={className ?? "h-full w-full"} role="presentation">
            <rect x="18" y="4" width="64" height="72" rx="2" fill={p.surface} stroke={p.line} />
            <text x="50" y="14" textAnchor="middle" fontSize="5.5" fontFamily="ui-monospace, monospace" fill={p.ink} letterSpacing="0.6">
                {FIGURES.ticketStore}
            </text>
            <line x1="24" y1="19" x2="76" y2="19" stroke={p.line} strokeDasharray="1.5 1.5" />
            {rows.map(([name, amt, hot], i) => {
                const y = 28 + i * 9;
                return (
                    <g key={name} fontSize="4.6" fontFamily="ui-monospace, monospace" fill={hot ? p.accent : p.muted}>
                        {hot && <rect x="22" y={y - 5.4} width="56" height="8" rx="1" fill={p.accent} opacity="0.12" />}
                        <text x="24" y={y}>{name.toUpperCase()}</text>
                        <text x="76" y={y} textAnchor="end">{amt}</text>
                    </g>
                );
            })}
            <line x1="24" y1="64" x2="76" y2="64" stroke={p.line} strokeDasharray="1.5 1.5" />
            <g fontSize="4.8" fontFamily="ui-monospace, monospace" fill={p.ink}>
                <text x="24" y="71">TOTAL</text>
                <text x="76" y="71" textAnchor="end">{FIGURES.ticketTotal.replace("$", "")}</text>
            </g>
            {/* the delta pill */}
            <g>
                <rect x="60" y="0.5" width="26" height="9" rx="4.5" fill={p.accent} />
                <text x="73" y="7" textAnchor="middle" fontSize="5" fontFamily="var(--font-inter), sans-serif" fill="#0c0a09" fontWeight="500">
                    {FIGURES.ticketDelta}
                </text>
            </g>
        </svg>
    );
}
