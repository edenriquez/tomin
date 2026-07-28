"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { LayoutGrid, Plus } from "lucide-react";
import { useProfile } from "@/lib/profile";
import { resolvePeriod, type PeriodId, DEFAULT_PERIOD } from "@/lib/period";
import type { MetricQuery, WidgetSize } from "@/lib/metrics";
import { Button, EmptyState, PageHeader } from "@/components/ui";
import { PeriodSelector } from "@/components/widgets/PeriodSelector";
import { WidgetBody } from "@/components/widgets/WidgetBody";
import { WidgetFrame } from "@/components/widgets/WidgetFrame";
import { useHomeLayoutContext } from "@/widgets/HomeLayoutProvider";
import { useMetricBatch } from "@/widgets/useMetricBatch";
import { getWidget } from "@/widgets/registry";
import { deriveState } from "@/widgets/types";

/**
 * The command center (docs/redesign-plan.md §4).
 *
 * 12 columns at >=1280px, 6 at >=768px, one below. The spans are written out
 * as literal class strings because Tailwind scans source text — a computed
 * `col-span-${n}` compiles to nothing.
 */
const SPAN: Record<WidgetSize, string> = {
    sm: "md:col-span-3 xl:col-span-4",
    md: "md:col-span-6 xl:col-span-6",
    lg: "md:col-span-6 xl:col-span-12",
};

export default function InicioPage() {
    const profile = useProfile();
    const [periodId, setPeriodId] = useState<PeriodId>(DEFAULT_PERIOD);
    const layout = useHomeLayoutContext();

    // Recomputed only when the preset changes: `new Date()` on every render
    // would make the period a new object and re-fire the batch forever.
    const period = useMemo(() => resolvePeriod(periodId), [periodId]);

    const queries: MetricQuery[] = useMemo(
        () =>
            layout.widgets.map((w) => ({
                key: w.key,
                metric: w.metricId,
                params: w.params,
            })),
        [layout.widgets]
    );

    const batch = useMetricBatch(period, queries);

    return (
        <div className="space-y-8">
            <PageHeader
                title="Inicio"
                subtitle={`Hola, ${profile.name}. Este es tu centro de mando.`}
                actions={
                    <>
                        <PeriodSelector value={periodId} onChange={setPeriodId} />
                        <Link href="/inicio/catalogo">
                            <Button variant="secondary" icon={<Plus size={16} />}>
                                Agregar
                            </Button>
                        </Link>
                    </>
                }
            />

            {layout.error && (
                <p className="rounded-control border-l-2 border-ember bg-fog p-3 text-body-sm text-graphite">
                    No pudimos cargar tu tablero. Revisa que el backend este corriendo en el
                    puerto 8000.
                </p>
            )}

            {layout.saveError && (
                <p className="rounded-control border-l-2 border-ember bg-fog p-3 text-body-sm text-graphite">
                    Los cambios no se guardaron. Se volveran a intentar en el proximo cambio.
                </p>
            )}

            {!layout.loading && !layout.widgets.length && !layout.error && (
                <EmptyState
                    icon={<LayoutGrid size={18} />}
                    title="Tu inicio esta vacio"
                    description="Elige que quieres ver del catalogo de metricas."
                    action={
                        <Link href="/inicio/catalogo">
                            <Button icon={<Plus size={16} />}>Agregar widget</Button>
                        </Link>
                    }
                />
            )}

            <div className="grid grid-cols-1 gap-6 md:grid-cols-6 xl:grid-cols-12">
                {layout.widgets.map((w, index) => {
                    const def = getWidget(w.metricId);
                    const title = w.titleOverride || def?.title || w.metricId;
                    const state = layout.loading
                        ? ({ kind: "loading" } as const)
                        : deriveState(batch.entryFor(w.key), def?.partialNote);

                    return (
                        <div key={w.key} className={`min-w-0 ${SPAN[w.size]}`}>
                            <WidgetFrame
                                title={title}
                                size={w.size}
                                state={state}
                                quality={def?.quality}
                                sizes={def?.sizes ?? [w.size]}
                                empty={def?.Empty ? <def.Empty /> : undefined}
                                detailHref={`/w/${w.metricId}`}
                                onResize={(size) => layout.resize(w.key, size)}
                                onRemove={() => layout.remove(w.key)}
                                onMoveUp={index > 0 ? () => layout.move(w.key, -1) : undefined}
                                onMoveDown={
                                    index < layout.widgets.length - 1
                                        ? () => layout.move(w.key, 1)
                                        : undefined
                                }
                                onRetry={batch.refresh}
                            >
                                {(state.kind === "ready" || state.kind === "insufficient") && (
                                    <WidgetBody
                                        metricId={w.metricId}
                                        result={state.result}
                                        size={w.size}
                                        params={w.params}
                                    />
                                )}
                            </WidgetFrame>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
