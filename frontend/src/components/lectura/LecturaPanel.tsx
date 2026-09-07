"use client";

import { useMemo } from "react";
import { X } from "lucide-react";
import { BackendNotice } from "@/components/ui";
import { useAppData } from "@/components/AppChrome";
import { useCategories } from "@/lib/categories";
import { useMetricBatch } from "@/lib/useMetricBatch";
import { isMetricError, type MetricQuery } from "@/lib/metrics";
import { describeRule, readProfile, type Workstation } from "@/lib/workstations";
import { CohortChart, toMonthPoints } from "@/components/workspace/CohortChart";
import { CohortStats } from "@/components/workspace/CohortStats";
import { LecturaChat } from "./LecturaChat";

const PROFILE_KEY = "profile";
const ACTIVITY_KEY = "activity";

/**
 * The shared reading: the set's figures and chart, and a chat column whose
 * threads are named after the exchange. Same numbers the model is allowed to
 * see — both sides read this workstation's filters.
 */
export function LecturaPanel({
    workstation,
    onClose,
}: {
    workstation: Workstation;
    onClose: () => void;
}) {
    const { period } = useAppData();
    const categories = useCategories();

    const queries = useMemo<MetricQuery[]>(
        () => [
            {
                key: PROFILE_KEY,
                metric: "cohort_profile",
                filters: workstation.filters,
            },
            {
                key: ACTIVITY_KEY,
                metric: "cohort_activity",
                grain: "month",
                filters: workstation.filters,
            },
        ],
        [workstation.filters]
    );

    const { entryFor, loading } = useMetricBatch(period, queries);
    const profileEntry = entryFor(PROFILE_KEY);
    const activityEntry = entryFor(ACTIVITY_KEY);
    const failed = profileEntry && isMetricError(profileEntry);
    const profile =
        profileEntry && !isMetricError(profileEntry) ? readProfile(profileEntry.rows) : null;
    const points =
        activityEntry && !isMetricError(activityEntry)
            ? toMonthPoints(activityEntry.rows)
            : [];

    return (
        <section className="min-w-0">
            <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                <div className="min-w-0">
                    <h2 className="truncate text-title-sm font-normal text-ink">
                        {workstation.name}
                    </h2>
                    <p className="mt-0.5 truncate text-body-sm text-graphite">
                        {describeRule(workstation, categories)}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Cerrar lectura"
                    className="rounded-control p-1.5 text-graphite hover:bg-fog hover:text-ink"
                >
                    <X size={15} aria-hidden />
                </button>
            </header>

            {failed && (
                <div className="mt-5">
                    <BackendNotice
                        what="los números de este conjunto"
                        detail={profileEntry.error.message}
                    />
                </div>
            )}

            {!failed && (
                <div className="mt-5 flex flex-col gap-8 lg:flex-row">
                    <div className="min-w-0 flex-1">
                        <CohortStats profile={profile} loading={loading} />
                        {!loading && profile?.count === 0 && (
                            <p className="mt-5 text-body text-graphite">
                                Ningún movimiento cumple esta regla en este periodo.
                            </p>
                        )}
                        {points.length > 0 && (
                            <div className="mt-6">
                                <CohortChart points={points} scenarioMonthly={null} />
                            </div>
                        )}
                    </div>
                    <div className="min-w-0 lg:w-72 lg:shrink-0 lg:border-l lg:border-mist lg:pl-8">
                        <LecturaChat workstationId={workstation.id} period={period} />
                    </div>
                </div>
            )}
        </section>
    );
}
