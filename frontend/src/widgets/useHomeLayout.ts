"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
    getHomeDashboard,
    saveHomeDashboard,
    type MetricParams,
    type WidgetSize,
} from "@/lib/metrics";
import { getWidget } from "./registry";

/**
 * A widget as the grid holds it.
 *
 * `key` is client-side and stable for the lifetime of the card, including
 * across the save that gives it a server id. React keys and metric query keys
 * both come from it, so reordering moves a card instead of re-mounting two.
 */
export type LayoutWidget = {
    key: string;
    metricId: string;
    params: MetricParams;
    size: WidgetSize;
    titleOverride: string | null;
};

/** Debounce on the PUT: resizing a widget three times is one save. */
const SAVE_DELAY_MS = 700;

let counter = 0;
const nextKey = () => `w${++counter}`;

function defaultSize(metricId: string): WidgetSize {
    const sizes = getWidget(metricId)?.sizes ?? ["md"];
    return sizes.includes("md") ? "md" : sizes[0];
}

export function useHomeLayout() {
    const [widgets, setWidgets] = useState<LayoutWidget[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [saveError, setSaveError] = useState<string | null>(null);
    const dirty = useRef(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const dashboard = await getHomeDashboard();
            setWidgets(
                [...dashboard.widgets]
                    .sort((a, b) => a.position - b.position)
                    .map((w) => ({
                        key: nextKey(),
                        metricId: w.metric_id,
                        params: w.params ?? {},
                        size: w.size,
                        titleOverride: w.title_override,
                    }))
            );
            setError(null);
        } catch (e) {
            // No layout means no grid. The page says so rather than inventing
            // a default that would silently overwrite the real one on save.
            setWidgets([]);
            setError((e as Error).message);
        } finally {
            dirty.current = false;
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    // Persist after the user stops fiddling. `dirty` gates it so the load
    // itself never triggers a PUT that would echo the server back at itself.
    useEffect(() => {
        if (!dirty.current) return;
        const id = setTimeout(async () => {
            try {
                await saveHomeDashboard(
                    widgets.map((w) => ({
                        metric_id: w.metricId,
                        params: w.params,
                        size: w.size,
                        title_override: w.titleOverride,
                    }))
                );
                setSaveError(null);
            } catch (e) {
                setSaveError((e as Error).message);
            }
        }, SAVE_DELAY_MS);
        return () => clearTimeout(id);
    }, [widgets]);

    const mutate = useCallback((fn: (prev: LayoutWidget[]) => LayoutWidget[]) => {
        dirty.current = true;
        setWidgets(fn);
    }, []);

    const add = useCallback(
        (metricId: string) => {
            mutate((prev) => [
                ...prev,
                {
                    key: nextKey(),
                    metricId,
                    params: { ...(getWidget(metricId)?.defaultParams ?? {}) },
                    size: defaultSize(metricId),
                    titleOverride: null,
                },
            ]);
        },
        [mutate]
    );

    const remove = useCallback(
        (key: string) => mutate((prev) => prev.filter((w) => w.key !== key)),
        [mutate]
    );

    const resize = useCallback(
        (key: string, size: WidgetSize) =>
            mutate((prev) => prev.map((w) => (w.key === key ? { ...w, size } : w))),
        [mutate]
    );

    const setParams = useCallback(
        (key: string, params: MetricParams) =>
            mutate((prev) => prev.map((w) => (w.key === key ? { ...w, params } : w))),
        [mutate]
    );

    /** `delta` is -1 or +1. Out-of-range moves are a no-op, not a wrap. */
    const move = useCallback(
        (key: string, delta: -1 | 1) =>
            mutate((prev) => {
                const i = prev.findIndex((w) => w.key === key);
                const j = i + delta;
                if (i < 0 || j < 0 || j >= prev.length) return prev;
                const next = [...prev];
                [next[i], next[j]] = [next[j], next[i]];
                return next;
            }),
        [mutate]
    );

    /** Add if absent, remove if present — what the picker's checkbox means. */
    const toggle = useCallback(
        (metricId: string) => {
            const existing = widgets.find((w) => w.metricId === metricId);
            if (existing) remove(existing.key);
            else add(metricId);
        },
        [widgets, add, remove]
    );

    return { widgets, loading, error, saveError, reload: load, add, remove, resize, move, setParams, toggle };
}
