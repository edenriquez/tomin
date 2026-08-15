"use client";

import { cn } from "@/lib/cn";

/**
 * On/off toggle. The track is the one place outside the primary Button where
 * a Signal fill is allowed — a switch that is "on" is exactly the "switched
 * on" reading the accent exists for.
 */
export function Switch({
    checked,
    onChange,
    disabled = false,
    "aria-label": ariaLabel,
    className,
}: {
    checked: boolean;
    onChange: (checked: boolean) => void;
    disabled?: boolean;
    "aria-label"?: string;
    className?: string;
}) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={ariaLabel}
            disabled={disabled}
            onClick={() => onChange(!checked)}
            className={cn(
                "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border",
                "transition-colors duration-100",
                "disabled:cursor-not-allowed disabled:opacity-50",
                checked ? "border-edge bg-signal" : "border-mist bg-fog",
                className
            )}
        >
            <span
                aria-hidden
                className={cn(
                    "block h-4 w-4 rounded-full bg-paper shadow-subtle",
                    "transition-transform duration-100",
                    checked ? "translate-x-[18px]" : "translate-x-0.5"
                )}
            />
        </button>
    );
}
