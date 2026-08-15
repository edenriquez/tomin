"use client";

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
    type ReactNode,
} from "react";
import {
    DEFAULT_SETTINGS,
    localSettingsStore,
    normalizeSettings,
    type Settings,
    type SettingsStore,
} from "@/lib/settings";

type SettingsApi = {
    settings: Settings;
    /** false until the store has been read. Render defaults + skeletons
     *  before it flips; never trust `settings` for one-shot decisions
     *  (like "which view opens first") until it does. */
    hydrated: boolean;
    update: (fn: (prev: Settings) => Settings) => void;
};

const SettingsContext = createContext<SettingsApi | null>(null);

export function useSettings(): SettingsApi {
    const ctx = useContext(SettingsContext);
    if (!ctx) throw new Error("useSettings must be used inside <SettingsProvider>");
    return ctx;
}

/** Debounce before save. Pointless for localStorage, load-bearing the day
 *  the store becomes an HTTP PUT — and it keeps rapid toggling cheap. */
const SAVE_DELAY_MS = 400;

export function SettingsProvider({
    children,
    store = localSettingsStore,
}: {
    children: ReactNode;
    store?: SettingsStore;
}) {
    // Defaults first, hydrate in an effect: reading localStorage in the
    // useState initializer renders different HTML on server and client and
    // React rightly screams about the mismatch.
    const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
    const [hydrated, setHydrated] = useState(false);
    const dirty = useRef(false);

    useEffect(() => {
        let alive = true;
        store.load().then((stored) => {
            if (!alive) return;
            if (stored) setSettings(stored);
            setHydrated(true);
        });
        return () => {
            alive = false;
        };
    }, [store]);

    const update = useCallback((fn: (prev: Settings) => Settings) => {
        dirty.current = true;
        setSettings((prev) => normalizeSettings(fn(prev)));
    }, []);

    // The dirty gate keeps hydration from echoing a save back at the store.
    useEffect(() => {
        if (!dirty.current) return;
        const id = setTimeout(() => {
            store.save(settings);
        }, SAVE_DELAY_MS);
        return () => clearTimeout(id);
    }, [settings, store]);

    return (
        <SettingsContext.Provider value={{ settings, hydrated, update }}>
            {children}
        </SettingsContext.Provider>
    );
}
