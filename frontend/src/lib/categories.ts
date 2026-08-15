"use client";

import { useEffect, useState } from "react";
import { api, type Category } from "./api";
import { colors } from "@/design/tokens";

/**
 * The category taxonomy, fetched once per page load and shared by every
 * consumer — the editor's picker, the chart's color lens, the tooltip.
 * A module-level cache rather than a context: the data is global, immutable
 * within a session, and threading a provider through the tree buys nothing.
 */

export type CategoryInfo = { name: string; color: string; icon: string | null };

/** Chart color for a category nobody defined a color for, and for rows whose
 *  category id is unknown to this build. */
export const UNCATEGORIZED_COLOR = colors.ash;

let cache: Map<string, CategoryInfo> | null = null;
let inflight: Promise<Map<string, CategoryInfo>> | null = null;

async function fetchCategories(): Promise<Map<string, CategoryInfo>> {
    if (cache) return cache;
    inflight ??= api
        .categories()
        .then((res) => {
            cache = new Map(
                res.items.map((c: Category) => [
                    c.id,
                    { name: c.name, color: c.color ?? UNCATEGORIZED_COLOR, icon: c.icon },
                ])
            );
            return cache;
        })
        .finally(() => {
            // A failure clears the inflight slot so the next mount retries
            // instead of replaying a rejected promise forever.
            inflight = null;
        });
    return inflight;
}

/**
 * `null` while loading (or when the backend is unreachable — callers render
 * without category enrichment rather than blocking on it).
 */
export function useCategories(): Map<string, CategoryInfo> | null {
    const [map, setMap] = useState<Map<string, CategoryInfo> | null>(cache);

    useEffect(() => {
        if (map) return;
        let alive = true;
        fetchCategories()
            .then((m) => {
                if (alive) setMap(m);
            })
            .catch(() => {
                // Silent: category names are enrichment, not the data itself.
            });
        return () => {
            alive = false;
        };
    }, [map]);

    return map;
}

export function categoryName(
    map: Map<string, CategoryInfo> | null,
    categoryId: string | null
): string {
    if (!categoryId) return "Sin categoría";
    return map?.get(categoryId)?.name ?? "Sin categoría";
}

export function categoryColor(
    map: Map<string, CategoryInfo> | null,
    categoryId: string | null
): string {
    if (!categoryId) return UNCATEGORIZED_COLOR;
    return map?.get(categoryId)?.color ?? UNCATEGORIZED_COLOR;
}
