"use client";

import { useEffect, useState } from "react";
import type { WindowId } from "@/lib/window";
import { useSettings } from "@/components/settings/SettingsProvider";

/**
 * The selected time window for a view, synced with `settings.lastWindow`.
 *
 * The stored period applies exactly once, when the settings arrive; after
 * that the session's own navigation wins. Choosing a period is also the act
 * of setting where the app opens next time — there is no separate "initial
 * period" preference to keep in sync. Shared by every view that carries the
 * window pills, so switching tabs keeps the same span of time underfoot.
 */
export function useWindowSelection(): [WindowId, (id: WindowId) => void] {
    const { settings, hydrated, update } = useSettings();
    const [windowId, setWindowId] = useState<WindowId | null>(null);

    useEffect(() => {
        if (!hydrated) return;
        setWindowId((w) => w ?? settings.lastWindow);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hydrated]);

    function select(id: WindowId) {
        setWindowId(id);
        update((prev) => ({ ...prev, lastWindow: id }));
    }

    // If editor mode removes the period being read, fall back to the stored
    // one (itself normalized into `windows`) rather than filtering by a pill
    // that no longer exists.
    const active: WindowId =
        windowId && settings.windows.includes(windowId) ? windowId : settings.lastWindow;

    return [active, select];
}
