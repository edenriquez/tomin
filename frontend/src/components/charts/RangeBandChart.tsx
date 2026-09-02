"use client";

import { useMemo } from "react";
import type { ApexOptions } from "apexcharts";
import { colors } from "@/design/tokens";
import { cn } from "@/lib/cn";
import { compactMxn, monthLabel, mxn } from "@/lib/format";
import { ApexChart } from "@/components/charts/apex/ApexChart";
import { monthKeyToDate } from "@/components/recurrentes/projection";
import {
    CHART_ENCODING_LABELS,
    CHART_ENCODINGS,
    type BandSeries,
    type ChartEncoding,
} from "./rangeBand";

export { CHART_ENCODING_LABELS, CHART_ENCODINGS };
export type { BandSeries, ChartEncoding };

/**
 * Line + shaded range, the levels.fyi reading: the line is the month, the
 * band is the middle of what that month has been. Straight segments — a
 * spline would invent pesos between real months.
 */
export function RangeBandChart({
    months,
    firstFutureIndex,
    series,
    caption,
    empty,
    height = 320,
}: {
    months: string[];
    firstFutureIndex: number;
    series: BandSeries[];
    caption?: string;
    empty?: string;
    height?: number;
}) {
    const labels = useMemo(
        () => months.map((m) => monthLabel(monthKeyToDate(m), true)),
        [months]
    );

    const vacant = series.every((s) => s.mid.every((v) => v === 0));

    const { apexSeries, options } = useMemo(() => {
        const rangeSeries = series.map((s) => ({
            name: `${s.name} · rango`,
            type: "rangeArea" as const,
            data: labels.map((x, i) => ({
                x,
                y: [Math.round(s.low[i] ?? 0), Math.round(s.high[i] ?? 0)],
            })),
        }));
        const lineSeries = series.map((s) => ({
            name: s.name,
            type: "line" as const,
            data: labels.map((x, i) => ({
                x,
                y: Math.round(s.mid[i] ?? 0),
            })),
        }));

        const n = series.length;
        const firstFuture = labels[firstFutureIndex];
        const lastLabel = labels[labels.length - 1];

        const options: ApexOptions = {
            chart: {
                type: "rangeArea",
                toolbar: { show: false },
                animations: { enabled: false },
            },
            colors: [...series.map((s) => s.bandColor), ...series.map((s) => s.color)],
            stroke: {
                curve: "straight",
                width: [...Array(n).fill(0), ...Array(n).fill(2)],
            },
            fill: {
                type: "solid",
                opacity: [...Array(n).fill(0.22), ...Array(n).fill(1)],
            },
            markers: {
                size: [...Array(n).fill(0), ...Array(n).fill(4)],
                strokeWidth: 0,
                hover: { size: 6 },
            },
            dataLabels: { enabled: false },
            xaxis: {
                type: "category",
                labels: { style: { colors: colors.graphite, fontSize: "12px" } },
                axisTicks: { show: false },
            },
            yaxis: { labels: { formatter: (v: number) => compactMxn(v) } },
            grid: { xaxis: { lines: { show: false } }, yaxis: { lines: { show: true } } },
            legend: { show: false },
            annotations:
                firstFuture && firstFutureIndex < labels.length
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
                    const rows = series
                        .map((s) => {
                            const mid = s.mid[i] ?? 0;
                            const lo = s.low[i] ?? mid;
                            const hi = s.high[i] ?? mid;
                            const spread = hi - lo > 1;
                            return `
                                ${row(s.name, mid, s.color)}
                                ${
                                    spread
                                        ? `<div style="margin-left:14px;font-size:12px;color:${colors.graphite};font-variant-numeric:tabular-nums">${mxn(lo)} – ${mxn(hi)}</div>`
                                        : ""
                                }`;
                        })
                        .join("");
                    return `
                        <div style="padding:8px 10px">
                            <div style="font-size:12px;color:${colors.graphite}">${escapeHtml(labels[i] ?? "")}</div>
                            ${rows}
                        </div>`;
                },
            },
        };

        return { apexSeries: [...rangeSeries, ...lineSeries], options };
    }, [labels, series, firstFutureIndex]);

    if (vacant) {
        return (
            <p className="py-10 text-center text-body text-graphite">
                {empty ?? "Aún no hay cifras que dibujar."}
            </p>
        );
    }

    return (
        <div>
            <ApexChart
                key={`${months[0]}·${months.length}·${series.map((s) => s.name).join("|")}`}
                type="rangeArea"
                series={apexSeries}
                options={options}
                height={height}
            />
            <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-label text-graphite">
                {series.map((s) => (
                    <li key={s.name} className="flex items-center gap-1.5">
                        <span
                            aria-hidden
                            className="h-2 w-2 rounded-full"
                            style={{ background: s.color }}
                        />
                        {s.name}
                    </li>
                ))}
            </ul>
            {caption && <p className="mt-2 text-body-sm text-graphite">{caption}</p>}
        </div>
    );
}

/** Always-visible encoding switch — a reading choice, not an editor control. */
export function ChartEncodingToggle({
    value,
    onChange,
}: {
    value: ChartEncoding;
    onChange: (value: ChartEncoding) => void;
}) {
    return (
        <div
            role="radiogroup"
            aria-label="Lectura de la gráfica"
            className="inline-flex rounded-control border border-mist bg-paper p-0.5"
        >
            {CHART_ENCODINGS.map((enc) => {
                const selected = value === enc;
                return (
                    <button
                        key={enc}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => onChange(enc)}
                        className={cn(
                            "rounded-control px-3 py-1 text-body-sm",
                            "transition-colors duration-100",
                            selected
                                ? "bg-fog font-medium text-ink"
                                : "text-graphite hover:text-ink"
                        )}
                    >
                        {CHART_ENCODING_LABELS[enc]}
                    </button>
                );
            })}
        </div>
    );
}

function row(label: string, value: number, swatch: string): string {
    return `
        <div style="font-size:13px;color:${colors.ink};display:flex;align-items:center;gap:6px">
            <span style="width:8px;height:8px;border-radius:9999px;background:${swatch};display:inline-block"></span>
            <span>${escapeHtml(label)}</span>
            <span style="font-variant-numeric:tabular-nums">${mxn(value)}</span>
        </div>`;
}

function escapeHtml(s: string): string {
    return s
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;");
}
