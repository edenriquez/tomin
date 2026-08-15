"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/cn";
import { useEditorMode } from "./usePanelSettings";

/**
 * A panel's own controls, shown in place — inside the card they configure,
 * next to the thing they change. Nothing is hidden in a global sheet that the
 * user has to hold in their head while looking at the chart.
 *
 * Nothing renders unless editor mode is on: reading a dashboard is the common
 * case, tuning it is the rare one, and a permanent row of switches above every
 * chart is exactly the intrusion editor mode exists to avoid. When it is on,
 * the strip appears expanded — one toggle up top, no per-card second click.
 */
export function PanelControls({
    children,
    className,
}: {
    children: ReactNode;
    className?: string;
}) {
    const [editing] = useEditorMode();
    if (!editing) return null;

    return (
        <div
            className={cn(
                // Fog against the card's Paper: reads as a tool surface laid on
                // the panel rather than as part of its content.
                "animate-reveal mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-control",
                "border border-dashed border-mist bg-fog px-3.5 py-2.5",
                className
            )}
        >
            <span className="inline-flex items-center gap-1.5 text-caption font-medium uppercase text-ash">
                <SlidersHorizontal size={12} aria-hidden />
                Ajustes
            </span>
            {children}
        </div>
    );
}

/**
 * One labelled control inside a `PanelControls` strip. The label is the
 * accessible name of whatever it wraps, so controls pass `aria-label` too —
 * the strip is not a form and these are not `<label for>` pairs.
 */
export function PanelControl({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="flex items-center gap-2">
            <span className="text-body-sm text-graphite">{label}</span>
            {children}
        </div>
    );
}

/**
 * A segmented choice for panel settings — the window pills at control size.
 * Used instead of `Select` when the options are few and always valid: `Select`
 * carries a clear row, and "no chart" is not a state.
 */
export function PanelChoice<V extends string | number>({
    label,
    value,
    options,
    onChange,
}: {
    label: string;
    value: V;
    options: { value: V; label: string }[];
    onChange: (value: V) => void;
}) {
    return (
        <div role="group" aria-label={label} className="flex items-center gap-2">
            <span className="text-body-sm text-graphite">{label}</span>
            <div className="flex gap-1">
                {options.map((o) => (
                    <ControlPill
                        key={String(o.value)}
                        label={o.label}
                        active={o.value === value}
                        onClick={() => onChange(o.value)}
                    />
                ))}
            </div>
        </div>
    );
}

/** The pill shared by every segmented control in a settings strip. */
function ControlPill({
    label,
    active,
    onClick,
}: {
    label: string;
    active: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            aria-pressed={active}
            onClick={onClick}
            className={cn(
                "rounded-control px-2.5 py-1 text-body-sm",
                active
                    ? "bg-soot font-medium text-paper"
                    : "border border-mist bg-paper text-graphite hover:text-ink"
            )}
        >
            {label}
        </button>
    );
}

/**
 * A number setting: one field, showing the number it is set to.
 *
 * It had shortcut presets (25/50/100) beside it, and that was the period-row
 * mistake in miniature — three buttons and a field are four ways to state one
 * value, and the reader has to work out which one is currently true. One
 * control, always populated, is both simpler and more explicit: the number on
 * screen *is* the setting.
 *
 * It is styled as a proper bordered field, matching the search input in the
 * same card, because looking like a field is what tells the user it can be
 * typed into. The unit sits outside it as plain text, so the value stays a
 * value ("50", not "50 filas") and the field can be selected and replaced.
 *
 * Committing on Enter and on blur, never per keystroke — every commit writes
 * to the store and re-renders the panel, and "1" on the way to "100" must not
 * repaginate the list under the user's hands. Escape abandons the draft.
 * Garbage (empty, non-numeric) reverts rather than clamping to `min`, which
 * would look like the app inventing a number. Stepping with the arrow keys
 * works and commits on blur, so ±1 needs no buttons of its own.
 */
export function PanelNumber({
    label,
    value,
    min,
    max,
    onChange,
    unit,
}: {
    label: string;
    value: number;
    min: number;
    max: number;
    onChange: (value: number) => void;
    /** Plain-text suffix after the field, e.g. "filas". Also part of its
     *  accessible name, which the visible label alone doesn't carry. */
    unit?: string;
}) {
    const [draft, setDraft] = useState(String(value));

    // Follow the committed value when it changes elsewhere (a reset, another
    // tab writing the same setting) — but only while the field isn't being
    // edited, or it would fight the user's typing.
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
        <div className="flex items-center gap-2">
            <span className="text-body-sm text-graphite">{label}</span>
            <input
                type="number"
                inputMode="numeric"
                min={min}
                max={max}
                value={draft}
                aria-label={unit ? `${label} (${unit})` : label}
                onFocus={(e) => {
                    editing.current = true;
                    // Select on focus: the common edit is replacing the number,
                    // not appending a digit to it.
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
                    // Spinners are a tiny second hit target for what the arrow
                    // keys already do, and they crowd a 64px field.
                    "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none",
                    "[&::-webkit-outer-spin-button]:appearance-none"
                )}
            />
            {unit && (
                <span aria-hidden className="text-body-sm text-graphite">
                    {unit}
                </span>
            )}
        </div>
    );
}
