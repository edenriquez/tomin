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
 */
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

        return {
            chart: {
                stacked: true,
                toolbar: { show: false },
                animations: { enabled: false },
            },
            colors: timeline.series.map((s) => colorFor(s.item.label)),
            plotOptions: { bar: { columnWidth: "62%", borderRadius: 2 } },
            // Siblings in a category differ only in lightness; the hairline
            // keeps two of them from reading as a single charge.
            stroke: { width: 1, colors: [colors.paper] },
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
                firstFuture && timeline.firstFutureIndex < labels.length
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
                                  // The rule itself: where measured stops.
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
                y: { formatter: (v: number) => mxn(v) },
            },
        };
    }, [labels, timeline, colorFor]);

    if (!timeline.series.length) {
        return (
            <p className="py-10 text-center text-body text-graphite">
                Selecciona al menos una serie para dibujarla.
            </p>
        );
    }

    return (
        // Keyed by the series identity AND the month span: react-apexcharts
        // MUTATES the mounted chart on update and does not reliably re-apply
        // a changed `colors` array when the series set changes — nor the axis
        // categories when only the series values change (a zoomed month range
        // would keep the old month labels). A different selection is a
        // different chart; remount it (animations are off, so the swap is
        // invisible).
        <ApexChart
            key={`${timeline.series.map((s) => s.item.label).join("|")}·${timeline.months[0]}·${timeline.months.length}`}
            type="bar"
            series={timeline.series.map((s) => ({
                name: s.item.label,
                data: s.values.map((v) => Math.round(v)),
            }))}
            options={options}
            height={height}
        />
    );
}
