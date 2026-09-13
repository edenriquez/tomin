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
    type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import {
    categoryPathParts,
    childCategories,
    foldCategoryName,
    isUncategorizedId,
    rememberCategory,
    rootCategories,
    rootCategoryId,
    useCategories,
} from "@/lib/categories";
import { usePortal } from "@/components/ui/usePortal";
import { useToast } from "@/components/ui";
import { track } from "@/lib/telemetry";

const NONE = "__none__";

type Row =
    | { key: string; id: string | null; label: string; hint?: string; indent?: boolean }
    | { key: string; create: true; name: string; parentId: string; parentName: string };

/**
 * One field for the whole path: `Transporte / Gasolina`. Search finds a
 * leaf or a root; Enter on a name nobody has used yet mints the leaf
 * under the current root — or asks which root, if the movement has none.
 */
export function TaxonomyField({
    value,
    onChange,
}: {
    value: string | null;
    onChange: (id: string | null) => void;
}) {
    const map = useCategories();
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [active, setActive] = useState(0);
    const [creating, setCreating] = useState(false);
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

    const empty = isUncategorizedId(map, value);
    const currentId = empty ? null : value;
    const currentRootId = rootCategoryId(map, currentId);
    const parts = categoryPathParts(map, currentId);
    const typed = query.trim();
    const folded = foldCategoryName(typed);

    const rows = useMemo(() => buildRows(map, folded, typed, currentRootId), [
        map,
        folded,
        typed,
        currentRootId,
    ]);

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
        const width = trigger.width;
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
        if (open) searchRef.current?.focus();
    }, [open]);

    async function applyCreate(name: string, parentId: string) {
        const clean = name.trim();
        if (!clean) return;
        setCreating(true);
        try {
            const created = await api.createCategory({
                name: clean,
                parent_id: parentId,
            });
            rememberCategory(created);
            track("movimientos.subcategory_create");
            onChange(created.id);
            close();
        } catch (e) {
            toast(`No se pudo crear: ${(e as Error).message}`, "negative");
        } finally {
            setCreating(false);
        }
    }

    function commit(row: Row) {
        if ("create" in row) {
            void applyCreate(row.name, row.parentId);
            return;
        }
        track("movimientos.category_path");
        onChange(row.id);
        close();
    }

    function onTriggerKey(e: KeyboardEvent<HTMLButtonElement>) {
        if (open) return;
        if (["Enter", " ", "ArrowDown", "ArrowUp"].includes(e.key)) {
            e.preventDefault();
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
            return;
        }
        if (e.key === "Enter") {
            e.preventDefault();
            const row = rows[active];
            if (row) commit(row);
        }
    }

    return (
        <div ref={rootRef} className="relative mt-1.5">
            <button
                type="button"
                role="combobox"
                aria-expanded={open}
                aria-haspopup="listbox"
                aria-controls={open ? listId : undefined}
                aria-label="Categoría"
                disabled={creating}
                onClick={() => (open ? close() : setOpen(true))}
                onKeyDown={onTriggerKey}
                className={cn(
                    "inline-flex h-9 w-full items-center justify-between gap-2 rounded-control",
                    "border border-mist bg-paper px-3.5 text-body-sm hover:border-muted",
                    currentId ? "text-ink" : "text-graphite",
                    open && "border-muted"
                )}
            >
                <PathLabel parts={parts} />
                <ChevronDown
                    size={14}
                    aria-hidden
                    className={cn(
                        "shrink-0 text-ash transition-transform duration-100",
                        open && "rotate-180"
                    )}
                />
            </button>

            {open &&
                mounted &&
                createPortal(
                    <div
                        ref={listRef}
                        data-nested-overlay
                        id={listId}
                        role="listbox"
                        aria-label="Taxonomía"
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
                                onKeyDown={(e) => {
                                    if (e.key !== "Enter") return;
                                    e.preventDefault();
                                    e.stopPropagation();
                                    const row = rows[active];
                                    if (row) commit(row);
                                }}
                                placeholder="Buscar o escribir"
                                aria-label="Buscar o escribir categoría"
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
                                    const selected =
                                        !("create" in row) &&
                                        (row.id === currentId ||
                                            (row.id === null && currentId === null));
                                    const create = "create" in row;
                                    return (
                                        <li
                                            key={row.key}
                                            role="option"
                                            aria-selected={selected}
                                            onPointerEnter={() => setActive(i)}
                                            onClick={() => commit(row)}
                                            className={cn(
                                                "flex cursor-pointer items-center justify-between gap-3 py-2 text-body-sm",
                                                create || ("indent" in row && row.indent)
                                                    ? "pl-7 pr-3.5"
                                                    : "px-3.5",
                                                create
                                                    ? "text-ink"
                                                    : !("create" in row) && row.id === null
                                                      ? "text-graphite"
                                                      : "text-ink",
                                                active === i && "bg-fog"
                                            )}
                                        >
                                            <span className="min-w-0">
                                                <span className="block truncate">
                                                    {create
                                                        ? `«${row.name}» en ${row.parentName}`
                                                        : row.label}
                                                </span>
                                                {create ? (
                                                    <span className="block text-label text-ash">
                                                        Enter aplica lo escrito
                                                    </span>
                                                ) : row.hint ? (
                                                    <span className="block text-label text-ash">
                                                        {row.hint}
                                                    </span>
                                                ) : null}
                                            </span>
                                            {selected && (
                                                <Check
                                                    size={14}
                                                    aria-hidden
                                                    className="shrink-0 text-signal"
                                                />
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

function PathLabel({ parts }: { parts: string[] }) {
    if (parts.length === 0) {
        return <span className="truncate text-graphite">Sin categoría</span>;
    }
    const nodes: ReactNode[] = [];
    parts.forEach((name, i) => {
        if (i > 0) {
            nodes.push(
                <span key={`s${i}`} className="text-ash">
                    {" / "}
                </span>
            );
        }
        nodes.push(
            <span
                key={`p${i}`}
                className={i === parts.length - 1 ? "text-ink" : "text-graphite"}
            >
                {name}
            </span>
        );
    });
    return <span className="truncate">{nodes}</span>;
}

function buildRows(
    map: ReturnType<typeof useCategories>,
    folded: string,
    typed: string,
    currentRootId: string | null
): Row[] {
    const roots = rootCategories(map);
    const rows: Row[] = [];

    if (!folded) {
        rows.push({ key: NONE, id: null, label: "Sin categoría" });
        for (const root of roots) {
            const kids = childCategories(map, root.id);
            rows.push({
                key: root.id,
                id: root.id,
                label: root.name,
                hint: kids.length > 0 ? "Toda la categoría" : undefined,
            });
            for (const kid of kids) {
                rows.push({
                    key: kid.id,
                    id: kid.id,
                    label: kid.name,
                    indent: true,
                });
            }
        }
        return rows;
    }

    const noneHit = foldCategoryName("Sin categoría").includes(folded);
    if (noneHit) rows.push({ key: NONE, id: null, label: "Sin categoría" });

    for (const root of roots) {
        const rootHit = foldCategoryName(root.name).includes(folded);
        const kids = childCategories(map, root.id);
        const kidHits = kids.filter((k) => foldCategoryName(k.name).includes(folded));
        if (rootHit) {
            rows.push({
                key: root.id,
                id: root.id,
                label: root.name,
                hint: kids.length > 0 ? "Toda la categoría" : undefined,
            });
        }
        for (const kid of kidHits) {
            rows.push({
                key: kid.id,
                id: kid.id,
                label: `${root.name} / ${kid.name}`,
            });
        }
    }

    const exact = allNames(map).some((n) => foldCategoryName(n) === folded);
    if (typed && !exact) {
        if (currentRootId) {
            const parent = roots.find((r) => r.id === currentRootId);
            if (parent) {
                rows.push({
                    key: `create:${parent.id}`,
                    create: true,
                    name: typed,
                    parentId: parent.id,
                    parentName: parent.name,
                });
            }
        } else {
            for (const root of roots) {
                rows.push({
                    key: `create:${root.id}`,
                    create: true,
                    name: typed,
                    parentId: root.id,
                    parentName: root.name,
                });
            }
        }
    }

    return rows;
}

function allNames(map: ReturnType<typeof useCategories>): string[] {
    if (!map) return [];
    return Array.from(map.values()).map((c) => c.name);
}

const GAP = 8;
const EDGE = 8;
const MAX_MENU_HEIGHT = 320;
