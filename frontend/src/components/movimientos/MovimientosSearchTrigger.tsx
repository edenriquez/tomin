"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/cn";
import { categoryName, useCategories } from "@/lib/categories";
import {
    clearChip,
    EMPTY_QUERY,
    queryChips,
} from "@/lib/movimientosQuery";
import { useMovimientosSearch } from "./MovimientosSearchProvider";

/**
 * The list is a dialog. This is the commit to open it — click or ⌘K —
 * not a search field pretending to be a filter.
 */
export function MovimientosSearchTrigger() {
    const { openModal } = useMovimientosSearch();
    const shortcut = isApple() ? "⌘K" : "Ctrl K";

    return (
        <button
            type="button"
            onClick={() => openModal("trigger")}
            className={cn(
                "inline-flex h-10 items-center gap-2.5 rounded-control border border-soot",
                "bg-soot px-4 text-body font-medium text-paper",
                "transition-colors duration-100 hover:border-ink hover:bg-ink"
            )}
        >
            Abrir transacciones
            <kbd
                className={cn(
                    "hidden rounded-[4px] border border-paper/25 bg-paper/10 px-1.5 py-0.5",
                    "font-sans text-label font-medium text-paper sm:inline"
                )}
            >
                {shortcut}
            </kbd>
        </button>
    );
}

export function MovimientosQueryChips() {
    const { query, setQuery } = useMovimientosSearch();
    const categories = useCategories();
    const chips = queryChips(query, (id) => categoryName(categories, id));
    if (chips.length === 0) return null;

    return (
        <div className="-mt-4 flex flex-wrap items-center gap-1.5 pb-5">
            {chips.map((chip) => (
                <span
                    key={chip.key}
                    className="inline-flex items-center gap-1 rounded-tag bg-fog py-0.5 pl-2 pr-1 text-label text-ink ring-1 ring-inset ring-mist"
                >
                    {chip.label}
                    <button
                        type="button"
                        aria-label={`Quitar ${chip.label}`}
                        onClick={() => setQuery(clearChip(query, chip))}
                        className="rounded-full p-0.5 text-ash hover:text-ink"
                    >
                        <X size={12} aria-hidden />
                    </button>
                </span>
            ))}
            <button
                type="button"
                onClick={() => setQuery(EMPTY_QUERY)}
                className="rounded-control px-1.5 py-0.5 text-label text-graphite underline decoration-mist underline-offset-4 hover:text-ink"
            >
                Quitar criterios
            </button>
        </div>
    );
}

function isApple(): boolean {
    if (typeof navigator === "undefined") return true;
    return /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);
}
