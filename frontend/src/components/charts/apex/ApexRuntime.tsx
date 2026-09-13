"use client";

import { useEffect, useRef } from "react";
// Static, not `await import`: this module is only ever reached through a
// `next/dynamic` with `ssr: false`, so `window` exists by the time it runs —
// and an async import here would leave the card empty for a beat, which is the
// chart's own version of a layout jump.
import ApexCharts from "apexcharts";
import type { ApexOptions } from "apexcharts";

/**
 * The chart driver: one ApexCharts instance, created once and then *updated*.
 *
 * This replaces `react-apexcharts`, for one reason that is visible on screen.
 * That wrapper renders the chart in one effect and, in the very next effect of
 * the same commit, compares `JSON.stringify(chart.options)` against the props
 * it was given — a comparison that can never match, because Apex stores its
 * own merged config — and so calls `updateOptions()` immediately. The update
 * repaints the chart from the paths it had just drawn, which cancels the
 * entrance animation a frame or two after it starts. Every chart in the app
 * came out static, whatever the theme said.
 *
 * Here the mount render is left alone: it grows in. Afterwards, options and
 * series are pushed only when the caller hands over a new object — which is
 * why `ApexChart` is memoized and callers keep theirs in `useMemo`. Apex then
 * tweens from the marks already on screen to the new ones.
 */
export default function ApexRuntime({
    type,
    series,
    options,
    height,
    width,
    className,
    onReady,
}: {
    type: NonNullable<ApexOptions["chart"]>["type"];
    series: ApexOptions["series"];
    options: ApexOptions;
    height?: number | string;
    width?: number | string;
    className?: string;
    /** Fired once the first draw is on screen, so the caller can drop its
     *  placeholder without leaving a gap or stacking two of them. */
    onReady?: () => void;
}) {
    const host = useRef<HTMLDivElement>(null);
    const chart = useRef<ApexCharts | null>(null);
    // What the chart was built with. Identity, not deep equality: a caller
    // handing back the same object means "nothing changed".
    const drawn = useRef<{ options: ApexOptions; series: ApexOptions["series"] } | null>(
        null
    );
    // The live props, so mount can read them without re-running on a change.
    const latest = useRef({ type, series, options, height, width });
    latest.current = { type, series, options, height, width };
    const ready = useRef(onReady);
    ready.current = onReady;

    useEffect(() => {
        const el = host.current;
        if (!el) return;
        const { type: t, series: s, options: o, height: h, width: w } = latest.current;
        const instance = new ApexCharts(el, {
            ...o,
            chart: { ...o.chart, type: t, height: h, width: w },
            series: s,
        });
        chart.current = instance;
        drawn.current = { options: o, series: s };
        instance.render().then(() => ready.current?.());
        return () => {
            instance.destroy();
            chart.current = null;
            drawn.current = null;
        };
    }, []);

    useEffect(() => {
        const instance = chart.current;
        const last = drawn.current;
        if (!instance || !last) return;
        const sameOptions = last.options === options;
        const sameSeries = last.series === series;
        if (sameOptions && sameSeries) return;
        drawn.current = { options, series };
        // Series alone: `updateSeries` is the animated path — the columns move
        // to their new height instead of being redrawn there.
        if (sameOptions) {
            instance.updateSeries(series as never, true);
            return;
        }
        instance.updateOptions(
            {
                ...options,
                chart: { ...options.chart, type, height, width },
                series,
            },
            false,
            true
        );
    }, [options, series, type, height, width]);

    return (
        // min-w-0 matters: a grid item defaults to min-width:auto and the SVG
        // will not shrink below its first render width, overflowing the grid.
        <div ref={host} className={className} style={{ minWidth: 0 }} />
    );
}
