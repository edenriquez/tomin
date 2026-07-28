"use client";

import { useMemo } from "react";
import type { ApexOptions } from "apexcharts";
import { ForecastPoint } from "@/lib/api";
import { chart, colors } from "@/design/tokens";
import { compactMxn, monthLabelFromOffset, mxn0 } from "@/lib/format";
import { ApexChart } from "./apex/ApexChart";

/**
 * Mixed area + line. Baseline is a Fog-filled area (the ground you're already
 * standing on); the optimised scenario is an Ember line, dashed because it is
 * a projection. Dash carries "not real yet" so colour doesn't have to.
 */
export function ProjectionChart({ points }: { points: ForecastPoint[] }) {
    const categories = useMemo(
        // Real month names. "M0".."M11" makes the reader do arithmetic to find
        // out which month they're looking at.
        () => points.map((p) => monthLabelFromOffset(p.month_offset)),
        [points]
    );

    const series = useMemo(
        () => [
            {
                name: "Base",
                type: "area",
                data: points.map((p) => Math.round(p.baseline)),
            },
            {
                name: "Optimizado",
                type: "line",
                data: points.map((p) => Math.round(p.optimized)),
            },
        ],
        [points]
    );

    const options: ApexOptions = useMemo(
        () => ({
            colors: [chart.neutral[3], colors.ember],
            xaxis: { categories },
            yaxis: { labels: { formatter: (v: number) => compactMxn(v) } },
            fill: {
                type: ["solid", "solid"],
                opacity: [1, 1],
                colors: [colors.fog, "transparent"],
            },
            stroke: {
                width: [1, 2],
                curve: "straight",
                dashArray: [0, 5],
            },
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
            tooltip: {
                shared: true,
                intersect: false,
                y: { formatter: (v: number) => mxn0(v) },
            },
        }),
        [categories]
    );

    return <ApexChart type="line" series={series} options={options} height={320} />;
}
