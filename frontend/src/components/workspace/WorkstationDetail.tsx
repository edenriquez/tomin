"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { BackendNotice, Button } from "@/components/ui";
import { useAppData } from "@/components/AppChrome";
import { useMetricBatch } from "@/lib/useMetricBatch";
import { isMetricError, type MetricQuery } from "@/lib/metrics";
import { windowToPeriod } from "@/lib/window";
import { describeRule, readProfile, type Workstation } from "@/lib/workstations";
import { CohortChart, toMonthPoints } from "./CohortChart";
import { CohortStats } from "./CohortStats";
import { RuleEditorSheet } from "./RuleEditorSheet";
import { ScenarioControls, monthlyCost, type Scenario } from "./ScenarioControls";
import { useWorkspace } from "./WorkspaceProvider";

const PROFILE_KEY = "profile";
const ACTIVITY_KEY = "activity";

/**
 * One saved lens, read.
 *
 * Reading order top to bottom is the priority order: what the set *is* (one
 * line, collapsed — every number below is only as trustworthy as the set), then
 * the four figures and the chart, which is what the user came for, then the
 * scenario, which is what they do once they have read.
 */
export function WorkstationDetail({ workstation }: { workstation: Workstation }) {
    const { windowId } = useAppData();
    const { update, remove } = useWorkspace();
    const router = useRouter();

    const [editing, setEditing] = useState(false);
    const [scenario, setScenario] = useState<Scenario | null>(null);

    const period = useMemo(() => windowToPeriod(windowId), [windowId]);

    // Both reads go out in one batched request, keyed per panel. Two fetches
    // would be two chances for the tiles and the chart to describe different
    // moments of the same set.
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

    const profile = profileEntry && !isMetricError(profileEntry)
        ? readProfile(profileEntry.rows)
        : null;
    const points = activityEntry && !isMetricError(activityEntry)
        ? toMonthPoints(activityEntry.rows)
        : [];

    return (
        <div className="min-w-0">
            <Link
                href="/workspace"
                className="mb-4 inline-flex items-center gap-1.5 text-body-sm text-graphite hover:text-ink lg:hidden"
            >
                <ArrowLeft size={14} aria-hidden />
                Análisis
            </Link>

            <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                <div className="min-w-0">
                    <h1 className="truncate font-display text-title-md font-normal text-ink">
                        {workstation.name}
                    </h1>
                    {/* The rule, collapsed to one line. Visible because every
                        figure below depends on it; collapsed because nobody
                        comes here to admire their filter. */}
                    <p className="mt-0.5 truncate text-body-sm text-graphite">
                        {describeRule(workstation)}
                    </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                    <Button variant="ghost" icon={<Pencil size={15} />} onClick={() => setEditing(true)}>
                        Editar
                    </Button>
                    <Button
                        variant="ghost"
                        icon={<Trash2 size={15} />}
                        aria-label="Borrar análisis"
                        onClick={async () => {
                            if (await remove(workstation.id)) router.replace("/workspace");
                        }}
                    />
                </div>
            </header>

            {failed && (
                <div className="mt-5">
                    <BackendNotice
                        what="los números de este análisis"
                        detail={profileEntry.error.message}
                    />
                </div>
            )}

            {!failed && (
                <>
                    <div className="mt-5">
                        <CohortStats profile={profile} loading={loading} />
                    </div>

                    {/* Never a $0 chart: an empty set gets a sentence and a way
                        out, not axes drawn around nothing. */}
                    {!loading && profile?.count === 0 && (
                        <p className="mt-5 text-body text-graphite">
                            Ningún movimiento cumple esta regla en este periodo.{" "}
                            <button
                                type="button"
                                onClick={() => setEditing(true)}
                                className="text-ink underline underline-offset-4"
                            >
                                Editar la regla
                            </button>
                        </p>
                    )}

                    {points.length > 0 && (
                        <div className="mt-6">
                            <CohortChart
                                points={points}
                                scenarioMonthly={scenario ? monthlyCost(scenario) : null}
                            />
                        </div>
                    )}

                    {profile && profile.count > 0 && (
                        <div className="mt-6">
                            <ScenarioControls
                                profile={profile}
                                scenario={scenario}
                                onChange={setScenario}
                            />
                        </div>
                    )}
                </>
            )}

            <RuleEditorSheet
                open={editing}
                onClose={() => setEditing(false)}
                existing={workstation}
                onSave={(draft) => update(workstation.id, draft)}
            />
        </div>
    );
}

