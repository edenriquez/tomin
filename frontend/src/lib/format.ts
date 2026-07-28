/**
 * Display formatters.
 *
 * `Intl.NumberFormat` construction is not cheap and these run inside chart
 * tooltip/axis callbacks, which fire per tick and per hover. Every formatter
 * is therefore built once at module scope, never inside a render.
 */

const MXN0 = new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
});

const MXN2 = new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

const MXN_COMPACT = new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    notation: "compact",
    compactDisplay: "short",
    maximumFractionDigits: 1,
});

const PCT = new Intl.NumberFormat("es-MX", {
    style: "percent",
    maximumFractionDigits: 1,
});

const MONTH_SHORT = new Intl.DateTimeFormat("es-MX", { month: "short" });
const MONTH_YEAR_SHORT = new Intl.DateTimeFormat("es-MX", { month: "short", year: "2-digit" });

/** Whole pesos. The default for tooltips and any single headline number. */
export function mxn(value: number): string {
    return MXN0.format(value);
}

/** Alias of `mxn`, named for symmetry with `mxn2` at call sites that need both. */
export const mxn0 = mxn;

/** Two decimals. Statement lines and anything the user will reconcile by hand. */
export function mxn2(value: number): string {
    return MXN2.format(value);
}

/** "$1.2 M". Y-axis labels only — never a figure the user is asked to trust exactly. */
export function compactMxn(value: number): string {
    return MXN_COMPACT.format(value);
}

/** Takes a ratio (0.105), not a percentage (10.5). */
export function pct(ratio: number): string {
    return PCT.format(ratio);
}

/** Short es-MX month, capitalised: "ene", "feb". */
export function monthLabel(date: Date, withYear = false): string {
    const raw = (withYear ? MONTH_YEAR_SHORT : MONTH_SHORT).format(date).replace(".", "");
    return raw.charAt(0).toUpperCase() + raw.slice(1);
}

/**
 * Label for a month expressed as an offset from `from` (default: today).
 * Charts get real month names instead of "M0".."M11".
 */
export function monthLabelFromOffset(offset: number, from: Date = new Date()): string {
    const d = new Date(from.getFullYear(), from.getMonth() + offset, 1);
    // Show the year once the run crosses into a different calendar year.
    return monthLabel(d, d.getFullYear() !== from.getFullYear());
}
