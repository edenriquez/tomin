"use client";

import { useCallback, useEffect, useState } from "react";
import { isMetricError, queryMetrics } from "@/lib/metrics";
import { windowToPeriod } from "@/lib/window";
import { Skeleton } from "@/components/ui";
import { AppChrome } from "@/components/AppChrome";
import { MovimientosView } from "@/components/movimientos/MovimientosView";
import { Landing } from "@/components/Landing";
import { Onboarding } from "@/components/Onboarding";

/**
 * The switch at the root. Three states, one URL:
 * - no data, hasn't started → the marketing Landing (its one job: "Comenzar");
 * - no data, clicked Comenzar → the Onboarding (the dropzone + OCR review);
 * - has data → the app shell. The Comenzar click is remembered per session,
 *   so a reload mid-onboarding doesn't demote the user back to the pitch.
 *
 * Which state shows is a claim about the user's data, so it is only ever made
 * from a successful probe:
 * - the probe is year-wide, not window-wide, so the answer doesn't flip when
 *   a narrower window happens to be empty;
 * - a probe *error* falls through to the app, which says "backend
 *   unreachable" per view. Telling a user with three years of statements to
 *   upload their first one is the worse failure.
 */
const STARTED_KEY = "tomin.started";

export default function Home() {
    const [hasData, setHasData] = useState<boolean | null>(null);
    const [started, setStarted] = useState(false);

    useEffect(() => {
        // Session, not settings: "convinced" is a per-visit fact, and reading
        // it in an effect keeps server and client HTML identical.
        setStarted(sessionStorage.getItem(STARTED_KEY) === "1");
    }, []);

    function start() {
        sessionStorage.setItem(STARTED_KEY, "1");
        setStarted(true);
    }

    const probe = useCallback(async () => {
        try {
            const batch = await queryMetrics(windowToPeriod("1y"), [
                { key: "probe", metric: "spend_by_category" },
            ]);
            const entry = batch.results.probe;
            setHasData(
                !!entry &&
                    !isMetricError(entry) &&
                    ((entry.meta.source_txn_count ?? 0) > 0 || entry.rows.length > 0)
            );
        } catch {
            setHasData(true);
        }
    }, []);

    useEffect(() => {
        probe();
    }, [probe]);

    if (hasData === null) {
        // A beat of grey, deliberately not the onboarding hero: flashing
        // "upload your first statement" at someone with data is worse than
        // a skeleton, and worse than a spinner too.
        return (
            <main className="mx-auto min-h-dvh w-full max-w-page px-5 py-6 sm:px-8 sm:py-8">
                <Skeleton className="h-8 w-28" />
                <Skeleton className="mt-12 h-9 w-64" />
                <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
                    {[0, 1, 2].map((i) => (
                        <Skeleton key={i} className="h-28" />
                    ))}
                </div>
                <Skeleton className="mt-6 h-80" />
            </main>
        );
    }

    if (!hasData) {
        // `onComplete` fires after the review step (or its skip), not after
        // the raw upload — the user confirms what the OCR understood first.
        return started ? <Onboarding onComplete={probe} /> : <Landing onStart={start} />;
    }

    return (
        <AppChrome withWindow onDataChanged={probe}>
            <MovimientosView />
        </AppChrome>
    );
}
