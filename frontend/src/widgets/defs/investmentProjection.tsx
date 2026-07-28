"use client";

import { useMemo } from "react";
import type { ApexOptions } from "apexcharts";
import { chart, colors } from "@/design/tokens";
import { compactMxn, monthLabelFromOffset, mxn0 } from "@/lib/format";
import { num } from "@/lib/metrics";
import { ApexChart } from "@/components/charts/apex/ApexChart";
import type { WidgetBodyProps, WidgetDef } from "../types";

/** The catalog declares `starting_balance` and `annual_rate` as required, so a
 *  widget with no params saved would 400 at query time. These are the values a
 *  new widget is created with; the detail page edits them. */
export const PROJECTION_DEFAULTS = {
    starting_balance: 10000,
    annual_rate: 0.1,
    monthly_contribution: 0,
    months: 12,
};

function Body({ result, height, params }: WidgetBodyProps) {
    const points = useMemo(() => {
        const start = num(params.starting_balance ?? PROJECTION_DEFAULTS.starting_balance);
        const monthly = num(
            params.monthly_contribution ?? PROJECTION_DEFAULTS.monthly_contribution
        );
        return result.rows.map((row, i) => {
            const offset = typeof row.month_offset === "number" ? row.month_offset : i;
            return {
                label: monthLabelFromOffset(offset),
                // What the money would be worth.
                value: Math.round(num(row.value)),
                // What was put in. The gap between the two lines is the return,
                // which is the only reason to look at this chart.
                contributed: Math.round(start + monthly * offset),
            };
        });
    }, [result.rows, params]);

    const series = useMemo(
        () => [
            { name: "Saldo proyectado", type: "area", data: points.map((p) => p.value) },
            { name: "Aportado", type: "line", data: points.map((p) => p.contributed) },
        ],
        [points]
    );

    const options: ApexOptions = useMemo(
        () => ({
            colors: [colors.ember, chart.neutral[3]],
            xaxis: { categories: points.map((p) => p.label) },
            yaxis: { labels: { formatter: (v: number) => compactMxn(v) } },
            fill: {
                type: ["gradient", "solid"],
                gradient: { shadeIntensity: 0, opacityFrom: 0.18, opacityTo: 0, stops: [0, 100] },
                colors: [colors.ember, "transparent"],
            },
            // Both series dashed: none of this has happened. Dash carries "not
            // real yet" so colour doesn't have to.
            stroke: { width: [2, 1], curve: "straight", dashArray: [6, 3] },
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

    return <ApexChart type="area" series={series} options={options} height={height} />;
}

export const investmentProjection: WidgetDef = {
    id: "investment_projection",
    title: "Proyeccion de inversion",
    blurb: "A donde llega un saldo con aportaciones y una tasa anual.",
    group: "Patrimonio",
    sizes: ["md", "lg"],
    // Nothing: every input is typed by the user, so this is the one widget a
    // brand-new account can already use.
    requires: [],
    // The numbers are a model, not a reading of your accounts.
    quality: "estimate",
    defaultParams: PROJECTION_DEFAULTS,
    Body,
};
