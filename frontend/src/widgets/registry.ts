/**
 * The registry: metric id -> presentation.
 *
 * The catalog (`GET /api/metrics`) is the source of truth for what a metric
 * *is*. This maps each id to how it is *drawn*. A metric the backend ships
 * before the frontend has a definition for it still appears in the picker and
 * still renders — see `resolveWidget` — it just gets a generic body, which is
 * a much better failure than a blank card or a crash.
 */

import type { MetricSpec, WidgetSize } from "@/lib/metrics";
import { accumulatedSpend } from "./defs/accumulatedSpend";
import { cashWithdrawn } from "./defs/cashWithdrawn";
import { investmentProjection } from "./defs/investmentProjection";
import { lifetimeFlow } from "./defs/lifetimeFlow";
import { monthlyCashFlow } from "./defs/monthlyCashFlow";
import { spendByCategory } from "./defs/spendByCategory";
import { tagTotals } from "./defs/tagTotals";
import { GenericSeriesBody } from "./defs/generic";
import type { WidgetDef, WidgetGroup } from "./types";

export const WIDGETS: WidgetDef[] = [
    spendByCategory,
    monthlyCashFlow,
    accumulatedSpend,
    cashWithdrawn,
    lifetimeFlow,
    tagTotals,
    investmentProjection,
];

const BY_ID: Record<string, WidgetDef> = Object.fromEntries(WIDGETS.map((w) => [w.id, w]));

export function getWidget(metricId: string): WidgetDef | undefined {
    return BY_ID[metricId];
}

const KNOWN_GROUPS: WidgetGroup[] = ["Gasto", "Ingreso", "Patrimonio", "Fiscal", "Riesgo"];

function asGroup(value: string): WidgetGroup {
    return (KNOWN_GROUPS as string[]).includes(value) ? (value as WidgetGroup) : "Gasto";
}

/**
 * A definition for every catalog entry, registered or not. The fallback borrows
 * the spec's own Spanish title and description, so an unregistered metric reads
 * as a plain widget rather than as a bug.
 */
export function resolveWidget(spec: MetricSpec): WidgetDef {
    const registered = BY_ID[spec.id];
    // The catalog wins on `quality`. It is the backend's own judgement about
    // its own number: when a metric stops being a heuristic the badge has to
    // disappear on the server's say-so, not on the next frontend release. The
    // registered value stays as the fallback for when the catalog is out of
    // reach (the detail page renders from `getWidget` alone).
    if (registered) {
        return spec.quality === undefined
            ? registered
            : { ...registered, quality: spec.quality ?? undefined };
    }
    return {
        id: spec.id,
        title: spec.title,
        blurb: spec.description,
        group: asGroup(spec.group),
        sizes: ["md", "lg"] as WidgetSize[],
        requires: spec.requires,
        // "beta" by default: a metric with no presentation here is one the
        // frontend has never looked at, and saying so is more honest than a
        // bare card.
        quality: spec.quality ?? "beta",
        Body: GenericSeriesBody,
    };
}

/** Falls back to the widget's own title when the catalog is unreachable. */
export function widgetTitle(metricId: string, override?: string | null): string {
    return override || BY_ID[metricId]?.title || metricId;
}
