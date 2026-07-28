"use client";

import { Slider } from "@/components/ui";
import { mxn0, pct } from "@/lib/format";
import { num, type MetricParams } from "@/lib/metrics";
import { PROJECTION_DEFAULTS } from "@/widgets/defs/investmentProjection";

/**
 * The params editor for `investment_projection`.
 *
 * Sliders rather than number inputs: these are assumptions, not figures. The
 * ranges are the catalog's own bounds narrowed to values a person would
 * actually type — a 1000% annual rate is legal to the API and meaningless here.
 */
export function ProjectionParams({
    value,
    onChange,
}: {
    value: MetricParams;
    onChange: (next: MetricParams) => void;
}) {
    const get = (key: keyof typeof PROJECTION_DEFAULTS) =>
        num(value[key] ?? PROJECTION_DEFAULTS[key]);
    const set = (key: string, v: number) => onChange({ ...value, [key]: v });

    return (
        <div className="grid gap-6 md:grid-cols-2">
            <Slider
                label="Saldo inicial"
                min={0}
                max={1000000}
                step={5000}
                value={get("starting_balance")}
                format={mxn0}
                onChange={(v) => set("starting_balance", v)}
            />
            <Slider
                label="Aportacion mensual"
                min={0}
                max={100000}
                step={500}
                value={get("monthly_contribution")}
                format={mxn0}
                onChange={(v) => set("monthly_contribution", v)}
            />
            <Slider
                label="Tasa anual"
                min={-0.2}
                max={0.5}
                step={0.005}
                value={get("annual_rate")}
                // A ratio, not a percentage: the API takes 0.10 for 10%.
                format={(v) => pct(v)}
                onChange={(v) => set("annual_rate", Number(v.toFixed(3)))}
            />
            <Slider
                label="Meses"
                min={1}
                max={360}
                step={1}
                value={get("months")}
                format={(v) => `${v} meses`}
                onChange={(v) => set("months", v)}
            />
        </div>
    );
}
