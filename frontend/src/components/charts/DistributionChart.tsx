"use client";

import { useMemo } from "react";
import type { ApexOptions } from "apexcharts";
import { CategorySpend } from "@/lib/api";
import { compactMxn, mxn0 } from "@/lib/format";
import { ApexChart } from "./apex/ApexChart";
import { categoricalColors } from "./apex/theme";

/** Beyond six bars a category breakdown stops being readable. */
const MAX_BARS = 6;

/**
 * Horizontal bar, sorted descending. The largest category gets Ember; the
 * rest take the neutral ramp in order. Length is the quantitative channel and
 * position is the categorical one, which leaves hue free to mean "this is the
 * one that matters".
 */
export function DistributionChart({ data }: { data: CategorySpend[] }) {
    const rows = useMemo(() => {
        const sorted = [...data].sort((a, b) => b.amount - a.amount);
        if (sorted.length <= MAX_BARS) return sorted;
        const head = sorted.slice(0, MAX_BARS - 1);
        const rest = sorted.slice(MAX_BARS - 1);
        return [
            ...head,
            {
                category_id: "__otros__",
                category_name: "Otros",
                amount: rest.reduce((s, c) => s + c.amount, 0),
                percentage: rest.reduce((s, c) => s + c.percentage, 0),
            },
        ];
    }, [data]);

    const options: ApexOptions = useMemo(
        () => ({
            // Index 0 is the largest after the sort above, so Ember lands on it.
            colors: categoricalColors(rows.length, 0),
            plotOptions: {
                bar: {
                    horizontal: true,
                    barHeight: "62%",
                    borderRadius: 2,
                    distributed: true,
                },
            },
            xaxis: {
                categories: rows.map((c) => c.category_name),
                labels: { formatter: (v: string) => compactMxn(Number(v)) },
            },
            grid: { xaxis: { lines: { show: true } }, yaxis: { lines: { show: false } } },
            tooltip: {
                // `distributed` puts every bar in one series, so the default
                // tooltip title would repeat the series name on every row.
                y: {
                    formatter: (v: number) => mxn0(v),
                    title: { formatter: () => "" },
                },
            },
        }),
        [rows]
    );

    if (!rows.length) {
        return <p className="text-body-sm text-pewter">Aun no hay gastos categorizados.</p>;
    }

    return (
        <ApexChart
            type="bar"
            series={[{ name: "Gasto", data: rows.map((c) => Math.round(c.amount)) }]}
            options={options}
            height={Math.max(180, rows.length * 44 + 40)}
        />
    );
}
