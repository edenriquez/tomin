"use client";

import { useCallback, useEffect, useState } from "react";
import { isMetricError, queryMetrics, type Requirement } from "@/lib/metrics";
import { resolvePeriod } from "@/lib/period";

/**
 * What the account can currently answer.
 *
 * Exactly one capability is derivable today — whether any transaction exists —
 * because the rest of the vocabulary (`cfdi`, `tags`, `balance`) is behind
 * backend work that hasn't landed. The hook is shaped for the full set anyway
 * so adding one is a field here and a line in `REQUIREMENT_COPY`, not a new
 * mechanism at every call site.
 */
export type Capabilities = { transactions: boolean } & Partial<Record<string, boolean>>;

const NONE: Capabilities = { transactions: false };

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
            // A year-wide probe, not the selected period: whether the account
            // has any data at all must not flip when the user narrows to a
            // month they happen not to have uploaded.
            const batch = await queryMetrics(resolvePeriod("year"), [
                { key: "__capability_transactions", metric: "spend_by_category" },
            ]);
            const entry = batch.results.__capability_transactions;
            const has =
                !!entry &&
                !isMetricError(entry) &&
                ((entry.meta.source_txn_count ?? 0) > 0 || entry.rows.length > 0);
            setCapabilities({ transactions: has });
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
