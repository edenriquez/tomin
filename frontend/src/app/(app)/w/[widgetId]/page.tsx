"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Button, Card, PageHeader, Tag } from "@/components/ui";
import { mxn0 } from "@/lib/format";
import { num, type MetricParams, type MetricQuery } from "@/lib/metrics";
import { DEFAULT_PERIOD, resolvePeriod, type PeriodId } from "@/lib/period";
import { PeriodSelector } from "@/components/widgets/PeriodSelector";
import { ProjectionParams } from "@/components/widgets/ProjectionParams";
import { WidgetBody } from "@/components/widgets/WidgetBody";
import { WidgetFrame } from "@/components/widgets/WidgetFrame";
import { getWidget } from "@/widgets/registry";
import { useMetricBatch } from "@/widgets/useMetricBatch";
import { deriveState } from "@/widgets/types";

/** The detail view is one chart at full width; the frame's `lg` is 400px. */
const DETAIL_HEIGHT = 440;

/**
 * `/w/[widgetId]` — the expanded view of one widget (docs/redesign-plan.md §4).
 *
 * This is where `/spending` and `/forecasts` went. Deep-linkable, with its own
 * period and, for a computed metric, its own params: the dashboard card is a
 * glance, this is the place you actually change something.
 */
export default function WidgetDetailPage({ params }: { params: { widgetId: string } }) {
    const metricId = params.widgetId;
    const def = getWidget(metricId);

    const [periodId, setPeriodId] = useState<PeriodId>(DEFAULT_PERIOD);
    const [metricParams, setMetricParams] = useState<MetricParams>(
        () => ({ ...(def?.defaultParams ?? {}) })
    );

    const period = useMemo(() => resolvePeriod(periodId), [periodId]);
    const queries: MetricQuery[] = useMemo(
        () => [{ key: "detail", metric: metricId, params: metricParams }],
        [metricId, metricParams]
    );
    const batch = useMetricBatch(period, queries);

    const state = deriveState(batch.entryFor("detail"));
    const editable = metricId === "investment_projection";

    return (
        <div className="space-y-8">
            <PageHeader
                title={def?.title ?? metricId}
                subtitle={def?.blurb}
                actions={
                    <>
                        <PeriodSelector value={periodId} onChange={setPeriodId} />
                        <Link href="/inicio">
                            <Button variant="secondary" icon={<ArrowLeft size={16} />}>
                                Inicio
                            </Button>
                        </Link>
                    </>
                }
            />

            {def?.quality && (
                <Tag tone="estimate">
                    {def.quality === "estimate"
                        ? "Estimado: los valores son un modelo, no una lectura de tus cuentas."
                        : "Beta"}
                </Tag>
            )}

            <WidgetFrame
                title={def?.title ?? metricId}
                size="lg"
                state={state}
                quality={def?.quality}
                onRetry={batch.refresh}
            >
                {(state.kind === "ready" || state.kind === "insufficient") && (
                    <WidgetBody
                        metricId={metricId}
                        result={state.result}
                        size="lg"
                        params={metricParams}
                        height={DETAIL_HEIGHT}
                    />
                )}
            </WidgetFrame>

            {editable && (
                <Card title="Supuestos">
                    <ProjectionParams value={metricParams} onChange={setMetricParams} />
                </Card>
            )}

            {state.kind === "ready" && state.result.value !== null && (
                <Card title="Total del periodo">
                    <p className="tabular text-metric font-semibold text-ink">
                        {mxn0(num(state.result.value))}
                    </p>
                    <p className="mt-1 text-body-sm text-pewter">
                        {state.result.meta.source_txn_count === null
                            ? "Calculado a partir de los supuestos de arriba."
                            : `Sobre ${state.result.meta.source_txn_count} movimientos.`}
                    </p>
                </Card>
            )}
        </div>
    );
}
