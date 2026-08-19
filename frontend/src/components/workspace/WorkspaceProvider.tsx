"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { useWorkstations } from "./useWorkstations";

/**
 * The lens list, owned by the route layout so the sidebar and the detail read
 * the same array.
 *
 * Without this the sidebar and the open workstation each fetch their own copy,
 * and renaming one updates the title while the sidebar keeps the old name until
 * a reload — the kind of disagreement that makes a user distrust everything
 * else on screen.
 *
 * The creation state is here for a related reason: "Nuevo análisis" appears
 * twice (the desktop rail, and the list page below `lg`) and the starters on
 * the empty state are a third entry point, while there is only ever one editor
 * sheet. Two copies of the open flag would eventually disagree about which one
 * is showing.
 */

type Creation = {
    /** Prefills the "what do you want to isolate?" field. A starter that opened
     *  a blank builder would be a label with nothing behind it. */
    seed: string;
};

type WorkspaceData = ReturnType<typeof useWorkstations> & {
    creation: Creation | null;
    startCreating: (seed?: string) => void;
    stopCreating: () => void;
};

const WorkspaceContext = createContext<WorkspaceData | null>(null);

export function useWorkspace(): WorkspaceData {
    const ctx = useContext(WorkspaceContext);
    if (!ctx) throw new Error("useWorkspace must be used inside <WorkspaceProvider>");
    return ctx;
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
    const workstations = useWorkstations();
    const [creation, setCreation] = useState<Creation | null>(null);

    const startCreating = useCallback((seed = "") => setCreation({ seed }), []);
    const stopCreating = useCallback(() => setCreation(null), []);

    const value = useMemo<WorkspaceData>(
        () => ({ ...workstations, creation, startCreating, stopCreating }),
        [workstations, creation, startCreating, stopCreating]
    );

    return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}
