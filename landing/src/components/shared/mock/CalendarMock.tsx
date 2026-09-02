import { CHARGED } from "@/lib/data";
import type { MockPalette } from "./palette";

/** The recurring calendar: the grid, the rhythm, the next expected charge. */
export function CalendarMock({ p, className }: { p: MockPalette; className?: string }) {
    return (
        <svg viewBox="0 0 100 80" className={className ?? "h-full w-full"} role="presentation">
            {Array.from({ length: 42 }).map((_, i) => {
                const col = i % 14;
                const row = Math.floor(i / 14);
                const x = 4 + col * 6.8;
                const y = 22 + row * 18;
                const on = CHARGED.has(i);
                return (
                    <rect
                        key={i}
                        x={x}
                        y={y}
                        width="5"
                        height="14"
                        rx="1.5"
                        fill={on ? p.ink : p.fog}
                        opacity={on ? 0.8 : 1}
                    />
                );
            })}
            <rect
                x={4 + 9 * 6.8}
                y={22}
                width="5"
                height="14"
                rx="1.5"
                fill="none"
                stroke={p.accent}
                strokeWidth="1.5"
                strokeDasharray="2.5 2"
            />
        </svg>
    );
}
