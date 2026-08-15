"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

/**
 * A number input that commits deliberately.
 *
 * Committing on Enter and on blur — never per keystroke — is the whole point:
 * these fields drive re-renders of charts and lists, and "1" on the way to
 * "100" must not repaginate or re-project anything. Escape abandons the draft.
 * Garbage (empty, non-numeric) reverts rather than clamping to `min`, which
 * would look like the app inventing a number. Arrow keys step and commit on
 * blur, so ±1 needs no buttons of its own.
 */
export function NumberField({
    value,
    min,
    max,
    onChange,
    "aria-label": ariaLabel,
    className,
}: {
    value: number;
    min: number;
    max: number;
    onChange: (value: number) => void;
    "aria-label"?: string;
    className?: string;
}) {
    const [draft, setDraft] = useState(String(value));

    // Follow the committed value when it changes elsewhere — but only while
    // the field isn't focused, or it would fight the user's typing.
    const editing = useRef(false);
    useEffect(() => {
        if (!editing.current) setDraft(String(value));
    }, [value]);

    function commit() {
        const n = Number(draft.trim());
        if (!draft.trim() || !Number.isFinite(n)) {
            setDraft(String(value));
            return;
        }
        const next = Math.min(max, Math.max(min, Math.round(n)));
        setDraft(String(next));
        if (next !== value) onChange(next);
    }

    return (
        <input
            type="number"
            inputMode="numeric"
            min={min}
            max={max}
            value={draft}
            aria-label={ariaLabel}
            onFocus={(e) => {
                editing.current = true;
                // The common edit is replacing the number, not appending to it.
                e.currentTarget.select();
            }}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => {
                editing.current = false;
                commit();
            }}
            onKeyDown={(e) => {
                if (e.key === "Enter") {
                    e.preventDefault();
                    commit();
                    e.currentTarget.blur();
                } else if (e.key === "Escape") {
                    e.preventDefault();
                    setDraft(String(value));
                    e.currentTarget.blur();
                }
            }}
            className={cn(
                "h-7 w-16 rounded-control border border-mist bg-paper px-2",
                "text-body-sm text-ink tabular-nums",
                "hover:border-muted focus:border-muted",
                // Spinners are a tiny second hit target for what the arrow keys
                // already do, and they crowd a 64px field.
                "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none",
                "[&::-webkit-outer-spin-button]:appearance-none",
                className
            )}
        />
    );
}
