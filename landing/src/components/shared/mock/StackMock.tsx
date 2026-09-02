import { STACKS } from "@/lib/data";
import type { MockPalette } from "./palette";

/** Month-by-category stacks. Greys carry the shape; one signal layer. */
export function StackMock({ p, className }: { p: MockPalette; className?: string }) {
    return (
        <svg viewBox="0 0 100 80" className={className ?? "h-full w-full"} role="presentation">
            <line x1="0" y1="76" x2="100" y2="76" stroke={p.line} strokeWidth="1" />
            {STACKS.map(([a, b, c], i) => {
                const x = 8 + i * 19;
                const total = a + b + c;
                return (
                    <g key={i}>
                        <rect x={x} y={74 - a} width="12" height={a} rx="1.5" fill={p.ink} opacity="0.85" />
                        <rect x={x} y={74 - a - b} width="12" height={b} rx="1.5" fill={p.muted} />
                        <rect x={x} y={74 - total} width="12" height={c} rx="1.5" fill={p.accent} opacity="0.9" />
                    </g>
                );
            })}
        </svg>
    );
}
