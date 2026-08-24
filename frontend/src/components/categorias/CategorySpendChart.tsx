"use client";

import { useMemo, useRef } from "react";
import type { ApexOptions } from "apexcharts";
import { colors as palette } from "@/design/tokens";
import { compactMxn, mxn } from "@/lib/format";
import { ApexChart } from "@/components/charts/apex/ApexChart";

export type MonthlyCategoryPoint = {
    /** "2026-05" — the metric's month bucket key. */
    month: string;
    monthLabel: string;
    category: string;
    amount: number;
};

/**
 * Stacked columns: one column per month, one layer per category, each layer
 * in its category's color. The column's full height is the month's spend and
 * the layers answer where it went — the "how much did each month cost, and
 * on what" reading in a single mark per month.
 *
 * A layer is also a question: "which charges are these?". Clicking one asks
 * it, and the list below answers — same gesture as a dot in Movimientos, so
 * a mark in this app always means the rows behind it are one click away.
 */
export function CategorySpendChart({
    points,
    categoryColors,
    onPick,
    height = 360,
}: {
    points: MonthlyCategoryPoint[];
    /** category name -> color; drives layer colors and legend order. */
    categoryColors: Map<string, string>;
    /** A layer was clicked: its category and its month bucket ("2026-05"). */
    onPick?: (category: string, month: string) => void;
    height?: number;
}) {
    // The click handler reads these through a ref: Apex keeps the options
    // object it was mounted with, so a stale closure would report last
    // render's categories after a period change.
    const lookup = useRef<{ categories: string[]; months: string[] }>({
        categories: [],
        months: [],
    });

    const { series, colors, monthLabels } = useMemo(() => {
        const months: string[] = [];
        const monthLabels: string[] = [];
        const totals = new Map<string, number>();
        for (const p of points) {
            if (!months.includes(p.month)) {
                months.push(p.month);
                monthLabels.push(p.monthLabel);
            }
            totals.set(p.category, (totals.get(p.category) ?? 0) + p.amount);
        }
        // Biggest category at the bottom of the stack: the stable base makes
        // month-to-month comparison of the dominant cost possible by eye.
        const categories = Array.from(totals.keys()).sort(
            (a, b) => (totals.get(b) ?? 0) - (totals.get(a) ?? 0)
        );

        const byKey = new Map(points.map((p) => [`${p.month}|${p.category}`, p.amount]));
        const series = categories.map((cat) => ({
            name: cat,
            data: months.map((m) => Math.round(byKey.get(`${m}|${cat}`) ?? 0)),
        }));
        const colors = categories.map((c) => categoryColors.get(c) ?? "#a8a29e");
        lookup.current = { categories, months };
        return { series, colors, monthLabels };
    }, [points, categoryColors]);

    const options: ApexOptions = useMemo(
        () => ({
            chart: {
                stacked: true,
                events: {
                    dataPointSelection: (_e, _ctx, ctx) => {
                        const { categories, months } = lookup.current;
                        const category = categories[ctx.seriesIndex];
                        const month = months[ctx.dataPointIndex];
                        if (category && month) onPick?.(category, month);
                    },
                },
            },
            colors,
            plotOptions: { bar: { columnWidth: "55%", borderRadius: 2 } },
            stroke: { width: 0 },
            xaxis: { categories: monthLabels },
            yaxis: { labels: { formatter: (v: number) => compactMxn(v) } },
            legend: {
                show: true,
                position: "top",
                horizontalAlign: "left",
                fontSize: "13px",
                markers: { size: 6, shape: "circle" },
                itemMargin: { horizontal: 10 },
                offsetY: -4,
            },
            // Per-layer, not shared: the tooltip names the thing a click would
            // filter to, so hovering previews the gesture. The month's total
            // rides along — the layer answers "on what", the total "how much",
            // without hunting the column's full height against the axis.
            tooltip: {
                shared: false,
                intersect: true,
                custom: ({ series, seriesIndex, dataPointIndex }) => {
                    const category = lookup.current.categories[seriesIndex] ?? "";
                    const value = series[seriesIndex]?.[dataPointIndex] ?? 0;
                    const total = (series as number[][]).reduce(
                        (sum, layer) => sum + (layer[dataPointIndex] ?? 0),
                        0
                    );
                    return `
                        <div style="padding:8px 10px">
                            <div style="font-size:12px;color:${palette.graphite}">${escapeHtml(monthLabels[dataPointIndex] ?? "")}</div>
                            <div style="font-size:13px;color:${palette.ink};display:flex;align-items:center;gap:6px">
                                <span style="width:8px;height:8px;border-radius:9999px;background:${colors[seriesIndex]};display:inline-block"></span>
                                <span>${escapeHtml(category)}</span>
                                <span style="font-variant-numeric:tabular-nums">${mxn(value)}</span>
                            </div>
                            <div style="margin-top:2px;font-size:12px;color:${palette.graphite};font-variant-numeric:tabular-nums">Total del mes ${mxn(total)}</div>
                        </div>`;
                },
            },
            states: { active: { filter: { type: "darken", value: 0.6 } } },
        }),
        [colors, monthLabels, onPick]
    );

    return <ApexChart type="bar" series={series} options={options} height={height} />;
}

/** Category names are user-written text landing in tooltip HTML. */
function escapeHtml(s: string): string {
    return s
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;");
}
