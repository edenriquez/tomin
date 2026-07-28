"use client";

import { useCallback, useEffect, useState } from "react";
import { isMetricError, queryMetrics, type Requirement } from "@/lib/metrics";
import { resolvePeriod } from "@/lib/period";
import { listTags } from "@/lib/tags";

/**
 * What the account can currently answer.
 *
 * Two capabilities are derivable today — whether any transaction exists, and
 * whether any tag does. The rest of the vocabulary (`cfdi`, `balance`) is
 * behind backend work that hasn't landed. The hook is shaped for the full set
 * anyway so adding one is a field here and a line in `REQUIREMENT_COPY`, not a
 * new mechanism at every call site.
 */
export type Capabilities = { transactions: boolean; tags: boolean } & Partial<
    Record<string, boolean>
>;

const NONE: Capabilities = { transactions: false, tags: false };

export type RequirementCopy = { label: string; action: string; href: string };

/** Every requirement the picker knows how to explain, in Spanish. */
export const REQUIREMENT_COPY: Record<string, RequirementCopy> = {
    transactions: {
        label: "Necesita movimientos",
        action: "Sube un documento",
        href: "/documentos",
    },
    cfdi: { label: "Necesita facturas del SAT", action: "Conecta el SAT", href: "/ajustes" },
    tags: { label: "Necesita etiquetas", action: "Etiqueta movimientos", href: "/movimientos" },
    balance: { label: "Necesita un saldo", action: "Agrega una cuenta", href: "/ajustes" },
};

export function requirementCopy(requirement: Requirement): RequirementCopy {
    return (
        REQUIREMENT_COPY[requirement] ?? {
            label: `Necesita ${requirement}`,
            action: "Configura tu cuenta",
            href: "/ajustes",
        }
    );
}

/** The first requirement the account does not meet, or `null`. */
export function firstUnmet(
    requires: Requirement[],
    capabilities: Capabilities
): Requirement | null {
    return requires.find((r) => !capabilities[r]) ?? null;
}

export function useCapabilities() {
    const [capabilities, setCapabilities] = useState<Capabilities>(NONE);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        setLoading(true);
        try {
            // Both probes in flight at once, and neither is allowed to sink the
            // other: an unreachable /api/tags must not make the picker claim the
            // account has no movements either.
            const [batch, tags] = await Promise.all([
                // A year-wide probe, not the selected period: whether the
                // account has any data at all must not flip when the user
                // narrows to a month they happen not to have uploaded.
                queryMetrics(resolvePeriod("year"), [
                    { key: "__capability_transactions", metric: "spend_by_category" },
                ]),
                listTags().catch(() => null),
            ]);
            const entry = batch.results.__capability_transactions;
            const has =
                !!entry &&
                !isMetricError(entry) &&
                ((entry.meta.source_txn_count ?? 0) > 0 || entry.rows.length > 0);
            setCapabilities({ transactions: has, tags: (tags?.length ?? 0) > 0 });
            setError(null);
        } catch (e) {
            // Unreachable backend is not "the user has no data": leave every
            // capability false but say why, so the picker can distinguish.
            setCapabilities(NONE);
            setError((e as Error).message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refresh();
    }, [refresh]);

    return { capabilities, loading, error, refresh };
}
