"use client";

import { useCallback, useMemo, useRef } from "react";
import {
    resolvePanelConfig,
    withPanelConfig,
    type PanelConfig,
    type WidenConfig,
} from "@/lib/settings";
import { useSettings } from "./SettingsProvider";

/**
 * A panel's own settings, persisted under `panelId` and scoped to it.
 *
 * The component declaring the defaults is the only place that knows the shape
 * of its config — nothing central lists panels or their keys, so adding a
 * control is a one-file change:
 *
 *     const [cfg, setCfg] = usePanelSettings("movimientos.scatter", {
 *         showIncome: false,
 *     });
 *
 * Config survives unmounting, window changes and reloads, because it lives in
 * the same store as every other preference.
 */
export function usePanelSettings<T extends PanelConfig>(
    panelId: string,
    defaults: T
): [WidenConfig<T>, (patch: Partial<WidenConfig<T>>) => void] {
    const { settings, update } = useSettings();

    // Defaults are a component constant, but callers write them inline, so the
    // object identity changes every render. Freeze the first one: re-reading a
    // fresh literal each render would invalidate the memo below forever.
    const defaultsRef = useRef(defaults);

    const stored = settings.panels[panelId];
    const config = useMemo(
        () => resolvePanelConfig(stored, defaultsRef.current) as WidenConfig<T>,
        [stored]
    );

    const set = useCallback(
        (patch: Partial<WidenConfig<T>>) => {
            update((prev) => withPanelConfig(prev, panelId, patch as PanelConfig));
        },
        [update, panelId]
    );

    return [config, set];
}

/** Whether panels should reveal their controls, and how to flip that. */
export function useEditorMode(): [boolean, (on: boolean) => void] {
    const { settings, update } = useSettings();
    const set = useCallback(
        (on: boolean) => update((prev) => ({ ...prev, editorMode: on })),
        [update]
    );
    return [settings.editorMode, set];
}
