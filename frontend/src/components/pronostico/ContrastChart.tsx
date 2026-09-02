"use client";

import { useMemo } from "react";
import type { ApexOptions } from "apexcharts";
import { colors, chart } from "@/design/tokens";
import { compactMxn, monthLabel, mxn } from "@/lib/format";
import { ApexChart } from "@/components/charts/apex/ApexChart";
import { monthKeyToDate } from "@/components/recurrentes/projection";

export const CONTRAST_COLORS = {
    nomina: colors.signal,
    extra: chart.signalTint[2]!,
    fijos: chart.neutral[1]!,
} as const;

export type ContrastSeries = {
    months: string[];
    firstFutureIndex: number;
    nomina: number[];
    extra: number[];
    fijos: number[];
};

/**
 * Grouped bars on one month axis: ingresos (nómina + extra stacked) against
 * the fijos total. No resto line — this chart is the contrast, not a load.
 */
export function ContrastChart({
    data,
    height = 300,
}: {
    data: ContrastSeries;
    height?: number;
}) {
    const labels = useMemo(
        () => data.months.map((m) => monthLabel(monthKeyToDate(m), true)),
        [data.months]
    );

    const empty =
        data.nomina.every((v) => v === 0) &&
        data.extra.every((v) => v === 0) &&
        data.fijos.every((v) => v === 0);

    const options: ApexOptions = useMemo(() => {
        const firstFuture = labels[data.firstFutureIndex];
        const lastLabel = labels[labels.length - 1];

        return {
            chart: {
                stacked: true,
                toolbar: { show: false },
                animations: { enabled: false },
            },
            colors: [CONTRAST_COLORS.nomina, CONTRAST_COLORS.extra, CONTRAST_COLORS.fijos],
            plotOptions: { bar: { columnWidth: "58%", borderRadius: 2 } },
            stroke: { width: 0 },
            dataLabels: { enabled: false },
            xaxis: {
                categories: labels,
                labels: { style: { colors: colors.graphite, fontSize: "12px" } },
                axisTicks: { show: false },
            },
            yaxis: { labels: { formatter: (v: number) => compactMxn(v) } },
            grid: { xaxis: { lines: { show: false } }, yaxis: { lines: { show: true } } },
            legend: { show: false },
            annotations:
                firstFuture && data.firstFutureIndex < labels.length
                    ? {
                          xaxis: [
                              {
                                  x: firstFuture,
                                  x2: lastLabel,
                                  fillColor: colors.fog,
                                  opacity: 0.75,
                                  label: {
                                      text: "Proyección",
                                      position: "top",
                                      orientation: "horizontal",
                                      offsetY: -4,
                                      style: {
                                          background: "transparent",
                                          color: colors.ash,
                                          fontSize: "10px",
                                      },
                                      borderWidth: 0,
                                  },
                              },
                              {
                                  x: firstFuture,
                                  strokeDashArray: 4,
                                  borderColor: colors.muted,
                              },
                          ],
                      }
                    : {},
            tooltip: {
                shared: true,
                intersect: false,
                custom: ({ dataPointIndex }) => {
                    const i = dataPointIndex;
                    const nomina = data.nomina[i] ?? 0;
                    const extra = data.extra[i] ?? 0;
                    const fijos = data.fijos[i] ?? 0;
                    const ingresos = nomina + extra;
                    return `
                        <div style="padding:8px 10px">
                            <div style="font-size:12px;color:${colors.graphite}">${escapeHtml(labels[i] ?? "")}</div>
                            ${row("Nómina", nomina, CONTRAST_COLORS.nomina)}
                            ${row("Extra", extra, CONTRAST_COLORS.extra)}
                            <div style="margin-top:2px;font-size:12px;color:${colors.graphite}">Ingresos ${mxn(ingresos)}</div>
                            ${row("Fijos", fijos, CONTRAST_COLORS.fijos)}
                        </div>`;
                },
            },
        };
    }, [labels, data]);

    if (empty) {
        return (
            <p className="py-10 text-center text-body text-graphite">
                Etiqueta un ingreso o fija un cargo para contrastarlos.
            </p>
        );
    }

    const series = [
        { name: "Nómina", group: "Ingresos", data: data.nomina.map(round) },
        { name: "Extra", group: "Ingresos", data: data.extra.map(round) },
        { name: "Fijos", group: "Fijos", data: data.fijos.map(round) },
    ];

    return (
        <div>
            <ApexChart
                key={`${data.months[0]}·${data.months.length}·${data.firstFutureIndex}`}
                type="bar"
                series={series}
                options={options}
                height={height}
            />
            <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-label text-graphite">
                <LegendSwatch color={CONTRAST_COLORS.nomina} label="Nómina" />
                <LegendSwatch color={CONTRAST_COLORS.extra} label="Extra" />
                <LegendSwatch color={CONTRAST_COLORS.fijos} label="Fijos" />
            </ul>
        </div>
    );
}

function row(label: string, value: number, swatch: string): string {
    return `
        <div style="font-size:13px;color:${colors.ink};display:flex;align-items:center;gap:6px">
            <span style="width:8px;height:8px;border-radius:9999px;background:${swatch};display:inline-block"></span>
            <span>${label}</span>
            <span style="font-variant-numeric:tabular-nums">${mxn(value)}</span>
        </div>`;
}

function LegendSwatch({ color, label }: { color: string; label: string }) {
    return (
        <li className="flex items-center gap-1.5">
            <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: color }} />
            {label}
        </li>
    );
}

function round(v: number): number {
    return Math.round(v);
}

function escapeHtml(s: string): string {
    return s
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;");
}
