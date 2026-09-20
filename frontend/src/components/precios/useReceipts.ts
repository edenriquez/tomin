"use client";

import { useCallback, useEffect, useState } from "react";
import {
    receiptsApi,
    termsApi,
    type Receipt,
    type ReferenceTerm,
} from "@/lib/prices";
import { track } from "@/lib/telemetry";

/**
 * Every ticket the user has, and every association a ticket line carries.
 *
 * Loaded once for the whole Precios face rather than inside the ticket list:
 * the basket bar above the list and the product book below it read the same
 * tickets and the same terms, and three fetches of one answer are three
 * chances for the cards to disagree about it.
 */
export function useReceipts(dataVersion: number) {
    const [receipts, setReceipts] = useState<Receipt[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    // The association belongs to the product, so the same row serves every
    // basket that ever printed it.
    const [terms, setTerms] = useState<Record<string, ReferenceTerm>>({});

    useEffect(() => {
        let stale = false;
        receiptsApi
            .list()
            .then((res) => {
                if (stale) return;
                setReceipts(res.items);
                setError(null);
            })
            .catch((e) => !stale && setError((e as Error).message));
        return () => {
            stale = true;
        };
    }, [dataVersion]);

    useEffect(() => {
        let stale = false;
        termsApi
            .list()
            .then((res) => {
                if (stale) return;
                setTerms(Object.fromEntries(res.items.map((t) => [t.product_key, t])));
            })
            // Silent: an association nobody has made yet is the normal state,
            // and the lines render as "sin asociar" either way.
            .catch(() => undefined);
        return () => {
            stale = true;
        };
    }, [dataVersion]);

    const associate = useCallback(async (productKey: string, term: string) => {
        track("precios.term_set");
        const saved = await termsApi.set(productKey, term);
        setTerms((current) => ({ ...current, [productKey]: saved }));
    }, []);

    const remove = useCallback(async (id: string) => {
        track("precios.ticket_delete");
        await receiptsApi.remove(id);
        // Dropped from the list here rather than by refetching: the answer is
        // already known, and a refetch would blink the whole list to remove one
        // row from it.
        setReceipts((current) => (current ?? []).filter((r) => r.id !== id));
    }, []);

    return { receipts, error, terms, associate, remove };
}
