"use client";

import { useMemo } from "react";
import type { ApexOptions } from "apexcharts";
import { chart, colors } from "@/design/tokens";
import { compactMxn, monthLabel, mxn0 } from "@/lib/format";
import { num, parsePeriodKey } from "@/lib/metrics";
import { ApexChart } from "@/components/charts/apex/ApexChart";
import type { WidgetBodyProps, WidgetDef } from "../types";

function Body({ result, height }: WidgetBodyProps) {
    const points = useMemo(() => {
        let previous = 0;
        return result.rows.map((row) => {
            // The metric is declared `cumulative`, so the column the API sends
            // is already a running sum. The per-period bar is the difference
            // between consecutive points — derived here rather than asking the
            // backend for the same numbers twice.
            const cumulative = num(row.expense_amount);
            const delta = Math.max(0, cumulative - previous);
            previous = cumulative;
            const date = parsePeriodKey(row.month ?? row.day);
            return {
                label: date ? monthLabel(date, true) : String(row.month ?? row.day ?? ""),
                delta: Math.round(delta),
                cumulative: Math.round(cumulative),
            };
        });
    }, [result.rows]);

    const series = useMemo(
        () => [
            { name: "Gasto del periodo", type: "column", data: points.map((p) => p.delta) },
            { name: "Acumulado", type: "line", data: points.map((p) => p.cumulative) },
        ],
        [points]
    );

    const options: ApexOptions = useMemo(
        () => ({
            colors: [chart.neutral[3], colors.ember],
            xaxis: { categories: points.map((p) => p.label) },
            stroke: { width: [0, 2], curve: "straight" },
            plotOptions: { bar: { columnWidth: "52%", borderRadius: 2 } },
            yaxis: [
                {
                    seriesName: "Gasto del periodo",
                    labels: { formatter: (v: number) => compactMxn(v) },
                },
                {
                    seriesName: "Acumulado",
                    opposite: true,
                    labels: { formatter: (v: number) => compactMxn(v) },
                },
            ],
            markers: { size: 0, hover: { size: 4 } },
            legend: {
                show: true,
                position: "top",
                horizontalAlign: "left",
                fontSize: "13px",
                markers: { size: 6, shape: "circle" },
                itemMargin: { horizontal: 10 },
                offsetY: -4,
            },
            tooltip: { shared: true, intersect: false, y: { formatter: (v: number) => mxn0(v) } },
        }),
        [points]
    );

    return <ApexChart type="line" series={series} options={options} height={height} />;
}

export const accumulatedSpend: WidgetDef = {
    id: "accumulated_spend",
    title: "Gasto acumulado",
    blurb: "Como se acumula tu gasto dentro del periodo.",
    group: "Gasto",
    sizes: ["md", "lg"],
    requires: ["transactions"],
    Body,
};
