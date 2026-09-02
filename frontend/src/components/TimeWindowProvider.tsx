"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useSettings } from "@/components/settings/SettingsProvider";
import {
    custom,
    grainForWindow,
    preset,
    resolveTimeWindow,
    spanDays,
    timeWindowKey,
    timeWindowToPeriod,
    type TimeWindow,
    type WindowBounds,
    type WindowId,
} from "@/lib/window";
import type { Period } from "@/lib/metrics";
import { track } from "@/lib/telemetry";

/**
 * The one span of time every view reads through.
 *
 * Mounted once, in the root layout, above every route: navigating from
 * Movimientos to Categorías must not re-resolve or reset the period, and a
 * range dragged on one chart must be the same range the next view opens on.
 * Before this lived here it lived inside `AppChrome`, which every page mounts
 * afresh — the selection survived only by way of a round trip through settings.
 *
 * Two ways to hold it and one value out. A **preset** is a rule ("30 días")
 * that re-resolves each day; a **custom** range is two fixed dates, set from
 * the date picker or by dragging across a chart. Both persist: the preset as
 * `lastWindow`, the dates as `customRange`, so a reload lands where you were
 * and clearing a custom range returns to the preset you were on before it.
 */
type TimeWindowApi = {
    window: TimeWindow;
    /** Changes exactly when the selection does — the dependency to key on. */
    key: string;
    bounds: WindowBounds;
    period: Period;
    grain: "day" | "month";
    selectPreset: (id: WindowId) => void;
    /** `source` says how: the date picker, or a drag on which chart. */
    selectCustom: (start: string, end: string, source?: string) => void;
    /** Back to the preset the user was on before the custom range. */
    clearCustom: () => void;
    /** The day the rolling presets count back from — the newest transaction
     *  on record, not today. ISO local date. */
    anchor: string;
    setAnchor: (iso: string | null) => void;
};

const TimeWindowContext = createContext<TimeWindowApi | null>(null);

export function useTimeWindow(): TimeWindowApi {
    const ctx = useContext(TimeWindowContext);
    if (!ctx) throw new Error("useTimeWindow must be used inside <TimeWindowProvider>");
    return ctx;
}

export function TimeWindowProvider({ children }: { children: ReactNode }) {
    const { settings, hydrated, update } = useSettings();
    const [selection, setSelection] = useState<TimeWindow | null>(null);
    // "15 días" means the last 15 days *of your history*: a ledger whose newest
    // statement is from June has nothing in the calendar's last fortnight and
    // everything in its own. Today is only the fallback for an empty ledger.
    const [anchor, setAnchorState] = useState<string>(() => todayIso());

    // The stored selection applies exactly once, when settings arrive; after
    // that the session's own choices win. Choosing a period is also the act
    // of setting where the app opens next time.
    useEffect(() => {
        if (!hydrated) return;
        setSelection((current) => {
            if (current) return current;
            return settings.customRange
                ? custom(settings.customRange.start, settings.customRange.end)
                : preset(settings.lastWindow);
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hydrated]);

    // If editor mode removes the preset being read, fall back to the stored
    // one (itself normalized into `windows`) rather than reading through a
    // pill that no longer exists. A custom range has no pill to lose.
    const active: TimeWindow = useMemo(() => {
        if (!selection) return preset(settings.lastWindow);
        if (selection.kind === "preset" && !settings.windows.includes(selection.id)) {
            return preset(settings.lastWindow);
        }
        return selection;
    }, [selection, settings.lastWindow, settings.windows]);

    const value = useMemo<TimeWindowApi>(() => {
        const at = fromIso(anchor);
        return {
            window: active,
            // A preset re-resolves when the anchor moves (a new upload), so the
            // key carries it; a custom range is two fixed dates and does not.
            key: active.kind === "preset" ? `${timeWindowKey(active)}@${anchor}` : timeWindowKey(active),
            bounds: resolveTimeWindow(active, at),
            period: timeWindowToPeriod(active, at),
            grain: grainForWindow(active),
            anchor,
            setAnchor(iso) {
                setAnchorState(iso ?? todayIso());
            },
            selectPreset(id) {
                track("window.select", { kind: "preset", id });
                setSelection(preset(id));
                update((prev) => ({ ...prev, lastWindow: id, customRange: null }));
            },
            selectCustom(start, end, source = "picker") {
                const next = custom(start, end);
                track("window.select", { kind: "custom", source, days: spanDays(next.start, next.end) });
                setSelection(next);
                update((prev) => ({ ...prev, customRange: { start: next.start, end: next.end } }));
            },
            clearCustom() {
                track("window.clear_custom");
                setSelection(preset(settings.lastWindow));
                update((prev) => ({ ...prev, customRange: null }));
            },
        };
    }, [active, anchor, settings.lastWindow, update]);

    return <TimeWindowContext.Provider value={value}>{children}</TimeWindowContext.Provider>;
}

function todayIso(): string {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${m}-${day}`;
}

/** Local midnight for a local-date ISO; `new Date("2026-08-26")` would be UTC. */
function fromIso(day: string): Date {
    const [y, m, d] = day.split("-").map(Number);
    return new Date(y, m - 1, d);
}
