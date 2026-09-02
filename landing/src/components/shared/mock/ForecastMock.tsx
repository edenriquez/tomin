import type { MockPalette } from "./palette";

/**
 * Pronóstico: labelled income (solid) against the fijos need (dashed), two
 * quincenas wide. The gap between them is the message.
 */
export function ForecastMock({ p, className }: { p: MockPalette; className?: string }) {
    return (
        <svg viewBox="0 0 100 80" className={className ?? "h-full w-full"} role="presentation">
            <line x1="0" y1="76" x2="100" y2="76" stroke={p.line} strokeWidth="1" />
            <line x1="50" y1="8" x2="50" y2="76" stroke={p.line} strokeWidth="0.8" strokeDasharray="2 2" />
            {/* the need: a step that rises when each fijo lands */}
            <path
                d="M 0 70 H 12 V 62 H 24 V 58 H 38 V 46 H 50 V 70 H 62 V 62 H 74 V 58 H 88 V 46 H 100"
                fill="none"
                stroke={p.muted}
                strokeWidth="1.5"
                strokeDasharray="3 2"
            />
            {/* income: two pay-days */}
            <path d="M 0 74 H 6 V 20 H 100" fill="none" stroke={p.accent} strokeWidth="1.8" opacity="0.9" />
            <circle cx="6" cy="20" r="2.4" fill={p.accent} />
            <circle cx="50" cy="20" r="2.4" fill={p.accent} />
        </svg>
    );
}
