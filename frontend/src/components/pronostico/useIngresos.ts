"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
    DEFAULT_INGRESOS,
    localIngresosStore,
    type IncomeKind,
    type IngresosState,
    type IngresosStore,
} from "@/lib/ingresos";

const SAVE_DELAY_MS = 400;

/**
 * Which deposit clusters count as nómina or extra. Defaults first, then
 * the store — reading localStorage in useState would mismatch server HTML.
 */
export function useIngresos(store: IngresosStore = localIngresosStore) {
    const [state, setState] = useState<IngresosState>(DEFAULT_INGRESOS);
    const [hydrated, setHydrated] = useState(false);
    const dirty = useRef(false);

    useEffect(() => {
        let alive = true;
        store.load().then((stored) => {
            if (!alive) return;
            if (stored) setState(stored);
            setHydrated(true);
        });
        return () => {
            alive = false;
        };
    }, [store]);

    useEffect(() => {
        if (!dirty.current) return;
        const id = setTimeout(() => {
            store.save(state);
        }, SAVE_DELAY_MS);
        return () => clearTimeout(id);
    }, [state, store]);

    const replace = useCallback((next: IngresosState | ((prev: IngresosState) => IngresosState)) => {
        dirty.current = true;
        setState(next);
    }, []);

    const label = useCallback((key: string, kind: IncomeKind) => {
        replace((prev) => {
            const rest = prev.labeled.filter((l) => l.key !== key);
            return { ...prev, labeled: [...rest, { key, kind }] };
        });
    }, [replace]);

    const unlabel = useCallback((key: string) => {
        replace((prev) => ({
            ...prev,
            labeled: prev.labeled.filter((l) => l.key !== key),
        }));
    }, [replace]);

    return { state, hydrated, replace, label, unlabel };
}
