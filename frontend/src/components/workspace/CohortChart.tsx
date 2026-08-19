"use client";

import { useMemo } from "react";
import type { ApexOptions } from "apexcharts";
import { ApexChart } from "@/components/charts/apex/ApexChart";
import { colors } from "@/design/tokens";
import { compactMxn, monthLabel, mxn } from "@/lib/format";
import { num, parsePeriodKey, type MetricRow } from "@/lib/metrics";

export type MonthPoint = { key: string; label: string; total: number };

/**
 * The set's spend per month, with the scenario laid over it.
 *
 * The scenario is a dotted line on *this* chart rather than a second chart
 * beside it. Two charts is the tempting layout and the wrong one: it creates
 * two sources of truth that can fall out of step, which is exactly what
 * MovimientosView avoids by feeding its scatter and its list from one array.
 * Here the bar is what happened and the line is what you asked about, and the
 * difference between them is a distance you can see rather than a subtraction
 * you have to do.
 *
 * Colour follows the same reasoning: the accent marks the *hypothesis*. The
 * real figure is the neutral stone ramp — data does not need to be pointed at.
 */
export function CohortChart({
    points,
    scenarioMonthly,
}: {
    points: MonthPoint[];
    /** The scenario's monthly cost, or `null` when no scenario is set. */
    scenarioMonthly: number | null;
}) {
    const options = useMemo<ApexOptions>(
        () => ({
            chart: { stacked: false, toolbar: { show: false } },
            // The bar is the real spend; the line is the hypothesis.
            colors: [colors.ash, colors.signal],
            stroke: {
                width: [0, 2],
                dashArray: [0, 6],
                curve: "straight",
            },
            plotOptions: { bar: { columnWidth: "52%", borderRadius: 2 } },
            xaxis: { categories: points.map((p) => p.label) },
            yaxis: { labels: { formatter: (v: number) => compactMxn(v) } },
            tooltip: { y: { formatter: (v: number) => mxn(v) } },
            legend: { show: scenarioMonthly !== null },
            markers: { size: 0 },
        }),
        [points, scenarioMonthly]
    );

    const series = useMemo(() => {
        const actual = {
            name: "Como vas",
            type: "column",
            data: points.map((p) => p.total),
        };
        if (scenarioMonthly === null) return [actual];
        return [
            actual,
            {
                name: "Escenario",
                type: "line",
                // A flat line across every month: the scenario is "this much,
                // every month", and drawing it as a constant is what makes the
                // gap against each real bar legible at a glance.
                data: points.map(() => scenarioMonthly),
            },
        ];
    }, [points, scenarioMonthly]);

    return (
        // min-w-0 is not optional: a CSS grid item defaults to min-width:auto
        // and an Apex SVG inside one will not shrink below its first render
        // width, so the page overflows the moment the window narrows.
        <div className="min-w-0">
            <ApexChart type="line" series={series} options={options} height={260} />
        </div>
    );
}

/** `cohort_activity` month rows -> chart points, oldest first. */
export function toMonthPoints(rows: MetricRow[] | undefined): MonthPoint[] {
    if (!rows) return [];
    return rows
        .map((row) => {
            const key = String(row.month ?? "");
            const parsed = parsePeriodKey(key);
            return {
                key,
                label: parsed ? monthLabel(parsed) : key,
                total: num(row.expense_amount),
            };
        })
        .filter((p) => p.key)
        .sort((a, b) => a.key.localeCompare(b.key));
}
