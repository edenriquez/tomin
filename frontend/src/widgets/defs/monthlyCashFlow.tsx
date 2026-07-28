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
        let running = 0;
        return result.rows.map((row) => {
            const income = num(row.income_amount);
            const expense = num(row.expense_amount);
            // The API returns the two sides; the net — and the running net,
            // which is the line that actually answers "am I gaining or
            // losing?" — is arithmetic, so it is done here rather than made
            // into a third measure the backend has to carry.
            running += income - expense;
            const date = parsePeriodKey(row.month);
            return {
                label: date ? monthLabel(date, true) : String(row.month ?? ""),
                income: Math.round(income),
                expense: Math.round(expense),
                net: Math.round(running),
            };
        });
    }, [result.rows]);

    const series = useMemo(
        () => [
            { name: "Ingresos", type: "column", data: points.map((p) => p.income) },
            { name: "Gastos", type: "column", data: points.map((p) => p.expense) },
            { name: "Neto acumulado", type: "line", data: points.map((p) => p.net) },
        ],
        [points]
    );

    const options: ApexOptions = useMemo(
        () => ({
            // Abyss vs Graphite, separated by texture rather than hue: the
            // pattern survives greyscale and colour-blindness, a second hue
            // would not and would cost the brand its single accent.
            colors: [colors.abyss, chart.neutral[3], colors.ember],
            xaxis: { categories: points.map((p) => p.label) },
            fill: {
                type: ["solid", "pattern", "solid"],
                opacity: [1, 1, 1],
                pattern: { style: "slantedLines", width: 6, height: 6, strokeWidth: 2 },
            },
            stroke: { width: [0, 0, 2], curve: "straight" },
            plotOptions: { bar: { columnWidth: "56%", borderRadius: 2 } },
            yaxis: [
                { seriesName: "Ingresos", labels: { formatter: (v: number) => compactMxn(v) } },
                { seriesName: "Ingresos", show: false },
                {
                    seriesName: "Neto acumulado",
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

export const monthlyCashFlow: WidgetDef = {
    id: "monthly_cash_flow",
    title: "Entradas vs salidas",
    blurb: "Cuanto entra, cuanto sale y si el neto va subiendo.",
    group: "Ingreso",
    sizes: ["md", "lg"],
    requires: ["transactions"],
    Body,
};
