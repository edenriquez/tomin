"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/cn";

export type MenuItem = {
    label: string;
    onSelect: () => void;
    icon?: ReactNode;
    disabled?: boolean;
    /** Draws a hairline above the item — used to fence "Quitar" off. */
    separated?: boolean;
    danger?: boolean;
};

export type MenuSection = { label?: string; items: MenuItem[] };

/**
 * The `⋯` menu. Hand-rolled rather than a dependency: it is one popover with
 * five items, and the two behaviours that matter — Escape closes, a click
 * outside closes — are eight lines.
 */
export function WidgetMenu({ sections, label = "Opciones" }: { sections: MenuSection[]; label?: string }) {
    const [open, setOpen] = useState(false);
    const root = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const onDown = (e: MouseEvent) => {
            if (!root.current?.contains(e.target as Node)) setOpen(false);
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setOpen(false);
        };
        document.addEventListener("mousedown", onDown);
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("mousedown", onDown);
            document.removeEventListener("keydown", onKey);
        };
    }, [open]);

    const usable = sections.filter((s) => s.items.length > 0);
    if (!usable.length) return null;

    return (
        <div ref={root} className="relative shrink-0">
            <button
                type="button"
                aria-label={label}
                aria-haspopup="menu"
                aria-expanded={open}
                onClick={() => setOpen((v) => !v)}
                className="rounded-control p-1 text-graphite hover:bg-fog hover:text-ink"
            >
                <MoreHorizontal size={18} />
            </button>

            {open && (
                <div
                    role="menu"
                    className={cn(
                        "absolute right-0 top-full z-sheet mt-1 min-w-[180px] rounded-card",
                        "border border-mist bg-paper py-1"
                    )}
                >
                    {usable.map((section, si) => (
                        <div key={si} className={si > 0 ? "mt-1 border-t border-mist pt-1" : ""}>
                            {section.label && (
                                <div className="px-3 py-1 text-label font-medium uppercase text-pewter">
                                    {section.label}
                                </div>
                            )}
                            {section.items.map((item) => (
                                <button
                                    key={item.label}
                                    role="menuitem"
                                    type="button"
                                    disabled={item.disabled}
                                    onClick={() => {
                                        setOpen(false);
                                        item.onSelect();
                                    }}
                                    className={cn(
                                        "flex w-full items-center gap-2 px-3 py-1.5 text-left text-body-sm",
                                        "disabled:cursor-not-allowed disabled:opacity-40",
                                        item.separated && "mt-1 border-t border-mist pt-2",
                                        item.danger
                                            ? "text-negative hover:bg-fog"
                                            : "text-graphite hover:bg-fog hover:text-ink"
                                    )}
                                >
                                    {item.icon}
                                    {item.label}
                                </button>
                            ))}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
