/**
 * Filter state for /movimientos, and the one place it is turned into a query
 * string.
 *
 * The table and the CSV export both read from here, which is the whole point:
 * an export that quietly ignores the filters on screen hands the user a file
 * that disagrees with what they were looking at.
 *
 * The state also round-trips through the URL, so a filtered view is a link and
 * the back button works. `searchParams` is the source of truth — there is no
 * second copy in React state to drift out of sync with it.
 */

import { PERIODS, resolvePeriod, type PeriodId } from "./period";

export const PAGE_SIZE = 25;

export type TxFilters = {
    /** Free text, matched against the description by the API. */
    q: string;
    /** Inclusive ISO bounds. Empty string means "unbounded on this side". */
    start: string;
    end: string;
    /** 1-based. */
    page: number;
};

export const EMPTY_FILTERS: TxFilters = { q: "", start: "", end: "", page: 1 };

export function hasActiveFilters(f: TxFilters): boolean {
    return f.q !== "" || f.start !== "" || f.end !== "";
}

/* -------------------------------------------------------------------------- */
/* Range presets                                                              */
/* -------------------------------------------------------------------------- */

/** The four command-center periods plus "Todo", which clears both bounds. */
export type RangeId = PeriodId | "all";

export const RANGES: { id: RangeId; label: string }[] = [
    ...PERIODS,
    { id: "all", label: "Todo" },
];

export function resolveRange(id: RangeId): { start: string; end: string } {
    if (id === "all") return { start: "", end: "" };
    return resolvePeriod(id);
}

/**
 * Which preset, if any, the current bounds correspond to. Returns null for a
 * hand-typed range — no chip should look selected when the dates aren't its
 * dates.
 */
export function matchRange(start: string, end: string): RangeId | null {
    if (!start && !end) return "all";
    for (const { id } of RANGES) {
        if (id === "all") continue;
        const r = resolveRange(id);
        if (r.start === start && r.end === end) return id;
    }
    return null;
}

/* -------------------------------------------------------------------------- */
/* URL <-> filters                                                            */
/* -------------------------------------------------------------------------- */

export function filtersFromParams(params: URLSearchParams): TxFilters {
    const page = Number.parseInt(params.get("page") ?? "", 10);
    return {
        q: params.get("q") ?? "",
        start: params.get("start") ?? "",
        end: params.get("end") ?? "",
        page: Number.isFinite(page) && page > 0 ? page : 1,
    };
}

/** Only non-default values are written, so a clean view has a clean URL. */
export function filtersToParams(f: TxFilters): URLSearchParams {
    const params = new URLSearchParams();
    if (f.q) params.set("q", f.q);
    if (f.start) params.set("start", f.start);
    if (f.end) params.set("end", f.end);
    if (f.page > 1) params.set("page", String(f.page));
    return params;
}

/* -------------------------------------------------------------------------- */
/* Filters -> API query                                                       */
/* -------------------------------------------------------------------------- */

/**
 * The API's parameter names differ from the URL's (`search` vs `q`, and an
 * offset instead of a page number), which is fine: the address bar is a user
 * interface and the query string is a wire format.
 *
 * `paginate: false` is for the CSV export, which should return the whole
 * filtered set rather than the 25 rows that happen to be on screen.
 */
export function filtersToQuery(f: TxFilters, { paginate = true } = {}): string {
    const params = new URLSearchParams();
    if (f.q) params.set("search", f.q);
    if (f.start) params.set("start", f.start);
    if (f.end) params.set("end", f.end);
    if (paginate) {
        params.set("limit", String(PAGE_SIZE));
        params.set("offset", String((f.page - 1) * PAGE_SIZE));
    }
    const qs = params.toString();
    return qs ? `?${qs}` : "";
}
