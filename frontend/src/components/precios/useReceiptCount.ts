"use client";

import { useEffect, useState } from "react";
import { receiptsApi } from "@/lib/prices";

/**
 * How many tickets the account has. `null` while unknown.
 *
 * Tickets only ever arrive from the phone, so for a web-only user this is
 * zero for as long as they use the product. The shell reads it to decide
 * whether Precios earns a place in the nav at all, and Documentos reads it to
 * say where tickets come from. A failed read is treated as zero: a tab that
 * appears because the API blinked is worse than one that shows up a beat late.
 */
export function useReceiptCount(version = 0): number | null {
    const [count, setCount] = useState<number | null>(null);
    useEffect(() => {
        let stale = false;
        receiptsApi
            .list()
            .then((res) => !stale && setCount(res.total ?? res.items.length))
            .catch(() => !stale && setCount(0));
        return () => {
            stale = true;
        };
    }, [version]);
    return count;
}
