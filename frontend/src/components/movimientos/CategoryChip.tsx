"use client";

import {
    useCallback,
    useEffect,
    useId,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
    type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";
import {
    childCategories,
    foldCategoryName,
    formatCategoryPath,
    isUncategorizedId,
    rootCategories,
    useCategories,
} from "@/lib/categories";
import { usePortal } from "@/components/ui/usePortal";

/**
 * The category, as a chip on every row. Uncategorized is a dashed invite;
 * assigned is a quiet fog pill. The path reads `Padre › Hija` when the
 * movement sits on a leaf.
 */

type PickerRow = { id: string | null; label: string; hint?: string };

function pickerRows(): PickerRow[] {
    return [{ id: null, label: "Sin categoría" }];
}

function taxonomyRows(
    map: ReturnType<typeof useCategories>
): PickerRow[] {
    const rows = pickerRows();
    if (!map) return rows;
    for (const root of rootCategories(map)) {
        const kids = childCategories(map, root.id);
        if (kids.length === 0) {
            rows.push({ id: root.id, label: root.name });
            continue;
        }
        rows.push({ id: root.id, label: root.name, hint: "Toda la categoría" });
        for (const kid of kids) {
            rows.push({ id: kid.id, label: `${root.name} › ${kid.name}` });
        }
    }
    return rows;
}

export function CategoryChip({
    categoryId,
    source,
    onChange,
    editing = false,
}: {
    categoryId: string | null;
    source?: string | null;
    onChange?: (id: string | null) => void;
    editing?: boolean;
}) {
    const map = useCategories();
    const shown = categoryId;
    const empty = isUncategorizedId(map, shown);
    const label = formatCategoryPath(map, shown);
    const auto = source === "auto" && !empty;

    if (!onChange) {
        return (
            <span className={cn(CHIP, empty ? CHIP_EMPTY : CHIP_SET)}>
                {auto && <AutoMark />}
                <span className="truncate">{label}</span>
            </span>
        );
    }

    return (
        <CategoryPicker
            value={shown}
            label={label}
            empty={empty}
            auto={auto}
            onChange={onChange}
            editing={editing}
        />
    );
}

function CategoryPicker({
    value,
    label,
    empty,
    auto,
    onChange,
    editing,
}: {
    value: string | null;
    label: string;
    empty: boolean;
    auto: boolean;
    onChange: (id: string | null) => void;
    editing: boolean;
}) {
    const map = useCategories();
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [active, setActive] = useState(0);
    const rootRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);
    const listId = useId();
    const mounted = usePortal();
    const [box, setBox] = useState<{
        left: number;
        top: number;
        width: number;
        flipped: boolean;
    } | null>(null);

    const rows = useMemo(() => {
        const all = taxonomyRows(map);
        const q = foldCategoryName(query);
        if (!q) return all;
        return all.filter((r) => foldCategoryName(r.label).includes(q));
    }, [map, query]);

    const close = useCallback(() => {
        setOpen(false);
        setQuery("");
        setActive(0);
    }, []);

    const place = useCallback(() => {
        const trigger = rootRef.current?.getBoundingClientRect();
        if (!trigger) return;
        const height = listRef.current?.offsetHeight ?? 0;
        const below = window.innerHeight - trigger.bottom;
        const flipped = height > 0 && below < height + GAP && trigger.top > below;
        const width = Math.max(240, trigger.width);
        const left = Math.min(
            Math.max(EDGE, trigger.left),
            window.innerWidth - width - EDGE
        );
        setBox({
            left: Number.isFinite(left) ? left : trigger.left,
            top: flipped ? trigger.top - GAP : trigger.bottom + GAP,
            width,
            flipped,
        });
    }, []);

    useLayoutEffect(() => {
        if (open) place();
        else setBox(null);
    }, [open, place, rows.length]);

    useEffect(() => {
        if (!open) return;
        const onMove = () => place();
        window.addEventListener("scroll", onMove, true);
        window.addEventListener("resize", onMove);
        return () => {
            window.removeEventListener("scroll", onMove, true);
            window.removeEventListener("resize", onMove);
        };
    }, [open, place]);

    useEffect(() => {
        if (!open) return;
        function onPointerDown(e: PointerEvent) {
            const t = e.target as Node;
            if (rootRef.current?.contains(t) || listRef.current?.contains(t)) return;
            close();
        }
        document.addEventListener("pointerdown", onPointerDown);
        return () => document.removeEventListener("pointerdown", onPointerDown);
    }, [open, close]);

    useEffect(() => {
        if (!open) return;
        searchRef.current?.focus();
    }, [open]);

    useEffect(() => {
        if (!open) return;
        function onKey(e: globalThis.KeyboardEvent) {
            if (e.key !== "Escape") return;
            e.preventDefault();
            e.stopPropagation();
            close();
        }
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [open, close]);

    function commit(id: string | null) {
        onChange(id);
        close();
    }

    function onTriggerKey(e: KeyboardEvent<HTMLButtonElement>) {
        if (open) return;
        if (["Enter", " ", "ArrowDown", "ArrowUp"].includes(e.key)) {
            e.preventDefault();
            e.stopPropagation();
            setOpen(true);
        }
    }

    function onMenuKey(e: KeyboardEvent<HTMLDivElement>) {
        if (e.key === "Escape") {
            e.preventDefault();
            e.stopPropagation();
            close();
            return;
        }
        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            const dir = e.key === "ArrowDown" ? 1 : -1;
            setActive((a) => (a + dir + rows.length) % Math.max(rows.length, 1));
        } else if (e.key === "Enter") {
            e.preventDefault();
            const row = rows[active];
            if (row) commit(row.id);
        }
    }

    return (
        <div ref={rootRef} className="min-w-0 max-w-full">
            <button
                type="button"
                role="combobox"
                aria-expanded={open}
                aria-haspopup="listbox"
                aria-controls={open ? listId : undefined}
                aria-label={`Categoría: ${label}. Cambiar categoría`}
                onClick={(e) => {
                    e.stopPropagation();
                    setOpen((o) => !o);
                }}
                onKeyDown={onTriggerKey}
                className={cn(
                    CHIP,
                    "cursor-pointer transition-colors duration-100",
                    empty ? CHIP_EMPTY : CHIP_SET,
                    editing && !empty && "ring-mist"
                )}
            >
                {auto && <AutoMark />}
                <span className="truncate">{label}</span>
                <ChevronDown size={12} aria-hidden className="shrink-0 text-ash" />
            </button>

            {open &&
                mounted &&
                createPortal(
                    <div
                        ref={listRef}
                        data-nested-overlay
                        id={listId}
                        role="listbox"
                        aria-label="Elegir categoría"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={onMenuKey}
                        style={{
                            left: box?.left ?? 0,
                            top: box?.top ?? 0,
                            width: box?.width ?? 240,
                            visibility: box ? "visible" : "hidden",
                            transform: box?.flipped ? "translateY(-100%)" : undefined,
                            maxHeight: MAX_MENU_HEIGHT,
                        }}
                        className="fixed z-modal flex flex-col overflow-hidden rounded-card border border-mist bg-paper shadow-card"
                    >
                        <div className="border-b border-mist px-2.5 py-2">
                            <input
                                ref={searchRef}
                                type="search"
                                value={query}
                                onChange={(e) => {
                                    setQuery(e.target.value);
                                    setActive(0);
                                }}
                                placeholder="Buscar categoría"
                                aria-label="Buscar categoría"
                                className={cn(
                                    "h-8 w-full rounded-control border border-mist bg-paper px-2.5 text-body-sm text-ink outline-none",
                                    "placeholder:text-ash focus:border-ink",
                                    "[&::-webkit-search-cancel-button]:hidden"
                                )}
                            />
                        </div>
                        <ul className="min-h-0 flex-1 overflow-y-auto py-1">
                            {rows.length === 0 ? (
                                <li className="px-3.5 py-2 text-body-sm text-graphite">
                                    Nada coincide.
                                </li>
                            ) : (
                                rows.map((row, i) => {
                                    const selected = row.id === value || (row.id === null && value === null);
                                    return (
                                        <li
                                            key={row.id ?? "__none"}
                                            role="option"
                                            aria-selected={selected}
                                            onPointerEnter={() => setActive(i)}
                                            onClick={() => commit(row.id)}
                                            className={cn(
                                                "flex cursor-pointer items-center justify-between gap-3 px-3.5 py-2 text-body-sm",
                                                row.id === null ? "text-graphite" : "text-ink",
                                                active === i && "bg-fog"
                                            )}
                                        >
                                            <span className="min-w-0">
                                                <span className="block truncate">{row.label}</span>
                                                {row.hint && (
                                                    <span className="block text-label text-ash">
                                                        {row.hint}
                                                    </span>
                                                )}
                                            </span>
                                            {selected && (
                                                <Check size={14} aria-hidden className="shrink-0 text-signal" />
                                            )}
                                        </li>
                                    );
                                })
                            )}
                        </ul>
                    </div>,
                    document.body
                )}
        </div>
    );
}

function AutoMark() {
    return (
        <span title="Categoría asignada automáticamente" className="eyebrow">
            auto
        </span>
    );
}

const CHIP =
    "inline-flex max-w-full items-center gap-1 rounded-tag px-2 py-0.5 text-label";
const CHIP_SET = "bg-fog text-ink ring-1 ring-inset ring-mist hover:ring-muted";
const CHIP_EMPTY =
    "border border-dashed border-muted bg-transparent text-graphite hover:border-ink hover:text-ink";

const GAP = 8;
const EDGE = 8;
const MAX_MENU_HEIGHT = 320;
