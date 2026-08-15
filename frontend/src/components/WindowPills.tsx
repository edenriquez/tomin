"use client";

import { cn } from "@/lib/cn";
import { WINDOW_LABELS, WINDOW_VOCABULARY, type WindowId } from "@/lib/window";
import { useSettings } from "@/components/settings/SettingsProvider";
import { useEditorMode } from "@/components/settings/usePanelSettings";

/**
 * The time-window filter — and, in editor mode, its own settings, because they
 * are the same row.
 *
 * Reading: the enabled periods, one pill each, click to filter.
 * Editing: the *whole* vocabulary, click to add or remove a period. Excluded
 * ones sit in place, dashed and faded, so adding one back is where removing it
 * was.
 *
 * This is deliberately one row and not a filter plus a settings strip: those
 * showed the same five labels two or three times over, with a different
 * meaning of "selected" in each, which is unreadable. A period is either in
 * your vocabulary or not; the mode says what a click means.
 *
 * There is no "initial period" setting either — the app reopens on the period
 * you were last reading (`lastWindow`), which is the same feature with nothing
 * to configure and no way for it to disagree with what's on screen.
 */
export function WindowPills({
    value,
    onChange,
}: {
    value: WindowId;
    onChange: (id: WindowId) => void;
}) {
    const { settings, update } = useSettings();
    const [editing] = useEditorMode();

    const enabled = WINDOW_VOCABULARY.filter((w) => settings.windows.includes(w));
    const shown = editing ? WINDOW_VOCABULARY : enabled;

    function toggle(id: WindowId) {
        update((prev) => {
            const on = prev.windows.includes(id);
            // The last period cannot be removed — a dashboard with no period is
            // not a state, and normalizeSettings would silently resurrect the
            // defaults, which reads as a glitch.
            if (on && prev.windows.length === 1) return prev;
            return {
                ...prev,
                windows: on ? prev.windows.filter((w) => w !== id) : [...prev.windows, id],
            };
        });
    }

    return (
        <div className="flex min-w-0 items-center gap-3">
            {editing && (
                <span className="hidden shrink-0 text-caption uppercase text-ash sm:inline">
                    Periodos
                </span>
            )}
            <div
                role="group"
                aria-label={editing ? "Periodos visibles" : "Periodo"}
                className="-mx-5 flex max-w-full gap-1 overflow-x-auto px-5 sm:mx-0 sm:px-0"
            >
                {shown.map((id) => {
                    const on = settings.windows.includes(id);
                    const label = WINDOW_LABELS[id];
                    if (!editing) {
                        return (
                            <button
                                key={id}
                                type="button"
                                aria-pressed={id === value}
                                onClick={() => onChange(id)}
                                className={cn(PILL, id === value ? PILL_ON : PILL_OFF)}
                            >
                                {label}
                            </button>
                        );
                    }
                    // In editor mode "pressed" means included, not filtered:
                    // the click adds or removes the period.
                    const last = on && settings.windows.length === 1;
                    return (
                        <button
                            key={id}
                            type="button"
                            aria-pressed={on}
                            aria-label={on ? `Quitar ${label}` : `Agregar ${label}`}
                            disabled={last}
                            onClick={() => toggle(id)}
                            className={cn(
                                PILL,
                                on
                                    ? PILL_OFF
                                    : "border border-dashed border-mist text-ash hover:text-graphite",
                                // The period on screen stays legible while
                                // editing — quietly, in ink, not as the Soot
                                // pill, which here would read as "included".
                                on && id === value && "font-medium text-ink",
                                last && "cursor-not-allowed opacity-60"
                            )}
                        >
                            {label}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

const PILL = "shrink-0 rounded-control px-3 py-1.5 text-body-sm";
// Active is the Soot pill from the reference tab group — dark, not cyan. The
// accent belongs to the upload action.
const PILL_ON = "bg-soot font-medium text-paper";
const PILL_OFF = "border border-mist bg-paper text-graphite hover:text-ink";
