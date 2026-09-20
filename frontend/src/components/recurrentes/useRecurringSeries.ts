"use client";

import { useEffect, useMemo, useState } from "react";
import { api, type RecurringItem, type Transaction } from "@/lib/api";
import { useBankScope } from "@/lib/banks";
import { itemFromManual, itemFromRestMark } from "@/lib/fijos";
import { useFijos } from "@/components/fijos/useFijos";

/**
 * Every series the user's fijos are made of, from three sources that Plan
 * and Recurrentes must agree on:
 * - `detected`: what the backend found with a rhythm, 12 months of history
 *   under the bank scope;
 * - `manuals`: charges detection missed, added by hand in Plan;
 * - `taughtRest`: merchants the user marked as frequent from Movimientos.
 *   They have a typical month but no day to project — a smear, not a
 *   calendar — so they are kept apart from `dated`.
 *
 * No time window and no Movimientos criteria apply here; each view decides
 * what to hide.
 */
export function useRecurringSeries(dataVersion: number) {
    const { statementIds, labels: banks } = useBankScope(dataVersion);
    const fijos = useFijos();
    const [detected, setDetected] = useState<RecurringItem[] | null>(null);
    const [ledger, setLedger] = useState<Transaction[] | null>(null);
    const [error, setError] = useState<string | null>(null);

    const scopeQuery = statementIds
        ? `?${statementIds.map((id) => `statement_id=${id}`).join("&")}`
        : "";

    useEffect(() => {
        let stale = false;
        api.recurring(scopeQuery)
            .then((res) => {
                if (stale) return;
                setDetected(res.items.map((i) => ({ ...i, key: i.key || i.label })));
                setError(null);
            })
            .catch((e) => {
                if (stale) return;
                setError((e as Error).message);
                setDetected([]);
            });
        return () => {
            stale = true;
        };
    }, [dataVersion, scopeQuery]);

    // A rest mark is a rule over the ledger, so its charges need the ledger.
    // Only fetched when there is at least one mark to apply.
    const restMarks = fijos.state.restMarks ?? [];
    const hasRest = restMarks.length > 0;
    useEffect(() => {
        if (!fijos.hydrated) return;
        if (!hasRest) {
            setLedger([]);
            return;
        }
        let stale = false;
        const params = new URLSearchParams();
        params.set("limit", "10000");
        for (const id of statementIds ?? []) params.append("statement_id", id);
        api.transactions(`?${params}`)
            .then((page) => {
                if (!stale) setLedger(page.items);
            })
            .catch(() => {
                if (!stale) setLedger([]);
            });
        return () => {
            stale = true;
        };
    }, [fijos.hydrated, hasRest, dataVersion, statementIds]);

    const manuals = useMemo(
        () => fijos.state.manuals.map(itemFromManual),
        [fijos.state.manuals]
    );

    const taughtRest = useMemo(() => {
        if (!ledger?.length) return [];
        return restMarks
            .map((m) => itemFromRestMark(m, ledger))
            .filter((i): i is RecurringItem => i !== null);
    }, [restMarks, ledger]);

    const found = useMemo(() => detected ?? [], [detected]);

    /** Series with a rhythm to project on a day: detection plus manuals. */
    const dated = useMemo(() => {
        const keys = new Set(found.map((i) => i.key));
        return [...found, ...manuals.filter((m) => !keys.has(m.key))];
    }, [found, manuals]);

    return {
        detected: found,
        manuals,
        taughtRest,
        dated,
        fijos,
        banks,
        loading: detected === null || !fijos.hydrated || (hasRest && ledger === null),
        error,
    };
}
