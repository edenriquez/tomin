"use client";

import { useCallback, useRef, useState, type MouseEvent } from "react";

/**
 * One small ink tooltip per chart, positioned inside the chart's own box so it
 * scrolls with it. `bind(text)` returns the handlers for a mark.
 */
export function useChartTip() {
    const box = useRef<HTMLDivElement>(null);
    const [tip, setTip] = useState<{ x: number; y: number; text: string } | null>(null);

    const bind = useCallback(
        (text: string) => ({
            onMouseMove: (e: MouseEvent) => {
                const r = box.current?.getBoundingClientRect();
                if (!r) return;
                setTip({ x: e.clientX - r.left, y: e.clientY - r.top, text });
            },
            onMouseLeave: () => setTip(null),
        }),
        []
    );

    const node = tip ? (
        <div
            role="status"
            className="pointer-events-none absolute z-10 -translate-x-1/2 whitespace-nowrap rounded-control bg-soot px-2 py-1 text-label text-paper tabular"
            style={{ left: tip.x, top: tip.y - 36 }}
        >
            {tip.text}
        </div>
    ) : null;

    return { box, bind, node };
}
