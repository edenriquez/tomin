"use client";

import { Suspense } from "react";
import { AppChrome } from "@/components/AppChrome";
import { PlanView } from "@/components/plan/PlanView";
import { Skeleton } from "@/components/ui";

/**
 * Plan — one question, "¿me alcanza?", in two faces: what leaves (the fijos you
 * pin, plus the rest of recurrences) and what comes in (the deposits you label
 * as nómina or extra, against those fijos). Whole history on purpose: a
 * subscription or a quincena doesn't care which window the dashboard is
 * reading, and a filtered detector would lose a series the moment the window
 * narrows past its cadence.
 *
 * The face is in the URL (`?cara=ingresos`) so the old `/pronostico` redirect
 * lands on the right half; `useSearchParams` needs the boundary said out loud.
 */
export default function PlanPage() {
    return (
        <AppChrome>
            <Suspense
                fallback={
                    <div className="space-y-4 sm:space-y-6">
                        <Skeleton className="h-9 w-64" />
                        <Skeleton className="h-36" />
                        <Skeleton className="h-72" />
                    </div>
                }
            >
                <PlanView />
            </Suspense>
        </AppChrome>
    );
}
