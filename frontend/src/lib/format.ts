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


const MONTH_SHORT = new Intl.DateTimeFormat("es-MX", { month: "short" });
const MONTH_YEAR_SHORT = new Intl.DateTimeFormat("es-MX", { month: "short", year: "2-digit" });
const DAY_MONTH_SHORT = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short" });
const WEEKDAY_FULL = new Intl.DateTimeFormat("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
});

/** Whole pesos. The default for tooltips and any single headline number. */
export function mxn(value: number): string {
    return MXN0.format(value);
}


/** Two decimals. Statement lines and anything the user will reconcile by hand. */
export function mxn2(value: number): string {
    return MXN2.format(value);
}

/** "$1.2 M". Y-axis labels only — never a figure the user is asked to trust exactly. */
export function compactMxn(value: number): string {
    return MXN_COMPACT.format(value);
}


/**
 * What a date formatter renders when it is handed something that isn't a date.
 *
 * `Intl.DateTimeFormat.format(new Date(NaN))` throws `RangeError: Invalid time
 * value`, and these run inside Apex axis and tooltip callbacks — a throw there
 * unmounts the chart and takes the view down with it. An Invalid Date reaching
 * a formatter is a bug upstream, but the honest rendering of "no date" is a
 * dash, not a blank screen.
 */
const NO_DATE = "—";

function isValidDate(date: Date): boolean {
    return date instanceof Date && Number.isFinite(date.getTime());
}

/** Short es-MX month, capitalised: "ene", "feb". */
export function monthLabel(date: Date, withYear = false): string {
    if (!isValidDate(date)) return NO_DATE;
    const raw = (withYear ? MONTH_YEAR_SHORT : MONTH_SHORT).format(date).replace(".", "");
    return raw.charAt(0).toUpperCase() + raw.slice(1);
}

/** "14 ene" — x-axis labels for day-grain series. */
export function dayLabel(date: Date): string {
    if (!isValidDate(date)) return NO_DATE;
    return DAY_MONTH_SHORT.format(date).replace(".", "");
}

/** "miércoles, 5 de agosto de 2026" — for tooltips, where there is room for
 *  the whole date and the weekday is part of what the reader came to check. */
export function fullDayLabel(date: Date): string {
    if (!isValidDate(date)) return NO_DATE;
    const raw = WEEKDAY_FULL.format(date);
    return raw.charAt(0).toUpperCase() + raw.slice(1);
}

