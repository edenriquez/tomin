"use client";

import { useMemo } from "react";
import type { ApexOptions } from "apexcharts";
import { colors } from "@/design/tokens";
import { compactMxn, mxn0 } from "@/lib/format";
import { num } from "@/lib/metrics";
import { ApexChart } from "@/components/charts/apex/ApexChart";
import { DistributionChart } from "@/components/charts/DistributionChart";
import type { WidgetBodyProps } from "../types";

/**
 * The body for a catalog metric the registry has no definition for.
 *
 * It reads the envelope rather than the metric: the first non-numeric column is
 * the axis, the first numeric one is the value. Deliberately plain — a metric
 * shipped by the backend this week should be visible, not pretty, and the day
 * it gets a real definition this stops being used.
 */
export function GenericSeriesBody({ result, height }: WidgetBodyProps) {
    const { labels, values } = useMemo(() => {
        const first = result.rows[0] ?? {};
        const keys = Object.keys(first);
        const valueKey =
            keys.find((k) => k !== "value" && !Number.isNaN(Number(first[k])) && first[k] !== null) ??
            "value";
        const labelKey = keys.find((k) => k !== valueKey) ?? keys[0];
        return {
            labels: result.rows.map((r, i) => String(r[labelKey] ?? i + 1)),
            values: result.rows.map((r) => Math.round(num(r[valueKey]))),
        };
    }, [result.rows]);

    const options: ApexOptions = useMemo(
        () => ({
            colors: [colors.ember],
            xaxis: { categories: labels },
            yaxis: { labels: { formatter: (v: number) => compactMxn(v) } },
            tooltip: { y: { formatter: (v: number) => mxn0(v) } },
        }),
        [labels]
    );

    if (result.shape === "breakdown") {
        return (
            <DistributionChart
                data={labels.map((label, i) => ({ label, amount: values[i] }))}
                height={height}
            />
        );
    }

    if (result.shape === "scalar" || result.rows.length === 0) {
        return (
            <div className="flex h-full items-center">
                <span className="tabular text-metric font-semibold text-ink">
                    {result.value === null ? "—" : mxn0(num(result.value))}
                </span>
            </div>
        );
    }

    return (
        <ApexChart
            type="line"
            series={[{ name: result.metric, data: values }]}
            options={options}
            height={height}
        />
    );
}
