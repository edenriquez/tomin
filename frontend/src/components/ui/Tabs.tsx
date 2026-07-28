"use client";

import { useRef } from "react";
import { cn } from "@/lib/cn";

export type TabItem = { value: string; label: string; disabled?: boolean };

/**
 * Tab list with a 2px Ember underline on the active tab. Arrow keys move
 * between tabs (roving tabindex) — a tab strip you can only reach with the
 * mouse is a keyboard trap for the content behind it.
 */
export function Tabs({
    items,
    value,
    onChange,
    className,
    "aria-label": ariaLabel,
}: {
    items: TabItem[];
    value: string;
    onChange: (value: string) => void;
    className?: string;
    "aria-label"?: string;
}) {
    const listRef = useRef<HTMLDivElement>(null);

    function onKeyDown(e: React.KeyboardEvent) {
        const dir = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
        if (!dir) return;
        e.preventDefault();
        const enabled = items.filter((i) => !i.disabled);
        const at = enabled.findIndex((i) => i.value === value);
        const next = enabled[(at + dir + enabled.length) % enabled.length];
        onChange(next.value);
        const el = listRef.current?.querySelector<HTMLElement>(`[data-value="${next.value}"]`);
        el?.focus();
    }

    return (
        <div
            ref={listRef}
            role="tablist"
            aria-label={ariaLabel}
            onKeyDown={onKeyDown}
            className={cn("flex items-center gap-1 border-b border-mist", className)}
        >
            {items.map((item) => {
                const active = item.value === value;
                return (
                    <button
                        key={item.value}
                        type="button"
                        role="tab"
                        data-value={item.value}
                        aria-selected={active}
                        tabIndex={active ? 0 : -1}
                        disabled={item.disabled}
                        onClick={() => onChange(item.value)}
                        className={cn(
                            "-mb-px border-b-2 px-3 py-2 text-body-sm font-medium",
                            "disabled:cursor-not-allowed disabled:text-steel",
                            active
                                ? "border-ember text-ink"
                                : "border-transparent text-pewter hover:text-ink"
                        )}
                    >
                        {item.label}
                    </button>
                );
            })}
        </div>
    );
}
