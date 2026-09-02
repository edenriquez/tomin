"use client";

import { useEffect, useRef, type RefObject } from "react";
import { colors } from "@/design/tokens";
import type { Lectura } from "./types";

/**
 * The ring on the mark, drawn the one way that does not disturb the chart.
 *
 * `addPointAnnotation` appends to the chart's SVG without `updateOptions`, so
 * the memoised `ApexChart` is never re-rendered and a drag gesture in flight
 * keeps its gridRect (the crash the wrapper's memo exists to prevent). We add
 * with `pushToMemory=false` and own the lifecycle ourselves: `clearAnnotations`
 * would also wipe the chart's configured bands ("Proyección"), and memory
 * entries would resurrect rings we removed on the next resize redraw.
 *
 * The chart is found through its canvas — Apex names it `apexcharts<id>`, and
 * registers the instance under `<id>` (the configured `chart.id` or its own
 * cuid) — so no chart has to know it is being annotated.
 */
type ApexInstance = {
    addPointAnnotation: (opts: unknown, pushToMemory?: boolean) => void;
    w: { globals: { dom: { baseEl: HTMLElement }; labels?: unknown[] } };
};

type Registry = { getChartByID?: (id: string) => ApexInstance | undefined };

export const LENS_MARKER_CLASS = "lens-pulse";

export type AppliedAnchor = { lectura: Lectura; node: Element | null };

export function useLensAnnotations(
    rootRef: RefObject<HTMLElement>,
    lecturas: Lectura[],
    onApplied: (applied: AppliedAnchor[]) => void
) {
    const added = useRef<Element[]>([]);
    const onAppliedRef = useRef(onApplied);
    onAppliedRef.current = onApplied;

    useEffect(() => {
        const root = rootRef.current;
        if (!root) return;
        let cancelled = false;
        let settle: ReturnType<typeof setTimeout> | null = null;

        const remove = () => {
            for (const n of added.current) n.remove();
            added.current = [];
        };

        const apply = async () => {
            const canvas = root.querySelector<HTMLElement>(".apexcharts-canvas");
            const chartId = canvas?.id.replace(/^apexcharts/, "");
            if (!chartId) {
                onAppliedRef.current([]);
                return;
            }
            const Apex = (await import("apexcharts")).default as unknown as Registry;
            const chart = Apex.getChartByID?.(chartId);
            if (cancelled) return;
            if (!chart) {
                console.warn("[lens] chart not registered yet", chartId);
                return;
            }
            const parent = chart.w.globals.dom.baseEl.querySelector(".apexcharts-point-annotations");
            if (!parent) return;

            remove();
            const applied: AppliedAnchor[] = [];
            for (const l of lecturas) {
                const before = Array.from(parent.childNodes);
                try {
                chart.addPointAnnotation(
                    {
                        x: l.anchor.x,
                        y: l.anchor.y,
                        marker: {
                            size: 7,
                            fillColor: "transparent",
                            strokeColor: colors.signal,
                            strokeWidth: 1.5,
                            cssClass: LENS_MARKER_CLASS,
                        },
                        label: { text: "" },
                    },
                    false
                );
                } catch (err) {
                    console.error("[lens] addPointAnnotation failed", err);
                }
                const fresh = Array.from(parent.childNodes).filter((n) => !before.includes(n)) as Element[];
                added.current.push(...fresh);
                const marker = fresh.find((n) => n.classList?.contains(LENS_MARKER_CLASS)) ?? null;
                if (marker) snapToBar(chart, marker, l);
                applied.push({ lectura: l, node: marker });
            }
            onAppliedRef.current(applied);
        };

        // The chart renders async (dynamic import + its own rAF) and redraws
        // itself on resize, dropping our nodes with the old SVG. Apply now,
        // once more after a settle, and again whenever the canvas is replaced
        // (a `key` remount) or the card changes size.
        const schedule = () => {
            if (settle) clearTimeout(settle);
            settle = setTimeout(apply, 140);
        };
        void apply();
        schedule();
        const mo = new MutationObserver((records) => {
            for (const r of records) {
                for (const n of Array.from(r.addedNodes)) {
                    if (n instanceof HTMLElement && n.classList.contains("apexcharts-canvas")) return schedule();
                }
            }
        });
        mo.observe(root, { childList: true, subtree: true });
        const ro = new ResizeObserver(schedule);
        ro.observe(root);

        return () => {
            cancelled = true;
            if (settle) clearTimeout(settle);
            mo.disconnect();
            ro.disconnect();
            remove();
        };
    }, [rootRef, lecturas]);
}

/**
 * Apex places a category-axis point annotation at the slot's centre. On a
 * grouped bar chart that is the gap between the groups, so when the lectura
 * names its series the ring is moved onto that series' bar for the same
 * label. Stacked and single bars are already centred; the move is a no-op.
 */
function snapToBar(chart: ApexInstance, marker: Element, l: Lectura) {
    const si = l.anchor.seriesIndex;
    if (si === undefined || typeof l.anchor.x !== "string") return;
    const labels = chart.w.globals.labels;
    const j = Array.isArray(labels) ? labels.indexOf(l.anchor.x) : -1;
    if (j < 0) return;
    const bar = chart.w.globals.dom.baseEl.querySelector<SVGGraphicsElement>(
        `.apexcharts-series[rel="${si + 1}"] .apexcharts-bar-area[j="${j}"]`
    );
    if (!bar || typeof bar.getBBox !== "function") return;
    const box = bar.getBBox();
    if (box.width <= 0) return;
    const cx = box.x + box.width / 2;
    // Apex draws the marker as a <path> whose position lives in its first
    // "M x, y" — `cx` is only an attribute it copies along. Move both.
    marker.setAttribute("cx", String(cx));
    const d = marker.getAttribute("d");
    if (d) marker.setAttribute("d", d.replace(/^M\s*[-\d.]+\s*,\s*([-\d.]+)/, `M ${cx}, $1`));
}
