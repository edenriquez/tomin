"use client";

import { useMemo } from "react";
import type { ApexOptions } from "apexcharts";
import { chart, colors } from "@/design/tokens";
import { compactMxn, monthLabel, mxn0 } from "@/lib/format";
import { num, parsePeriodKey } from "@/lib/metrics";
import { ApexChart } from "@/components/charts/apex/ApexChart";
import type { WidgetBodyProps, WidgetDef } from "../types";

/**
 * Cash pulled out of ATMs, per month, with the running total.
 *
 * The metric is `quality: "estimate"` server-side — withdrawals are detected
 * from the description text, so a bank that words its lines unusually will be
 * under-counted. The frame renders the "Estimado" tag from the catalog; this
 * body does not repeat the caveat, it just draws honest columns.
 */
function Body({ result, height }: WidgetBodyProps) {
    const points = useMemo(() => {
        let running = 0;
        return result.rows.map((row) => {
            // Unlike `accumulated_spend`, this metric is not declared
            // cumulative: the column arrives per period and the running total
            // is arithmetic done here.
            const withdrawn = num(row.withdrawal_amount);
            running += withdrawn;
            const date = parsePeriodKey(row.month ?? row.day);
            return {
                label: date ? monthLabel(date, true) : String(row.month ?? row.day ?? ""),
                withdrawn: Math.round(withdrawn),
                cumulative: Math.round(running),
            };
        });
    }, [result.rows]);

    const series = useMemo(
        () => [
            { name: "Retirado en el mes", type: "column", data: points.map((p) => p.withdrawn) },
            { name: "Acumulado", type: "line", data: points.map((p) => p.cumulative) },
        ],
        [points]
    );

    const options: ApexOptions = useMemo(
        () => ({
            // Neutral columns, Ember line: the question is "how much cash am I
            // burning over time?", so the cumulative line is what the chart is
            // about and gets the single accent.
            colors: [chart.neutral[3], colors.ember],
            xaxis: { categories: points.map((p) => p.label) },
            stroke: { width: [0, 2], curve: "straight" },
            plotOptions: { bar: { columnWidth: "52%", borderRadius: 2 } },
            yaxis: [
                {
                    seriesName: "Retirado en el mes",
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

export const cashWithdrawn: WidgetDef = {
    id: "cash_withdrawn",
    title: "Efectivo retirado",
    blurb: "Cuanto efectivo sacas del cajero y como se acumula.",
    group: "Gasto",
    sizes: ["md", "lg"],
    requires: ["transactions"],
    // Declared here as well as in the catalog so the badge is right even when
    // the catalog has not been fetched — the detail page renders from the
    // registry alone.
    quality: "estimate",
    Body,
};
