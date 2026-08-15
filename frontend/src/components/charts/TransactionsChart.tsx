"use client";

import { useEffect, useMemo, useRef } from "react";
import type { ApexOptions } from "apexcharts";
import type { Transaction } from "@/lib/api";
import { chart as chartTokens, colors } from "@/design/tokens";
import { categoryColor, categoryName, type CategoryInfo } from "@/lib/categories";
import { compactMxn, dayLabel, monthLabel, mxn, mxn2 } from "@/lib/format";
import { grainFor, type WindowId } from "@/lib/window";
import { ApexChart } from "./apex/ApexChart";

const CHART_ID = "tx-chart";

/**
 * The two readings of "every movement, charted":
 *
 * - `scatter`: one dot per transaction, x = date, y = amount. WHEN was the
 *   odd charge — outliers sit above the cloud, bursts cluster on the axis.
 *   Selection is two-way with the list.
 * - `flujo`: the aggregate — income and expense as translucent areas per
 *   time bucket (days on short windows, months on long) with the running net
 *   as a line. The shape of money moving, not its individual events;
 *   selection is deliberately inert here (an area is many movements).
 *
 * Modes `bars`, `ranking` and the stacked-by-category lived here once and
 * were retired: the first two answered questions the list already answers on
 * sort, the third was Categorías' chart twice. Stored values for them fall
 * back to `scatter` via the caller's unknown-mode guard.
 */
export const CHART_MODES = ["scatter", "flujo"] as const;
export type ChartMode = (typeof CHART_MODES)[number];

export const CHART_MODE_LABELS: Record<ChartMode, string> = {
    scatter: "Puntos",
    flujo: "Flujo",
};

/** What decides a mark's color: nothing (the neutral), or its category. */
export const COLOR_MODES = ["neutral", "categoria"] as const;
export type ColorMode = (typeof COLOR_MODES)[number];

export const COLOR_MODE_LABELS: Record<ColorMode, string> = {
    neutral: "Neutro",
    categoria: "Categoría",
};

/** Local-midnight ms, parsed by hand: Date.parse("2026-08-12") is UTC
 *  midnight, which is the previous evening in Mexico City. */
function toMs(isoDate: string): number {
    const [y, m, d] = isoDate.split("-").map(Number);
    return new Date(y, (m ?? 1) - 1, d ?? 1).getTime();
}

/**
 * Selection is two-way with the table:
 * - mark → row: Apex `dataPointSelection` → `onSelect(id)`.
 * - row → mark: `ApexCharts.exec(..., "toggleDataPointSelection")` from an
 *   effect. Two guards are load-bearing: `exec` TOGGLES (re-execing the
 *   selected point would deselect it) and it RE-FIRES `dataPointSelection`
 *   (without suppression, select → event → select is a loop).
 */
