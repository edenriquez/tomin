/**
 * The widget contract (docs/redesign-plan.md §4).
 *
 * The *metric* metadata — title, group, unit, params, requirements — is data
 * that comes from `GET /api/metrics`. The registry here adds only what the
 * backend has no business knowing: which chart draws it, which sizes it looks
 * right at, and how to say what it is in Spanish. Adding a metric is one file
 * in `defs/` plus one line in `registry.ts`; nothing else knows metric names.
 */

import type { ComponentType } from "react";
import type {
    MetricEntry,
    MetricParams,
    MetricResult,
    Requirement,
    WidgetSize,
} from "@/lib/metrics";

export type { WidgetSize };

export type WidgetGroup = "Gasto" | "Ingreso" | "Patrimonio" | "Fiscal" | "Riesgo";

/** Content height in px, excluding the frame's header and footer. */
export const SIZE_HEIGHT: Record<WidgetSize, number> = { sm: 300, md: 300, lg: 400 };

export const SIZE_LABEL: Record<WidgetSize, string> = {
    sm: "Chico",
    md: "Mediano",
    lg: "Grande",
};

export type WidgetBodyProps = {
    result: MetricResult;
    size: WidgetSize;
    /** The exact pixel height the skeleton already occupied. Charts are sized
     *  from this so nothing reflows when the data lands. */
    height: number;
    params: MetricParams;
};

export type WidgetDef = {
    /** Equal to the metric id. One widget per metric today; if that ever stops
     *  being true this becomes the presentation id and gains a `metric` field. */
    id: string;
    title: string;
    /** One line, in the picker. What question it answers, not how. */
    blurb: string;
    group: WidgetGroup;
    sizes: WidgetSize[];
    requires: Requirement[];
    /** Renders, but with a header tag: the number is a heuristic. */
    quality?: "estimate" | "beta";
    /** Params the metric declares as required and the user has not typed yet. */
    defaultParams?: MetricParams;
    Body: ComponentType<WidgetBodyProps>;
};

/* -------------------------------------------------------------------------- */
/* Frame state                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * The six states the frame switches on. `empty` and `error` are separate on
 * purpose: "you have no movements yet" and "we could not reach the server" are
 * different sentences, and collapsing them into `$0` — which is what the old
 * dashboard did — states a fact about someone's finances that nobody checked.
 */
export type WidgetState =
    | { kind: "loading" }
    | { kind: "empty" }
    | { kind: "error"; message: string }
    | { kind: "insufficient"; result: MetricResult; note: string }
    | { kind: "ready"; result: MetricResult };

/** Spanish for what `meta.partial` is warning about. */
const PARTIAL_NOTE =
    "El periodo solo esta cubierto en parte por tus documentos. Sube los estados de cuenta faltantes.";

/**
 * Turns a batch entry into a frame state.
 *
 * `undefined` is loading, not empty: a key the batch has not answered for yet
 * is a request in flight, and rendering "aun no hay movimientos" over it would
 * flash a false claim on every period change.
 */
export function deriveState(entry: MetricEntry | undefined): WidgetState {
    if (!entry) return { kind: "loading" };
    if ("error" in entry) return { kind: "error", message: entry.error.message };

    const { rows, value, meta } = entry;
    // No rows and no headline number: there is nothing to draw and nothing to
    // claim. `source_txn_count === 0` says the query ran and found none.
    if (rows.length === 0 && value === null) return { kind: "empty" };
    if (meta.source_txn_count === 0 && rows.length === 0) return { kind: "empty" };

    if (meta.partial) return { kind: "insufficient", result: entry, note: PARTIAL_NOTE };
    return { kind: "ready", result: entry };
}
