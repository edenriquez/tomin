"use client";

import { useCallback, useEffect, useState } from "react";
import { api, type Transaction, type TransactionPatch } from "@/lib/api";
import type { WindowBounds } from "@/lib/window";
import { useToast } from "@/components/ui";

/**
 * One window-wide fetch, not server pagination. The scatter needs every
 * point in the window anyway, and one dataset is the guarantee that the
 * chart and the table can never disagree. At personal-finance scale (a heavy
 * user is ~200 movements a month) the cap below covers years; if it is ever
 * hit, the caller shows "mostrando los más recientes" rather than silently
 * truncating.
 */
export const FETCH_CAP = 10000;

export function useTransactions(
    bounds: WindowBounds,
    dataVersion: number,
    /** Bank scope: statement ids to read through, or null for everything. */
    statementIds: string[] | null = null
) {
    const { toast } = useToast();
    const [items, setItems] = useState<Transaction[] | null>(null);
    const [total, setTotal] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [reloadKey, setReloadKey] = useState(0);

    // Depend on the bound *strings*, not the object — the caller builds a
    // fresh object every render. Same for the scope: its identity churns.
    const { start, end } = bounds;
    const scopeKey = statementIds?.join("|") ?? "";

    useEffect(() => {
        // The stale flag makes out-of-order responses harmless: a slow fetch
        // for the previous window resolves after cleanup and writes nothing.
        let stale = false;
        setItems(null);

        const params = new URLSearchParams();
        if (start) params.set("start", start);
        if (end) params.set("end", end);
        for (const id of statementIds ?? []) params.append("statement_id", id);
        params.set("limit", String(FETCH_CAP));

        api.transactions(`?${params}`)
            .then((page) => {
                if (stale) return;
                setItems(page.items);
                setTotal(page.total);
                setError(null);
            })
            .catch((e) => {
                if (stale) return;
                setError((e as Error).message);
                setItems([]);
            });

        return () => {
            stale = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [start, end, scopeKey, dataVersion, reloadKey]);

    const reload = useCallback(() => setReloadKey((k) => k + 1), []);

    /**
     * The command-center edit: apply the patch to the local array immediately
     * — charts and list draw from this same array, so the dot recolors or
     * disappears under the user's cursor — then persist. Failure reverts that
     * one row and says so; success reconciles with the server's copy (it
     * stamps `category_source` and `updated_at`).
     */
    const patchItem = useCallback(
        async (id: string, patch: TransactionPatch) => {
            let before: Transaction | undefined;
            setItems((cur) => {
                if (!cur) return cur;
                return cur.map((t) => {
                    if (t.id !== id) return t;
                    before = t;
                    return { ...t, ...patch } as Transaction;
                });
            });
            try {
                const server = await api.updateTransaction(id, patch);
                setItems((cur) =>
                    cur ? cur.map((t) => (t.id === id ? server : t)) : cur
                );
            } catch (e) {
                setItems((cur) =>
                    cur && before ? cur.map((t) => (t.id === id ? before! : t)) : cur
                );
                toast(`No se pudo guardar el cambio: ${(e as Error).message}`, "negative");
            }
        },
        [toast]
    );

    return { items, total, error, reload, patchItem };
}
