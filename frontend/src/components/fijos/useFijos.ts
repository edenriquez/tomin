"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
    DEFAULT_FIJOS,
    localFijosStore,
    type FijosState,
    type FijosStore,
    type Horizon,
    type ManualFijo,
    type RestMark,
} from "@/lib/fijos";

const SAVE_DELAY_MS = 400;

/**
 * The curated fijos set, hydrated from the dedicated store. Defaults first,
 * then the stored pins — reading localStorage in useState would mismatch
 * server HTML.
 */
export function useFijos(store: FijosStore = localFijosStore) {
    const [state, setState] = useState<FijosState>(DEFAULT_FIJOS);
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

    const replace = useCallback((next: FijosState | ((prev: FijosState) => FijosState)) => {
        dirty.current = true;
        setState(next);
    }, []);

    const pin = useCallback((key: string) => {
        replace((prev) =>
            prev.pinnedKeys.includes(key) ? prev : { ...prev, pinnedKeys: [...prev.pinnedKeys, key] }
        );
    }, [replace]);

    const unpin = useCallback((key: string) => {
        replace((prev) => ({
            ...prev,
            pinnedKeys: prev.pinnedKeys.filter((k) => k !== key),
            manuals: prev.manuals.filter((m) => m.key !== key),
        }));
    }, [replace]);

    const addManual = useCallback((manual: ManualFijo) => {
        replace((prev) => {
            if (prev.pinnedKeys.includes(manual.key) || prev.manuals.some((m) => m.key === manual.key)) {
                return prev;
            }
            return {
                ...prev,
                pinnedKeys: [...prev.pinnedKeys, manual.key],
                manuals: [...prev.manuals, manual],
            };
        });
    }, [replace]);

    const addRest = useCallback((mark: RestMark) => {
        replace((prev) => {
            const marks = prev.restMarks ?? [];
            if (marks.some((m) => m.key === mark.key)) return prev;
            return { ...prev, restMarks: [...marks, mark] };
        });
    }, [replace]);

    const pinRest = useCallback((mark: RestMark) => {
        replace((prev) => {
            const marks = prev.restMarks ?? [];
            const restMarks = marks.some((m) => m.key === mark.key) ? marks : [...marks, mark];
            const pinnedKeys = prev.pinnedKeys.includes(mark.key)
                ? prev.pinnedKeys
                : [...prev.pinnedKeys, mark.key];
            if (restMarks === marks && pinnedKeys === prev.pinnedKeys) return prev;
            return { ...prev, restMarks, pinnedKeys };
        });
    }, [replace]);

    const removeRest = useCallback((key: string) => {
        replace((prev) => ({
            ...prev,
            restMarks: (prev.restMarks ?? []).filter((m) => m.key !== key),
        }));
    }, [replace]);

    const setHorizon = useCallback((horizon: Horizon) => {
        replace((prev) => (prev.horizon === horizon ? prev : { ...prev, horizon }));
    }, [replace]);

    const setNoiseOn = useCallback((noiseOn: boolean) => {
        replace((prev) => (prev.noiseOn === noiseOn ? prev : { ...prev, noiseOn }));
    }, [replace]);

    return { state, hydrated, replace, pin, unpin, addManual, addRest, pinRest, removeRest, setHorizon, setNoiseOn };
}
