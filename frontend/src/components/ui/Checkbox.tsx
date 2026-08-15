"use client";

import { Check, Minus } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * A checkbox for choosing rows — square, unlike the Switch, because it selects
 * rather than turns on. `indeterminate` is the header state when some but not
 * all rows are picked; it is a real ARIA value ("mixed"), not a third look.
 */
export function Checkbox({
    checked,
    indeterminate = false,
    onChange,
    "aria-label": ariaLabel,
    className,
}: {
    checked: boolean;
    indeterminate?: boolean;
    onChange: (checked: boolean) => void;
    "aria-label"?: string;
    className?: string;
}) {
    const on = checked || indeterminate;
    return (
        <button
            type="button"
            role="checkbox"
            aria-checked={indeterminate ? "mixed" : checked}
            aria-label={ariaLabel}
            onClick={() => onChange(!checked)}
            className={cn(
                "inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border",
                "transition-colors duration-100",
                on ? "border-edge bg-signal text-ink" : "border-muted bg-paper hover:border-ash",
                className
            )}
        >
            {indeterminate ? (
                <Minus size={11} strokeWidth={3} aria-hidden />
            ) : checked ? (
                <Check size={11} strokeWidth={3} aria-hidden />
            ) : null}
        </button>
    );
}
