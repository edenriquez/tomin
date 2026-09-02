/**
 * Interaction telemetry — what gets touched, where, how often.
 *
 * This exists to answer one question we could not answer from a chair: how do
 * people actually work through Movimientos? Hunt outliers on the chart, scroll
 * the list, search by name, drag a range? The badge that guessed ("12 por
 * revisar") was removed for guessing; this records instead, and the ordering
 * gets decided from the rows later.
 *
 * Deliberately small and dumb. `track(name, props)` queues; a flush every few
 * seconds (or on leaving the page) posts the batch to the user's own backend.
 * Nothing goes to a third party, nothing is sampled, and a failed flush drops
 * the batch rather than retrying forever — attention data is not worth a retry
 * storm. Names are dotted, view first: `movimientos.row_select`.
 */

import { API_URL, request } from "./api";

export type EventProps = Record<string, string | number | boolean | null | undefined>;

type Queued = { name: string; path: string; occurred_at: string; props: EventProps };

const FLUSH_MS = 5000;
const MAX_QUEUE = 200;

let queue: Queued[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
let bound = false;

export function track(name: string, props: EventProps = {}): void {
    if (typeof window === "undefined") return;
    queue.push({
        name,
        path: window.location.pathname,
        occurred_at: new Date().toISOString(),
        props: compact(props),
    });
    if (queue.length > MAX_QUEUE) queue = queue.slice(-MAX_QUEUE);
    bind();
    if (!timer) timer = setTimeout(flush, FLUSH_MS);
}

/** Post whatever is queued. `beacon` when the page is going away: a normal
 *  fetch would be cancelled with the document. */
export function flush(beacon = false): void {
    if (timer) {
        clearTimeout(timer);
        timer = null;
    }
    if (queue.length === 0) return;
    const body = JSON.stringify({ events: queue });
    queue = [];
    const url = `${API_URL}/api/telemetry/events`;
    if (beacon && typeof navigator.sendBeacon === "function") {
        navigator.sendBeacon(url, new Blob([body], { type: "application/json" }));
        return;
    }
    fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
    }).catch(() => undefined);
}

function bind(): void {
    if (bound) return;
    bound = true;
    window.addEventListener("pagehide", () => flush(true));
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") flush(true);
    });
}

function compact(props: EventProps): EventProps {
    const out: EventProps = {};
    for (const [k, v] of Object.entries(props)) if (v !== undefined) out[k] = v;
    return out;
}

/* -------------------------------------------------------------------------- */
/* Reading it back                                                             */
/* -------------------------------------------------------------------------- */

export type UiEvent = {
    name: string;
    path: string;
    props: Record<string, string | number | boolean | null>;
    /** UTC ISO with a Z; convert to local for anything hour-shaped. */
    occurred_at: string;
};

export const telemetryApi = {
    /** Raw events over the last `days`, newest first, capped server-side. */
    recent: (days: number) =>
        request<{ days: number; items: UiEvent[]; total: number }>(
            `/api/telemetry/events?days=${days}`
        ),
};
