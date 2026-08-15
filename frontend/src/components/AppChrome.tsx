"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { resolveWindow, type WindowBounds, type WindowId } from "@/lib/window";
import { SettingsProvider } from "@/components/settings/SettingsProvider";
import { AppShell } from "@/components/AppShell";
import { WindowPills } from "@/components/WindowPills";
import { useWindowSelection } from "@/components/useWindowSelection";

/**
 * The one chassis every route mounts: settings provider, shell, the optional
 * window-pills row, and the upload→refetch counter. Before this, each page
 * assembled the same sandwich by hand — four provider placements, two pills
 * wrappers, and an `Inner` split just to get a hook inside the provider.
 *
 * Views read their inputs through `useAppData()` instead of threading three
 * props from every page.
 */

type AppData = {
    /** Bumped after each upload; views key their fetches on it. */
    dataVersion: number;
    windowId: WindowId;
    bounds: WindowBounds;
};

const AppDataContext = createContext<AppData | null>(null);

export function useAppData(): AppData {
    const ctx = useContext(AppDataContext);
    if (!ctx) throw new Error("useAppData must be used inside <AppChrome>");
    return ctx;
}

export function AppChrome({
    children,
    withWindow = false,
    onDataChanged,
}: {
    children: ReactNode;
    /** Render the period pills. Off for views that read the whole history
     *  (Recurrentes) or manage the archive (Documentos). */
    withWindow?: boolean;
    onDataChanged?: () => void;
}) {
    return (
        <SettingsProvider>
            <Chrome withWindow={withWindow} onDataChanged={onDataChanged}>
                {children}
            </Chrome>
        </SettingsProvider>
    );
}

/** Split so the hooks below run inside the provider. */
function Chrome({
    children,
    withWindow,
    onDataChanged,
}: {
    children: ReactNode;
    withWindow: boolean;
    onDataChanged?: () => void;
}) {
    const [dataVersion, setDataVersion] = useState(0);
    const [windowId, selectWindow] = useWindowSelection();

    const value = useMemo<AppData>(
        () => ({ dataVersion, windowId, bounds: resolveWindow(windowId) }),
        [dataVersion, windowId]
    );

    return (
        <AppShell
            onUploaded={() => {
                setDataVersion((v) => v + 1);
                onDataChanged?.();
            }}
        >
            {withWindow && (
                <div className="flex flex-wrap items-center justify-end gap-4 pb-6">
                    <WindowPills value={windowId} onChange={selectWindow} />
                </div>
            )}
            <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
        </AppShell>
    );
}
