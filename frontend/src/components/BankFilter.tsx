"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Landmark } from "lucide-react";
import { cn } from "@/lib/cn";
import type { BankScope } from "@/lib/banks";

/**
 * The global bank scope, in the shell — it travels with the user across every
 * tab, because "which accounts am I looking at" is a property of the session,
 * not of one view. A pill that names its state ("Todos", "Nu", "2 bancos")
 * opening a checklist; empty selection = todas, so there is no way to filter
 * yourself into a blank app.
 */
export function BankFilter({ scope }: { scope: BankScope }) {
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        function onPointerDown(e: PointerEvent) {
            if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
        }
        function onKey(e: KeyboardEvent) {
            if (e.key === "Escape") setOpen(false);
        }
        document.addEventListener("pointerdown", onPointerDown);
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("pointerdown", onPointerDown);
            document.removeEventListener("keydown", onKey);
        };
    }, [open]);

    // One bank total is not a choice; the control would be furniture.
    if (scope.available.length < 2) return null;

    const label =
        scope.selected.length === 0
            ? "Todos los bancos"
            : scope.selected.length === 1
              ? scope.selected[0]
              : `${scope.selected.length} bancos`;

    function toggle(bank: string) {
        scope.setSelected(
            scope.selected.includes(bank)
                ? scope.selected.filter((b) => b !== bank)
                : [...scope.selected, bank]
        );
    }

    return (
        <div ref={rootRef} className="relative">
            <button
                type="button"
                aria-haspopup="listbox"
                aria-expanded={open}
                onClick={() => setOpen((v) => !v)}
                className={cn(
                    "inline-flex h-9 items-center gap-2 rounded-control border px-3 text-body",
                    "transition-colors duration-100",
                    scope.selected.length
                        ? "border-edge bg-wash/40 text-ink"
                        : "border-mist text-graphite hover:bg-paper hover:text-ink"
                )}
            >
                <Landmark size={15} aria-hidden />
                <span className="hidden max-w-40 truncate sm:inline">{label}</span>
                <ChevronDown
                    size={13}
                    aria-hidden
                    className={cn("transition-transform duration-100", open && "rotate-180")}
                />
            </button>

            {open && (
                <ul
                    role="listbox"
                    aria-label="Bancos"
                    aria-multiselectable
                    className={cn(
                        "absolute right-0 z-modal mt-2 min-w-48 overflow-hidden",
                        "animate-reveal rounded-card border border-mist bg-paper py-1 shadow-card"
                    )}
                >
                    <li
                        role="option"
                        aria-selected={scope.selected.length === 0}
                        onClick={() => scope.setSelected([])}
                        className={cn(
                            "flex cursor-pointer items-center justify-between gap-3 px-3.5 py-2",
                            "text-body-sm",
                            scope.selected.length === 0 ? "text-ink" : "text-graphite hover:bg-fog"
                        )}
                    >
                        Todos
                        {scope.selected.length === 0 && (
                            <Check size={14} aria-hidden className="text-signal" />
                        )}
                    </li>
                    {scope.available.map((bank) => {
                        const on = scope.selected.includes(bank);
                        return (
                            <li
                                key={bank}
                                role="option"
                                aria-selected={on}
                                onClick={() => toggle(bank)}
                                className={cn(
                                    "flex cursor-pointer items-center justify-between gap-3",
                                    "px-3.5 py-2 text-body-sm hover:bg-fog",
                                    on ? "text-ink" : "text-graphite"
                                )}
                            >
                                {bank}
                                {on && <Check size={14} aria-hidden className="text-signal" />}
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}
