"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import type { ApexOptions } from "apexcharts";
import { ChartSkeleton } from "@/components/ui";
import { baseOptions } from "./theme";

/**
 * ApexCharts touches `window` at import time, so `ssr: false` is load-bearing,
 * not a nicety — a static import fails `next build` during prerender. One
 * wrapper means one shared chunk instead of one per chart.
 */
const ReactApexChart = dynamic(() => import("react-apexcharts"), {
    ssr: false,
    loading: () => <ChartSkeleton />,
});

type Plain = Record<string, unknown>;

function isPlainObject(v: unknown): v is Plain {
    return typeof v === "object" && v !== null && !Array.isArray(v);
}

/**
 * Apex options nest three levels deep (`chart.toolbar.show`,
 * `xaxis.labels.style.colors`). A shallow spread silently drops every theme
 * key under any branch the caller also sets, so `{ xaxis: { categories } }`
 * would wipe the axis styling. Arrays replace rather than merge — a caller
 * passing `colors: [...]` means those colours, not those plus ours.
 */
export function deepMerge<T extends Plain>(base: T, override: Plain): T {
    const out: Plain = { ...base };
    for (const [key, value] of Object.entries(override)) {
        if (value === undefined) continue;
        const current = out[key];
        out[key] = isPlainObject(current) && isPlainObject(value)
            ? deepMerge(current, value)
            : value;
    }
    return out as T;
}

export type ApexChartProps = {
    type: NonNullable<ApexOptions["chart"]>["type"];
    series: ApexOptions["series"];
    /** Deep-merged over `baseOptions`; you only declare the differences. */
    options?: ApexOptions;
    height?: number | string;
    width?: number | string;
    className?: string;
};

export function ApexChart({
    type,
    series,
    options,
    height = 320,
    width = "100%",
    className,
}: ApexChartProps) {
    const merged = useMemo(
        () =>
            deepMerge(baseOptions as Plain, {
                ...(options as Plain),
                chart: { ...((options?.chart ?? {}) as Plain), type },
            }) as ApexOptions,
        [options, type]
    );

    return (
        // min-w-0 matters: a grid item defaults to min-width:auto and the SVG
        // will not shrink below its first render width, overflowing the grid.
        <div className={className} style={{ minWidth: 0 }}>
            <ReactApexChart
                type={type}
                options={merged}
                series={series as never}
                height={height}
                width={width}
            />
        </div>
    );
}
