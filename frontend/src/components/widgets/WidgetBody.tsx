"use client";

import type { MetricParams, MetricResult, WidgetSize } from "@/lib/metrics";
import { getWidget } from "@/widgets/registry";
import { GenericSeriesBody } from "@/widgets/defs/generic";
import { SIZE_HEIGHT } from "@/widgets/types";

/**
 * Picks the body for a metric id. A metric the backend ships before the
 * registry has a definition for it falls through to the envelope-driven body
 * rather than rendering nothing — the grid degrades, it does not break.
 */
export function WidgetBody({
    metricId,
    result,
    size,
    params,
    height,
}: {
    metricId: string;
    result: MetricResult;
    size: WidgetSize;
    params: MetricParams;
    height?: number;
}) {
    const Body = getWidget(metricId)?.Body ?? GenericSeriesBody;
    return (
        <Body result={result} size={size} params={params} height={height ?? SIZE_HEIGHT[size]} />
    );
}
