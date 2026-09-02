"use client";

import {
    createContext,
    useCallback,
    useContext,
    useMemo,
    useState,
    type ReactNode,
} from "react";
import { exclusionsEqual, matchingWorkstation } from "@/lib/lectura";
import type { Workstation, WorkstationDraft } from "@/lib/workstations";
import { useWorkspace } from "@/components/workspace/WorkspaceProvider";
import { track } from "@/lib/telemetry";

type LecturaData = {
    workstation: Workstation | null;
    opening: boolean;
    openDraft: (draft: WorkstationDraft) => Promise<Workstation | null>;
    openSaved: (workstation: Workstation) => void;
    close: () => void;
};

const LecturaContext = createContext<LecturaData | null>(null);

export function useLectura(): LecturaData {
    const ctx = useContext(LecturaContext);
    if (!ctx) throw new Error("useLectura must be used inside <LecturaProvider>");
    return ctx;
}

/**
 * The open set, owned above the views so a Lectura started on Movimientos is
 * still the same set after a trip through Fijos, and so the Lecturas list in
 * the header and the panel on the page cannot disagree about which lens is
 * open.
 */
export function LecturaProvider({ children }: { children: ReactNode }) {
    const { items, create, update } = useWorkspace();
    const [workstation, setWorkstation] = useState<Workstation | null>(null);
    const [opening, setOpening] = useState(false);

    const openSaved = useCallback((next: Workstation) => {
        setWorkstation(next);
        track("lectura.open", { source: "saved" });
    }, []);

    const openDraft = useCallback(
        async (draft: WorkstationDraft): Promise<Workstation | null> => {
            const hit = matchingWorkstation(items, draft);
            if (hit) {
                const excluded = draft.excluded_tx_ids ?? [];
                if (!exclusionsEqual(hit.excluded_tx_ids, excluded)) {
                    setOpening(true);
                    try {
                        const patched = await update(hit.id, { excluded_tx_ids: excluded });
                        if (patched) {
                            setWorkstation(patched);
                            track("lectura.open", { source: "reuse" });
                            return patched;
                        }
                    } finally {
                        setOpening(false);
                    }
                }
                setWorkstation(hit);
                track("lectura.open", { source: "reuse" });
                return hit;
            }
            setOpening(true);
            try {
                const created = await create(draft);
                if (created) {
                    setWorkstation(created);
                    track("lectura.open", { source: "create" });
                }
                return created;
            } finally {
                setOpening(false);
            }
        },
        [items, create, update]
    );

    const close = useCallback(() => {
        setWorkstation(null);
        track("lectura.close");
    }, []);

    // If the open lens is patched (exclusions from the dock), keep the session
    // pointing at the copy in the list rather than a stale object.
    const current = useMemo(() => {
        if (!workstation) return null;
        return items?.find((w) => w.id === workstation.id) ?? workstation;
    }, [items, workstation]);

    const value = useMemo<LecturaData>(
        () => ({
            workstation: current,
            opening,
            openDraft,
            openSaved,
            close,
        }),
        [current, opening, openDraft, openSaved, close]
    );

    return <LecturaContext.Provider value={value}>{children}</LecturaContext.Provider>;
}
