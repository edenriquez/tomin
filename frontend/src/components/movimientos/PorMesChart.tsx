"use client";

import { useMemo } from "react";
import type { ApexOptions } from "apexcharts";
import { chart, colors } from "@/design/tokens";
import { compactMxn, monthLabel, mxn } from "@/lib/format";
import { ApexChart } from "@/components/charts/apex/ApexChart";
import { monthKeyToDate, monthName, spansYears, type MonthSlice } from "@/lib/porMes";

/**
 * One column per calendar month, the mean as a dashed rule across them.
 *
 * Hue is not the month channel: every column is the one stone grey, and
 * Signal marks only the month whose lid is off in the list below — the same
 * rule the composition bar follows. A click on a column opens that month.
 *
 * No value over the columns. The exact figure is one row down in the list;
 * a number standing on every bar competes with the shape the chart is drawn
 * for, and the shape is the reading here.
 */
export function PorMesChart({
    months,
    average,
    openKey,
    onPick,
    height = 280,
}: {
    months: MonthSlice[];
    average: number;
    openKey: string | null;
    onPick: (key: string) => void;
    height?: number;
}) {
    const withYear = spansYears(months.map((m) => m.key));
    const labels = useMemo(
        () => months.map((m) => monthLabel(monthKeyToDate(m.key), withYear)),
        [months, withYear]
    );

    const options: ApexOptions = useMemo(
        () => ({
            chart: {
                toolbar: { show: false },
                events: {
                    dataPointSelection: (_e, _ctx, cfg: { dataPointIndex: number }) => {
                        const picked = months[cfg.dataPointIndex];
                        if (picked && picked.count > 0) onPick(picked.key);
                    },
                },
            },
            colors: months.map((m) =>
                m.key === openKey ? colors.signal : chart.neutral[3]!
            ),
            plotOptions: {
                bar: { columnWidth: "58%", borderRadius: 2, distributed: true },
            },
            stroke: { width: 0 },
            dataLabels: { enabled: false },
            legend: { show: false },
            xaxis: {
                categories: labels,
                labels: { style: { colors: colors.graphite, fontSize: "12px" } },
                axisTicks: { show: false },
            },
            yaxis: {
                min: 0,
                forceNiceScale: true,
                labels: { formatter: (v: number) => compactMxn(v) },
            },
            grid: { xaxis: { lines: { show: false } }, yaxis: { lines: { show: true } } },
            states: {
                hover: { filter: { type: "lighten", value: 0.04 } },
                active: { filter: { type: "none", value: 0 } },
            },
            annotations:
                average > 0
                    ? {
                          yaxis: [
                              {
                                  y: average,
                                  strokeDashArray: 4,
                                  borderColor: colors.muted,
                                  label: {
                                      text: "promedio",
                                      position: "right",
                                      textAnchor: "end",
                                      offsetY: -4,
                                      borderWidth: 0,
                                      style: {
                                          background: "transparent",
                                          color: colors.ash,
                                          fontSize: "10px",
                                      },
                                  },
                              },
                          ],
                      }
                    : {},
            tooltip: {
                shared: false,
                intersect: true,
                custom: ({ dataPointIndex }) => {
                    const m = months[dataPointIndex];
                    if (!m) return "";
                    const name = monthName(m.key, withYear);
                    const body =
                        m.count === 0
                            ? `<div style="font-size:13px;color:${colors.graphite}">Sin cargos</div>`
                            : `<div style="font-size:13px;color:${colors.ink};font-variant-numeric:tabular-nums">${mxn(m.amount)}</div>
                               <div style="font-size:12px;color:${colors.graphite};font-variant-numeric:tabular-nums">${m.count} cargo${m.count === 1 ? "" : "s"}</div>`;
                    return `
                        <div style="padding:8px 10px">
                            <div style="font-size:12px;color:${colors.graphite}">${name}</div>
                            ${body}
                        </div>`;
                },
            },
        }),
        [months, labels, average, openKey, onPick, withYear]
    );

    const series = useMemo(
        () => [{ name: "Cargos", data: months.map((m) => Math.round(m.amount)) }],
        [months]
    );

    return (
        <ApexChart
            key={`${months[0]?.key ?? ""}·${months.length}`}
            type="bar"
            series={series}
            options={options}
            height={height}
        />
    );
}
