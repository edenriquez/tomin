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

export type CategoryInfo = {
    name: string;
    color: string;
    icon: string | null;
    /** Null = root. One level: a child never has children. */
    parentId: string | null;
};

/** Chart color for a category nobody defined a color for, and for rows whose
 *  category id is unknown to this build. */
export const UNCATEGORIZED_COLOR = colors.ash;

let cache: Map<string, CategoryInfo> | null = null;
let inflight: Promise<Map<string, CategoryInfo>> | null = null;
const listeners = new Set<(map: Map<string, CategoryInfo>) => void>();

function emit() {
    if (!cache) return;
    const snap = new Map(cache);
    for (const notify of listeners) notify(snap);
}

function toInfo(c: Category): CategoryInfo {
    return {
        name: c.name,
        color: c.color ?? UNCATEGORIZED_COLOR,
        icon: c.icon,
        parentId: c.parent_id ?? null,
    };
}

/** A leaf the user just minted — keep every picker in this session in step. */
export function rememberCategory(c: Category) {
    cache ??= new Map();
    cache.set(c.id, toInfo(c));
    emit();
}

async function fetchCategories(): Promise<Map<string, CategoryInfo>> {
    if (cache) return cache;
    inflight ??= api
        .categories()
        .then((res) => {
            cache = new Map(res.items.map((c: Category) => [c.id, toInfo(c)]));
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
        listeners.add(setMap);
        let alive = true;
        if (!cache) {
            fetchCategories()
                .then((m) => {
                    if (alive) setMap(m);
                })
                .catch(() => {
                    // Silent: category names are enrichment, not the data itself.
                });
        }
        return () => {
            alive = false;
            listeners.delete(setMap);
        };
    }, []);

    return map;
}

export function foldCategoryName(name: string): string {
    return name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}

export function isUncategorizedName(name: string): boolean {
    return foldCategoryName(name) === "sin categoria";
}

export function isUncategorizedId(
    map: Map<string, CategoryInfo> | null,
    categoryId: string | null
): boolean {
    if (!categoryId) return true;
    const name = map?.get(categoryId)?.name;
    return !name || isUncategorizedName(name);
}

export function categoryName(
    map: Map<string, CategoryInfo> | null,
    categoryId: string | null
): string {
    if (isUncategorizedId(map, categoryId)) return "Sin categoría";
    return map?.get(categoryId!)?.name ?? "Sin categoría";
}

/** Walk root → leaf. Empty when the id is missing or «Sin categoría». */
export function categoryPathParts(
    map: Map<string, CategoryInfo> | null,
    categoryId: string | null
): string[] {
    if (isUncategorizedId(map, categoryId) || !map || !categoryId) return [];
    const names: string[] = [];
    let cur: string | null = categoryId;
    const seen = new Set<string>();
    while (cur && !seen.has(cur)) {
        seen.add(cur);
        const info = map.get(cur);
        if (!info || isUncategorizedName(info.name)) break;
        names.unshift(info.name);
        cur = info.parentId;
    }
    return names;
}

/** `Vivienda › Luz` when a parent exists; otherwise the leaf name. */
export function formatCategoryPath(
    map: Map<string, CategoryInfo> | null,
    categoryId: string | null
): string {
    const names = categoryPathParts(map, categoryId);
    return names.length > 0 ? names.join(" › ") : "Sin categoría";
}

export function rootCategoryId(
    map: Map<string, CategoryInfo> | null,
    categoryId: string | null
): string | null {
    if (!categoryId || !map) return categoryId;
    let cur: string | null = categoryId;
    const seen = new Set<string>();
    while (cur && !seen.has(cur)) {
        seen.add(cur);
        const parent: string | null = map.get(cur)?.parentId ?? null;
        if (!parent) return cur;
        cur = parent;
    }
    return categoryId;
}

export function childCategories(
    map: Map<string, CategoryInfo> | null,
    parentId: string | null
): { id: string; name: string }[] {
    if (!map || !parentId) return [];
    return Array.from(map.entries())
        .filter(([, c]) => c.parentId === parentId && !isUncategorizedName(c.name))
        .map(([id, c]) => ({ id, name: c.name }))
        .sort((a, b) => a.name.localeCompare(b.name, "es-MX"));
}

export function rootCategories(
    map: Map<string, CategoryInfo> | null
): { id: string; name: string }[] {
    if (!map) return [];
    return Array.from(map.entries())
        .filter(([, c]) => !c.parentId && !isUncategorizedName(c.name))
        .map(([id, c]) => ({ id, name: c.name }))
        .sort((a, b) => a.name.localeCompare(b.name, "es-MX"));
}

/** The id and every descendant — selecting a parent includes its leaves. */
export function categoryFamily(
    map: Map<string, CategoryInfo> | null,
    categoryId: string
): string[] {
    const out = [categoryId];
    if (!map) return out;
    for (const [id, c] of map) {
        if (c.parentId === categoryId) out.push(...categoryFamily(map, id));
    }
    return out;
}

export function categoryColor(
    map: Map<string, CategoryInfo> | null,
    categoryId: string | null
): string {
    if (!categoryId) return UNCATEGORIZED_COLOR;
    return map?.get(categoryId)?.color ?? UNCATEGORIZED_COLOR;
}
