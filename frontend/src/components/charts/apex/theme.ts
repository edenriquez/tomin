import type { ApexOptions } from "apexcharts";
import { chart, colors } from "@/design/tokens";

/**
 * Every chart in the app deep-merges these. Anything set here is a rule, not
 * a default: toolbars, zoom, drop shadows, data labels and legends are all
 * off because a chart in this system is a reading, not a control panel.
 */
export const baseOptions: ApexOptions = {
    chart: {
        // The SVG inherits the page font only if we say so; next/font's class
        // is on <html>, and Apex writes inline font-family onto its own text.
        fontFamily: "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
        background: "transparent",
        foreColor: colors.pewter,
        toolbar: { show: false },
        zoom: { enabled: false },
        animations: { enabled: true, speed: 200 },
        dropShadow: { enabled: false },
        parentHeightOffset: 0,
        redrawOnParentResize: true,
    },
    grid: {
        borderColor: chart.grid,
        strokeDashArray: 0,
        // Horizontal rules only. Vertical gridlines on a time axis are noise:
        // the category labels already mark the columns.
        xaxis: { lines: { show: false } },
        yaxis: { lines: { show: true } },
        padding: { top: 0, right: 8, bottom: 0, left: 8 },
    },
    xaxis: {
        axisBorder: { show: false },
        axisTicks: { show: false },
        crosshairs: { stroke: { color: chart.grid, dashArray: 0, width: 1 } },
        tooltip: { enabled: false },
        labels: {
            style: { colors: chart.axisLabel, fontSize: "12px", fontWeight: 400 },
        },
    },
    yaxis: {
        axisBorder: { show: false },
        axisTicks: { show: false },
        labels: {
            style: { colors: chart.axisLabel, fontSize: "12px", fontWeight: 400 },
        },
    },
    stroke: {
        // Straight, not "smooth". A monotone spline invents values between
        // the points it was given, which in a finance chart is a lie.
        curve: "straight",
        width: 2,
        lineCap: "round",
    },
    dataLabels: { enabled: false },
    legend: { show: false },
    tooltip: {
        theme: "light",
        style: { fontSize: "13px" },
        marker: { show: true },
    },
    states: {
        hover: { filter: { type: "lighten", value: 0.04 } },
        active: { filter: { type: "none", value: 0 } },
    },
};

/**
 * Nominal categories: neutral ramp ordered by value, with Ember reserved for
 * the one series the chart is *about*. Position and order carry identity;
 * hue does not.
 */
export function categoricalColors(count: number, focusIndex = -1): string[] {
    return Array.from({ length: count }, (_, i) =>
        i === focusIndex ? colors.ember : chart.neutral[i % chart.neutral.length]
    );
}

/**
 * Quantitative encodings (treemap, heatmap): one colour, five steps, darkest
 * = largest. Ordered so index 0 is the strongest value.
 */
export function sequentialColors(count: number): string[] {
    const ramp = chart.emberTint;
    if (count <= 1) return [ramp[0]];
    return Array.from(
        { length: count },
        (_, i) => ramp[Math.min(ramp.length - 1, Math.round((i / (count - 1)) * (ramp.length - 1)))]
    );
}

/** Text on an Ember tint flips to Ink below the third step. */
export function onTint(step: number): string {
    return step >= 2 ? colors.ink : colors.paper;
}
