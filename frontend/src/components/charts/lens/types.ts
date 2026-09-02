/**
 * A "lectura" is the one thing a chart wants you to look at right now: a
 * signal (computed, never decorative), the mark it lives on, and one sentence
 * that says why. A chart shows at most one lectura in focus at a time — two
 * competing emphases are none.
 */
export type LensKind =
    | "unusual_amount"
    | "possible_duplicate"
    | "new_merchant"
    | "month_spike"
    | "recurring_increase"
    | "upcoming_charge"
    | "tight_month";

export type LensSeverity = "info" | "warn";

/** Where the mark is, in the chart's own data units. */
export type LensAnchor = {
    /** Datetime ms for a time axis, the category label for a category axis. */
    x: number | string;
    y: number;
    /** Apex series index (0-based). When known, that series stays at full
     *  opacity while the rest dim; unknown = dim everything but the ring. */
    seriesIndex?: number;
};

export type Lectura = {
    id: string;
    kind: LensKind;
    anchor: LensAnchor;
    /** One line, the claim: "OXXO · $1,240". */
    title: string;
    /** One line, the reason: "3.2× lo que sueles gastar ahí". */
    detail: string;
    severity?: LensSeverity;
    /** Optional row/entity id the callout's "Ver" action resolves to. */
    ref?: string;
};

/** A chip: a family of lecturas ("3 inusuales") the reader can cycle through. */
export type LensGroup = {
    id: string;
    label: string;
    lecturas: Lectura[];
};

export type LensFocus = { groupId: string; index: number } | null;

export const LENS_KIND_LABELS: Record<LensKind, string> = {
    unusual_amount: "Cargo inusual",
    possible_duplicate: "Posible duplicado",
    new_merchant: "Comercio nuevo",
    month_spike: "El mes que se salió",
    recurring_increase: "Subió",
    upcoming_charge: "Próximo cobro",
    tight_month: "Quincena apretada",
};