export function TransactionsChart({
    transactions,
    mode,
    colorMode,
    categories,
    showIncome,
    windowId,
    selectedId,
    onSelect,
    height = 320,
}: {
    /** Already window+search filtered, `tx_date DESC` from the API. */
    transactions: Transaction[];
    mode: ChartMode;
    /** "categoria" colors every mark by its category; corrections become
     *  visible — fix a category and watch the mark change. */
    colorMode: ColorMode;
    /** From useCategories(); null degrades to the neutral palette. */
    categories: Map<string, CategoryInfo> | null;
    showIncome: boolean;
    windowId: WindowId;
    selectedId: string | null;
    onSelect: (id: string | null) => void;
    height?: number;
}) {
    const byCategory = colorMode === "categoria" && categories !== null;

    const { series, pointIds, idToPoint, seriesColors, stackedBuckets } = useMemo(() => {
        const pool = showIncome
            ? transactions
            : transactions.filter((t) => t.type === "expense");

        if (mode === "scatter") {
            // Scatter colors are per-series, so the grouping IS the coloring:
            // by direction in neutral mode, by category in categoria mode.
            let groups: Transaction[][];
            let names: string[];
            let seriesColors: string[];
            if (byCategory) {
                const keys = new Map<string | null, Transaction[]>();
                for (const t of pool) {
                    const k = t.category_id ?? null;
                    const g = keys.get(k);
                    if (g) g.push(t);
                    else keys.set(k, [t]);
                }
                // Biggest group first so the legend leads with what dominates.
                const entries = Array.from(keys.entries()).sort(
                    (a, b) => b[1].length - a[1].length
                );
                groups = entries.map(([, txns]) => txns);
                names = entries.map(([k]) => categoryName(categories, k));
                seriesColors = entries.map(([k]) => categoryColor(categories, k));
            } else {
                groups = showIncome
                    ? [
                          pool.filter((t) => t.type === "expense"),
                          pool.filter((t) => t.type === "income"),
                      ]
                    : [pool];
                names = ["Gastos", "Ingresos"];
                seriesColors = [chartTokens.neutral[3], colors.signal];
            }
            return {
                series: groups.map((txns, gi) => ({
                    name: names[gi],
                    data: txns.map((t) => ({ x: toMs(t.date), y: t.amount })),
                })),
                pointIds: groups.map((txns) => txns.map((t) => t.id)),
                idToPoint: new Map(
                    groups.flatMap((txns, si) =>
                        txns.map((t, di) => [t.id, [si, di] as [number, number]])
                    )
                ),
                seriesColors,
                stackedBuckets: [] as string[],
            };
        }

        if (mode === "flujo") {
            // Aggregate: income and expense per bucket, plus the running net —
            // the answer to "¿voy ganando o perdiendo?" over the window.
            const grain = grainFor(windowId);
            const bucketOf = (iso: string) => (grain === "day" ? iso : iso.slice(0, 7));

            const buckets: string[] = [];
            const income = new Map<string, number>();
            const expense = new Map<string, number>();
            for (const t of transactions) {
                // Same ledger rules as the cube: a transfer between the
                // user's own accounts is not income or spend, and excluded
                // rows stay excluded. The scatter still shows them — it is
                // the ledger — but an aggregate that counted them would call
                // moving your own money "losing" it.
                if (t.is_transfer || t.excluded_from_stats) continue;
                const b = bucketOf(t.date);
                if (!buckets.includes(b)) buckets.push(b);
                const bag = t.type === "income" ? income : expense;
                bag.set(b, (bag.get(b) ?? 0) + t.amount);
            }
            buckets.sort();
            let running = 0;
            const net = buckets.map((b) => {
                running += (income.get(b) ?? 0) - (expense.get(b) ?? 0);
                return Math.round(running);
            });

            return {
                series: [
                    {
                        name: "Ingresos",
                        type: "area" as const,
                        data: buckets.map((b) => Math.round(income.get(b) ?? 0)),
                    },
                    {
                        name: "Gastos",
                        type: "area" as const,
                        data: buckets.map((b) => Math.round(expense.get(b) ?? 0)),
                    },
                    { name: "Neto acumulado", type: "line" as const, data: net },
                ],
                // No per-mark identity in an aggregate: selection stays inert.
                pointIds: [] as string[][],
                idToPoint: new Map<string, [number, number]>(),
                seriesColors: [chartTokens.neutral[1], chartTokens.neutral[4], colors.signal],
                stackedBuckets: buckets.map((b) => {
                    const date = toMs(grain === "day" ? b : `${b}-01`);
                    return grain === "day"
                        ? dayLabel(new Date(date))
                        : monthLabel(new Date(date), true);
                }),
            };
        }

        // Unreachable: both modes return above. Keeps TS's control-flow happy.
        throw new Error(`unknown chart mode: ${mode}`);
    }, [transactions, showIncome, mode, byCategory, categories, windowId]);

    // Refs shared between the event handler and the row→mark effect.
    const suppressEvent = useRef(false);
    const lastExeced = useRef<[number, number] | null>(null);
    const idToPointRef = useRef(idToPoint);
    idToPointRef.current = idToPoint;
    const pointIdsRef = useRef(pointIds);
    pointIdsRef.current = pointIds;

    // A mode change remounts the chart (see the `key` on ApexChart below), so
    // whatever selection was exec'd into the previous instance is gone with
    // it. Forget it BEFORE the selection effect runs — effects run in
    // declaration order — so the effect re-applies onto the fresh chart.
    useEffect(() => {
        lastExeced.current = null;
    }, [mode, showIncome, colorMode]);

    // Row → mark. Data or mode changes rebuild the chart, so re-run then too.
    useEffect(() => {
        const target = selectedId ? idToPointRef.current.get(selectedId) ?? null : null;
        const prev = lastExeced.current;
        const same =
            (target === null && prev === null) ||
            (target !== null && prev !== null && target[0] === prev[0] && target[1] === prev[1]);
        if (same) return;

        let cancelled = false;
        (async () => {
            // apexcharts touches `window` at import time — client-only import.
            const Apex = (await import("apexcharts")).default;
            // After a remount the new chart may not have registered under
            // CHART_ID yet — exec on a missing chart is a silent no-op and the
            // selection would just vanish. Wait for it, bounded.
            type Registry = { getChartByID?: (id: string) => unknown };
            const registry = Apex as unknown as Registry;
            for (let i = 0; i < 10 && !cancelled; i++) {
                if (registry.getChartByID?.(CHART_ID)) break;
                await new Promise((r) => setTimeout(r, 50));
            }
            if (cancelled) return;
            suppressEvent.current = true;
            try {
                if (prev) Apex.exec(CHART_ID, "toggleDataPointSelection", prev[0], prev[1]);
                if (target) Apex.exec(CHART_ID, "toggleDataPointSelection", target[0], target[1]);
                lastExeced.current = target;
            } finally {
                suppressEvent.current = false;
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [selectedId, series]);

    const options: ApexOptions = useMemo(() => {
        const neutral = chartTokens.neutral[3];

        const base: ApexOptions = {
            chart: {
                id: CHART_ID,
                // Animations off: hundreds of SVG marks re-tweening on every
                // window change stutters on phones.
                animations: { enabled: false },
                events: {
                    dataPointSelection: (_e, _ctx, ctx) => {
                        if (suppressEvent.current) return;
                        const { seriesIndex, dataPointIndex, selectedDataPoints } = ctx;
                        const still = (selectedDataPoints as number[][]).some(
                            (s) => (s?.length ?? 0) > 0
                        );
                        const id = still
                            ? pointIdsRef.current[seriesIndex]?.[dataPointIndex] ?? null
                            : null;
                        lastExeced.current = still ? [seriesIndex, dataPointIndex] : null;
                        onSelect(id);
                    },
                },
            },
            yaxis: { labels: { formatter: (v: number) => compactMxn(v) } },
            grid: { xaxis: { lines: { show: false } }, yaxis: { lines: { show: true } } },
            states: {
                // The selected mark darkens; everything else keeps its color.
                active: { filter: { type: "darken", value: 0.55 } },
            },
            tooltip: {
                shared: false,
                intersect: true,
                custom: ({ seriesIndex, dataPointIndex }) => {
                    const id = pointIdsRef.current[seriesIndex]?.[dataPointIndex];
                    const t = transactions.find((x) => x.id === id);
                    if (!t) return "";
                    const d = new Date(toMs(t.date));
                    return `
                        <div style="padding:8px 10px;max-width:260px">
                            <div style="font-size:12px;color:${colors.graphite}">${dayLabel(d)} · ${escapeHtml(categoryName(categories, t.category_id))}</div>
                            <div style="font-size:13px;color:${colors.ink};white-space:normal">${escapeHtml(t.description)}</div>
                            <div style="font-size:13px;color:${colors.ink};font-variant-numeric:tabular-nums">${t.type === "income" ? "+" : ""}${mxn2(t.amount)}</div>
                        </div>`;
                },
            },
        };

        if (mode === "flujo") {
            return {
                ...base,
                colors: seriesColors,
                // Two translucent areas whose overlap IS the reading: where
                // income shows through above expense, the month gained; the
                // Signal line carries the verdict. Straight segments — a
                // spline invents money between real points.
                stroke: { width: [2, 2, 2], curve: "straight" },
                fill: {
                    type: ["solid", "solid", "solid"],
                    opacity: [0.14, 0.22, 1],
                },
                markers: { size: 0, hover: { size: 4 } },
                xaxis: { categories: stackedBuckets },
                legend: {
                    show: true,
                    position: "top",
                    horizontalAlign: "left",
                    fontSize: "13px",
                    markers: { size: 6, shape: "circle" },
                    itemMargin: { horizontal: 10 },
                    offsetY: -4,
                },
                // Aggregate marks: the per-transaction custom tooltip would
                // lie here, so the shared default (every layer's amount for
                // the hovered bucket) replaces it.
                tooltip: {
                    shared: true,
                    intersect: false,
                    custom: undefined,
                    y: { formatter: (v: number) => mxn(v) },
                },
                // Nothing to select in an aggregate.
                states: { active: { filter: { type: "none", value: 0 } } },
            };
        }

        if (mode === "scatter") {
            return {
                ...base,
                colors: seriesColors,
                markers: { size: 4, strokeWidth: 0, hover: { size: 6 } },
                xaxis: {
                    type: "datetime",
                    // Points are local-midnight ms; UTC rendering shifts them.
                    labels: {
                        datetimeUTC: false,
                        // Apex's datetime defaults are English — always format.
                        formatter: (value: string) => {
                            // Apex calls this with whatever it has, including
                            // undefined while an axis is still empty — which
                            // `Number()` turns into NaN and a Date into an
                            // Invalid Date. Nothing is the right label then.
                            const ms = Number(value);
                            if (!Number.isFinite(ms)) return "";
                            const d = new Date(ms);
                            return grainFor(windowId) === "day"
                                ? dayLabel(d)
                                : monthLabel(d, true);
                        },
                        style: { colors: chartTokens.axisLabel, fontSize: "12px" },
                    },
                },
                // The legend names the grouping — directions or categories.
                legend:
                    showIncome || byCategory
                        ? {
                              show: true,
                              position: "top",
                              horizontalAlign: "left",
                              fontSize: "13px",
                              markers: { size: 6, shape: "circle" },
                              itemMargin: { horizontal: 10 },
                              offsetY: -4,
                          }
                        : { show: false },
            };
        }

        // Unreachable: both modes return above.
        throw new Error(`unknown chart mode: ${mode}`);
    }, [mode, windowId, showIncome, byCategory, categories, transactions, seriesColors, stackedBuckets, onSelect]);

    const type = mode === "scatter" ? "scatter" : "line";
    return (
        // key={mode}: react-apexcharts MUTATES the mounted chart when type or
        // options change, and a scatter half-morphed into a bar chart keeps
        // stale axes and markers. A mode switch is a different chart, not an
        // update — remount it.
        <ApexChart
            // showIncome and colorMode are in the key too: both change the
            // series structure or color strategy, both remount-worthy.
            key={`${mode}-${showIncome}-${colorMode}`}
            type={type}
            series={series}
            options={options}
            height={height}
        />
    );
}

function escapeHtml(s: string): string {
    return s
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;");
}
