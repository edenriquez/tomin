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

/** One key per category: its first letter, accent- and case-folded. Two
 *  categories that share an initial share the key — pressing it again
 *  moves to the next one, in taxonomy order. */
export type CategoryHotkey = { id: string; name: string; key: string };

export function hotkeyOf(text: string): string {
    const first = text
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .match(/[a-z0-9]/);
    return first ? first[0] : "";
}

export function categoryHotkeys(map: Map<string, CategoryInfo> | null): CategoryHotkey[] {
    if (!map) return [];
    const out: CategoryHotkey[] = [];
    for (const [id, c] of map) {
        const key = hotkeyOf(c.name);
        if (key) out.push({ id, name: c.name, key });
    }
    return out;
}

/** The category a key press selects: the first with that initial, or the
 *  one after the current when the current already carries it. */
export function nextCategoryForKey(
    hotkeys: CategoryHotkey[],
    key: string,
    currentId: string | null
): CategoryHotkey | null {
    const candidates = hotkeys.filter((h) => h.key === key);
    if (candidates.length === 0) return null;
    const at = candidates.findIndex((h) => h.id === currentId);
    return candidates[(at + 1) % candidates.length] ?? null;
}
