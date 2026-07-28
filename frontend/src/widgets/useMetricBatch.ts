"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { queryMetrics, type MetricEntry, type MetricQuery, type Period } from "@/lib/metrics";

/**
 * One HTTP request per render cycle for every visible widget.
 *
 * The endpoint is batched and keyed by widget instance, so the grid asks once
 * and hands each card its own entry. A per-widget fetch would be N round trips
 * on every period change, and N chances for the ordering to interleave.
 */
export function useMetricBatch(period: Period, queries: MetricQuery[]) {
    const [results, setResults] = useState<Record<string, MetricEntry>>({});
    const [loading, setLoading] = useState(false);
    /** Set only when the *request* failed. A per-key error lives in `results`. */
    const [error, setError] = useState<string | null>(null);

    // Effects key off the shape of the request, not the array identity: the
    // caller rebuilds `queries` every render and a raw dependency would loop.
    const signature = useMemo(
        () => JSON.stringify({ period, queries }),
        [period, queries]
    );
    const latest = useRef(0);

    const run = useCallback(async () => {
        const { period: p, queries: q } = JSON.parse(signature) as {
            period: Period;
            queries: MetricQuery[];
        };
        if (!q.length) {
            setResults({});
            setError(null);
            setLoading(false);
            return;
        }
        const ticket = ++latest.current;
        setLoading(true);
        try {
            const batch = await queryMetrics(p, q);
            // A slow request for a period the user already left must not
            // overwrite the answer for the one they are looking at.
            if (ticket !== latest.current) return;
            setResults(batch.results);
            setError(null);
        } catch (e) {
            if (ticket !== latest.current) return;
            setResults({});
            setError((e as Error).message);
        } finally {
            if (ticket === latest.current) setLoading(false);
        }
    }, [signature]);

    useEffect(() => {
        run();
    }, [run]);

    /**
     * What a widget should render. `undefined` means "still in flight"; a
     * whole-request failure is reported as a per-key error so one dead backend
     * shows N frames that survived, not a blank page.
     */
    const entryFor = useCallback(
        (key: string): MetricEntry | undefined => {
            if (error) return { error: { code: "request_failed", message: error } };
            return results[key];
        },
        [results, error]
    );

    return { results, loading, error, entryFor, refresh: run };
}
