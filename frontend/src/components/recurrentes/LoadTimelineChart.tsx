"use client";

import { useMemo } from "react";
import type { ApexOptions } from "apexcharts";
import { colors } from "@/design/tokens";
import { compactMxn, monthLabel, mxn } from "@/lib/format";
import { ApexChart } from "@/components/charts/apex/ApexChart";
import { monthKeyToDate, type Timeline } from "./projection";

/**
 * The selected series month by month: measured months on the left, projected
 * months on the right, one stack per month split by series.
 *
 * The boundary is drawn, not implied. A projection rendered like a
 * measurement is the most expensive lie a finance UI can tell, so the future
 * sits on a Fog band labelled "Proyección", opened by a dashed rule at today's
 * month — the rule survives the horizontal scroll on a phone, where the label
 * can end up off-screen.
 *
 * Colour is the charge: one series is one colour here, on the calendar and on
 * its chip, drawn from the category taxonomy (`buildSeriesColors`).
 *
 * Only confirmed charges are drawn. A series detection merely suspects is not
 * money anyone has committed to, and a column that mixes the two makes its own
 * total unusable.
 *
 * The month's sum lives in the tooltip, not over the column: a number standing
 * on every bar competes with the shape the chart is drawn for. The columns do
 * move into place, though — the app's charts animate a change rather than
 * repaint it.
 */
/**
 * Past this many series the tween itself is the jank — Apex animates every
 * rect in every column — so a crowded chart cuts instead of moving.
 */
const ANIMATED_SERIES = 24;
/** Staggering the grow-in only reads as intent while the stack is small. */
const GRADUAL_SERIES = 10;

export function LoadTimelineChart({
    timeline,
    colorFor,
    height = 300,
}: {
    timeline: Timeline;
    /** Series label -> colour, shared with the calendar and the chips so one
     *  series is one colour everywhere on the page. */
    colorFor: (label: string) => string;
    height?: number;
}) {
    const labels = useMemo(
        () => timeline.months.map((m) => monthLabel(monthKeyToDate(m), true)),
        [timeline.months]
    );

    const options: ApexOptions = useMemo(() => {
        const firstFuture = labels[timeline.firstFutureIndex];
        const lastLabel = labels[labels.length - 1];
        const count = timeline.series.length;

        return {
            chart: {
                stacked: true,
                toolbar: { show: false },
                animations:
                    count <= ANIMATED_SERIES
                        ? {
                              enabled: true,
                              speed: 320,
                              easing: "easeinout",
                              animateGradually: {
                                  enabled: count <= GRADUAL_SERIES,
                                  delay: 40,
                              },
                              dynamicAnimation: { enabled: true, speed: 320 },
                          }
                        : { enabled: false },
            },
            colors: timeline.series.map((s) => colorFor(s.item.label)),
            plotOptions: { bar: { columnWidth: "62%", borderRadius: 2 } },
            stroke: { width: 0 },
            dataLabels: { enabled: false },
            // Eighteen columns on a phone: thinner gaps and a smaller month
            // label are what keep the axis readable at that width.
            responsive: [
                {
                    breakpoint: 640,
                    options: {
                        plotOptions: { bar: { columnWidth: "72%" } },
                        xaxis: { labels: { style: { fontSize: "10px" } } },
                    },
                },
            ],
            xaxis: {
                categories: labels,
                labels: { style: { colors: colors.graphite, fontSize: "12px" } },
                axisTicks: { show: false },
            },
            yaxis: { labels: { formatter: (v: number) => compactMxn(v) } },
            grid: { xaxis: { lines: { show: false } }, yaxis: { lines: { show: true } } },
            legend: { show: false },
            annotations:
                firstFuture && timeline.firstFutureIndex < labels.length
                    ? {
                          xaxis: [
                              {
                                  x: firstFuture,
                                  x2: lastLabel,
                                  fillColor: colors.fog,
                                  // The band sits *over* the columns (Apex
                                  // draws annotations last), so it has to be
                                  // thin enough to leave each charge its
                                  // colour — the future is marked, not muted
                                  // into one grey block.
                                  opacity: 0.35,
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
                shared: false,
                intersect: true,
                cssClass: "load-timeline-tooltip",
                custom: ({ series, seriesIndex, dataPointIndex }) => {
                    const label = timeline.series[seriesIndex]?.item.label ?? "";
                    const value = series[seriesIndex]?.[dataPointIndex] ?? 0;
                    const total = (series as number[][]).reduce(
                        (sum, layer) => sum + (layer[dataPointIndex] ?? 0),
                        0
                    );
                    const swatch = colorFor(label);
                    const future = dataPointIndex > timeline.firstFutureIndex;
                    return `
                        <div style="padding:8px 10px">
                            <div style="font-size:12px;color:${colors.graphite}">${escapeHtml(labels[dataPointIndex] ?? "")}${future ? " · proyectado" : ""}</div>
                            <div style="font-size:13px;color:${colors.ink};display:flex;align-items:center;gap:6px">
                                <span style="width:8px;height:8px;border-radius:9999px;background:${swatch};display:inline-block"></span>
                                <span>${escapeHtml(label)}</span>
                                <span style="font-variant-numeric:tabular-nums">${mxn(value)}</span>
                            </div>
                            <div style="margin-top:2px;font-size:12px;color:${colors.graphite}">Total del mes ${mxn(total)}</div>
                        </div>`;
                },
            },
        };
    }, [labels, timeline, colorFor]);

    // Referentially stable, and that is what makes the chart move: a fresh
    // array on every parent render makes `ApexChart`'s memo miss, which lands
    // in react-apexcharts as an update — and an update repaints the columns
    // where a mount would have grown them.
    const series = useMemo(
        () =>
            timeline.series.map((s) => ({
                name: s.item.label,
                data: s.values.map((v) => Math.round(v)),
            })),
        [timeline.series]
    );

    if (!timeline.series.length) {
        return (
            <p className="py-10 text-center text-body text-graphite">
                Elige lo que sí o sí se cobra para dibujarlo.
            </p>
        );
    }

    return (
        <ApexChart
            key={`${timeline.series.map((s) => s.item.label).join("|")}·${timeline.months[0]}·${timeline.months.length}`}
            type="bar"
            series={series}
            options={options}
            height={height}
        />
    );
}

/** Series labels are bank/user text landing in tooltip HTML. */
function escapeHtml(s: string): string {
    return s
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;");
}
