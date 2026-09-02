"use client";

import {
    useCallback,
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
    type ReactNode,
} from "react";
import { colors } from "@/design/tokens";

/** An inclusive run of x-axis slots, as indices into the caller's buckets. */
export type BucketRange = { start: number; end: number };

/**
 * Drag-to-select for charts whose x axis is a list of buckets (months).
 *
 * Apex only ships drag selection for numeric/datetime axes; the stacked
 * month charts (Categorías, Fijos) are category-axis bars, so this
 * wrapper adds the same gesture from outside: drag horizontally across the
 * plot and the covered buckets come back as an index range. The pixel→bucket
 * mapping reads the chart's own `.apexcharts-grid` rectangle, so the axis
 * gutter and legend never skew which month a pixel belongs to.
 *
 * Clicks pass through untouched — a bar's own click-to-filter keeps working;
 * only a movement beyond a small threshold becomes a drag, and the click that
 * the browser synthesizes after a drag is swallowed so releasing over a bar
 * does not also "click" it.
 *
 * While `range` is set the covered slots stay tinted (snapped to bucket
 * edges, remeasured on resize): the filter is visible where it was drawn,
 * not only in the chip beside the list it narrows.
 */
export function RangeBrush({
    buckets,
    range,
    onRange,
    disabled = false,
    children,
}: {
    /** How many x slots the chart draws. 0 disables the gesture. */
    buckets: number;
    /** The active selection, for the persistent highlight. */
    range: BucketRange | null;
    onRange: (range: BucketRange) => void;
    disabled?: boolean;
    children: ReactNode;
}) {
    const rootRef = useRef<HTMLDivElement>(null);
    // Live drag state outside React: a rectangle following the pointer must
    // not pay a render per mousemove.
    const drag = useRef<{ startX: number; active: boolean } | null>(null);
    const rectRef = useRef<HTMLDivElement>(null);
    const swallowClick = useRef(false);

    /** The plot area, in coordinates relative to this wrapper. */
    const gridBox = useCallback(() => {
        const root = rootRef.current;
        const grid = root?.querySelector(".apexcharts-grid");
        if (!root || !grid) return null;
        const g = grid.getBoundingClientRect();
        if (g.width === 0) return null;
        const r = root.getBoundingClientRect();
        return { left: g.left - r.left, top: g.top - r.top, width: g.width, height: g.height };
    }, []);

    const toBucket = useCallback(
        (clientX: number) => {
            const root = rootRef.current;
            const box = gridBox();
            if (!root || !box || buckets === 0) return null;
            const x = clientX - root.getBoundingClientRect().left - box.left;
            const idx = Math.floor((x / box.width) * buckets);
            return Math.min(buckets - 1, Math.max(0, idx));
        },
        [gridBox, buckets]
    );

    const onPointerDown = useCallback(
        (e: React.PointerEvent) => {
            // Mouse only: on touch this rectangle would fight page scrolling,
            // and the chip beside the list still clears any stale filter.
            if (disabled || buckets === 0 || e.pointerType !== "mouse" || e.button !== 0) return;
            drag.current = { startX: e.clientX, active: false };
        },
        [disabled, buckets]
    );

    // Move/up live on the window: a drag that leaves the card must still
    // resolve when released.
    useEffect(() => {
        function onMove(e: PointerEvent) {
            const d = drag.current;
            const root = rootRef.current;
            if (!d || !root) return;
            if (!d.active && Math.abs(e.clientX - d.startX) < 5) return;
            d.active = true;
            const box = gridBox();
            const rect = rectRef.current;
            if (!box || !rect) return;
            const rootLeft = root.getBoundingClientRect().left;
            const from = Math.min(d.startX, e.clientX) - rootLeft;
            const to = Math.max(d.startX, e.clientX) - rootLeft;
            const left = Math.max(box.left, from);
            const right = Math.min(box.left + box.width, to);
            Object.assign(rect.style, {
                display: "block",
                left: `${left}px`,
                width: `${Math.max(0, right - left)}px`,
                top: `${box.top}px`,
                height: `${box.height}px`,
            });
            // Dragging must not select axis labels along the way.
            e.preventDefault();
        }
        function onUp(e: PointerEvent) {
            const d = drag.current;
            drag.current = null;
            if (rectRef.current) rectRef.current.style.display = "none";
            if (!d?.active) return;
            swallowClick.current = true;
            const a = toBucket(d.startX);
            const b = toBucket(e.clientX);
            if (a === null || b === null) return;
            onRange({ start: Math.min(a, b), end: Math.max(a, b) });
        }
        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onUp);
        return () => {
            window.removeEventListener("pointermove", onMove);
            window.removeEventListener("pointerup", onUp);
        };
    }, [gridBox, toBucket, onRange]);

    // The persistent highlight: the active range snapped to bucket edges,
    // remeasured when the card resizes (the chart redraws its grid then too).
    const [highlight, setHighlight] = useState<React.CSSProperties | null>(null);
    useLayoutEffect(() => {
        if (!range || buckets === 0) {
            setHighlight(null);
            return;
        }
        const measure = () => {
            const box = gridBox();
            if (!box) return setHighlight(null);
            const slot = box.width / buckets;
            setHighlight({
                left: box.left + range.start * slot,
                width: (range.end - range.start + 1) * slot,
                top: box.top,
                height: box.height,
            });
        };
        // The chart renders async (dynamic import + its own rAF); measure now
        // and again shortly after, then follow size changes.
        measure();
        const settle = setTimeout(measure, 120);
        const observer = new ResizeObserver(measure);
        if (rootRef.current) observer.observe(rootRef.current);
        return () => {
            clearTimeout(settle);
            observer.disconnect();
        };
    }, [range, buckets, gridBox]);

    return (
        <div
            ref={rootRef}
            className="relative"
            onPointerDown={onPointerDown}
            onClickCapture={(e) => {
                if (swallowClick.current) {
                    swallowClick.current = false;
                    e.preventDefault();
                    e.stopPropagation();
                }
            }}
        >
            {children}
            {/* The live rectangle while dragging. */}
            <div
                ref={rectRef}
                aria-hidden
                className="pointer-events-none absolute hidden"
                style={{
                    background: `${colors.signal}14`,
                    border: `1px dashed ${colors.signal}80`,
                }}
            />
            {/* The settled selection, snapped to whole buckets. */}
            {highlight && (
                <div
                    aria-hidden
                    className="pointer-events-none absolute"
                    style={{
                        ...highlight,
                        background: `${colors.signal}0f`,
                        borderLeft: `1px dashed ${colors.signal}80`,
                        borderRight: `1px dashed ${colors.signal}80`,
                    }}
                />
            )}
        </div>
    );
}
