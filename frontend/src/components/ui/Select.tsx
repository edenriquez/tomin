"use client";

import {
    useCallback,
    useEffect,
    useId,
    useLayoutEffect,
    useRef,
    useState,
    type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";
import { usePortal } from "./usePortal";

export type SelectOption<V extends string> = {
    value: V;
    label: string;
};

/**
 * A styled single-select listbox: pill trigger, hairline popover, Signal
 * check on the selected row. Exists because the native <select> cannot be
 * styled into this design system, and because the menu here is short — for
 * long or searchable lists, build a combobox instead of growing this.
 *
 * Keyboard contract (WAI-ARIA listbox): Enter/Space/ArrowDown open, arrows
 * move the active row, Enter/Space select, Escape closes without selecting,
 * Tab closes and moves on.
 *
 * The menu renders in a portal, fixed to the trigger's position on screen.
 * Absolutely positioned it was clipped by any ancestor with `overflow-hidden`
 * — a card with rounded corners, a table — and the last rows of a list are
 * exactly where that bites. Fixed positioning also lets it flip above the
 * trigger when the viewport has no room below, which is the same problem seen
 * from the other side.
 */
export function Select<V extends string>({
    value,
    options,
    onChange,
    placeholder = "Seleccionar",
    variant = "field",
    "aria-label": ariaLabel,
    className,
}: {
    /** "field" is the bordered pill for forms; "quiet" dresses the trigger as
     *  plain text — for editing a value in the place where it is read, where
     *  a bordered control would turn a sentence into a form. */
    variant?: "field" | "quiet";
    /** `null` renders the placeholder — the honest "not yet chosen". */
    value: V | null;
    options: SelectOption<V>[];
    onChange: (value: V | null) => void;
    /** Also the label of the always-present clear row. */
    placeholder?: string;
    "aria-label"?: string;
    className?: string;
}) {
    const [open, setOpen] = useState(false);
    const [active, setActive] = useState(-1);
    const rootRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLUListElement>(null);
    const listId = useId();
    const mounted = usePortal();
    // Where the menu sits, in viewport coordinates. Null until it opens.
    const [box, setBox] = useState<{
        left: number;
        top: number;
        width: number;
        flipped: boolean;
    } | null>(null);

    // Rows: the clear row (index 0) then the options, so keyboard indexing is
    // one flat list rather than two special cases.
    const rows: { value: V | null; label: string }[] = [
        { value: null, label: placeholder },
        ...options,
    ];
    const selectedIndex = rows.findIndex((r) => r.value === value);
    const selected = selectedIndex >= 0 ? rows[selectedIndex] : rows[0];

    const close = useCallback(() => {
        setOpen(false);
        setActive(-1);
    }, []);

    /** Measure the trigger and decide which side the menu opens on. */
    const place = useCallback(() => {
        const trigger = rootRef.current?.getBoundingClientRect();
        if (!trigger) return;
        const height = listRef.current?.offsetHeight ?? 0;
        const below = window.innerHeight - trigger.bottom;
        // Flip only when it genuinely does not fit below AND there is more room
        // above: flipping into an even tighter gap helps nobody.
        const flipped = height > 0 && below < height + GAP && trigger.top > below;
        // Keep it on screen horizontally too: a menu wider than its trigger
        // (a long category name) can otherwise hang off the right edge.
        const width = Math.max(trigger.width, listRef.current?.offsetWidth ?? 0);
        const left = Math.min(Math.max(EDGE, trigger.left), window.innerWidth - width - EDGE);
        setBox({
            left: Number.isFinite(left) ? left : trigger.left,
            top: flipped ? trigger.top - GAP : trigger.bottom + GAP,
            width: trigger.width,
            flipped,
        });
    }, []);

    // Place before paint so the menu never appears in the wrong spot first.
    useLayoutEffect(() => {
        if (open) place();
        else setBox(null);
    }, [open, place]);

    // Re-place while open: any ancestor scrolling moves the trigger, and a
    // fixed menu would otherwise stay behind. Capture catches scrolls on inner
    // containers, not just the window.
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

    // Click-outside closes. `pointerdown`, not `click`: a click that starts
    // inside and ends outside should not count as outside. The menu is in a
    // portal, so it is not inside `rootRef` — it has to be checked too, or
    // choosing an option would close the menu before the click landed.
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

    function openAt(index: number) {
        setOpen(true);
        setActive(index >= 0 ? index : 0);
    }

    function commit(index: number) {
        onChange(rows[index].value);
        close();
    }

    function onKeyDown(e: KeyboardEvent) {
        if (!open) {
            if (["Enter", " ", "ArrowDown", "ArrowUp"].includes(e.key)) {
                e.preventDefault();
                openAt(selectedIndex);
            }
            return;
        }
        if (e.key === "Escape") {
            e.preventDefault();
            close();
        } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            const dir = e.key === "ArrowDown" ? 1 : -1;
            setActive((a) => (a + dir + rows.length) % rows.length);
        } else if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (active >= 0) commit(active);
        } else if (e.key === "Tab") {
            close();
        }
    }

    return (
        <div ref={rootRef} className={cn("relative", className)}>
            <button
                type="button"
                role="combobox"
                aria-expanded={open}
                aria-haspopup="listbox"
                aria-controls={open ? listId : undefined}
                aria-label={ariaLabel}
                onClick={() => (open ? close() : openAt(selectedIndex))}
                onKeyDown={onKeyDown}
                className={cn(
                    "transition-colors duration-100",
                    variant === "field" && [
                        "inline-flex h-9 w-full items-center justify-between gap-2 rounded-control",
                        "border border-mist bg-paper px-3.5 text-body-sm hover:border-muted",
                        value !== null ? "text-ink" : "text-graphite",
                        open && "border-muted",
                    ],
                    variant === "quiet" && [
                        "inline-flex max-w-full items-center gap-1 rounded-[4px] text-body-sm",
                        value !== null ? "text-graphite hover:text-ink" : "text-ash hover:text-ink",
                        open && "text-ink",
                    ]
                )}
            >
                <span className="truncate">{selected.label}</span>
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
                <ul
                    ref={listRef}
                    id={listId}
                    role="listbox"
                    aria-label={ariaLabel}
                    style={{
                        left: box?.left ?? 0,
                        top: box?.top ?? 0,
                        minWidth: box?.width,
                        // Measured before paint, but the very first frame has
                        // no height yet: keep it invisible rather than let it
                        // flash in the unflipped position.
                        visibility: box ? "visible" : "hidden",
                        transform: box?.flipped ? "translateY(-100%)" : undefined,
                        maxHeight: MAX_MENU_HEIGHT,
                    }}
                    className={cn(
                        "fixed z-modal overflow-y-auto",
                        "rounded-card border border-mist bg-paper py-1 shadow-card"
                    )}
                >
                    {rows.map((row, i) => {
                        const isSelected = row.value === value;
                        return (
                            <li
                                key={row.value ?? "__clear"}
                                role="option"
                                aria-selected={isSelected}
                                onPointerEnter={() => setActive(i)}
                                onClick={() => commit(i)}
                                className={cn(
                                    "flex cursor-pointer items-center justify-between gap-3",
                                    "whitespace-nowrap px-3.5 py-2 text-body-sm",
                                    row.value === null ? "text-graphite" : "text-ink",
                                    active === i && "bg-fog"
                                )}
                            >
                                {row.label}
                                {isSelected && (
                                    <Check size={14} aria-hidden className="text-signal" />
                                )}
                            </li>
                        );
                    })}
                </ul>,
                    document.body
                )}
        </div>
    );
}

/** Space between trigger and menu. */
const GAP = 8;
/** Minimum breathing room from the viewport edges. */
const EDGE = 8;
/** A menu taller than this scrolls instead of running off the screen. */
const MAX_MENU_HEIGHT = 320;
