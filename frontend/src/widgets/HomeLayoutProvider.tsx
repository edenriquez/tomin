"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useHomeLayout } from "./useHomeLayout";

type HomeLayout = ReturnType<typeof useHomeLayout>;

const Ctx = createContext<HomeLayout | null>(null);

/**
 * The grid and the picker are two routes — `/inicio` and the intercepted
 * `/inicio/catalogo` — rendered by the same layout as sibling slots. Sharing
 * the layout state through context is what lets ticking a box in the Sheet add
 * a card behind it without a refetch or a round trip through the URL.
 */
export function HomeLayoutProvider({ children }: { children: ReactNode }) {
    return <Ctx.Provider value={useHomeLayout()}>{children}</Ctx.Provider>;
}

export function useHomeLayoutContext(): HomeLayout {
    const value = useContext(Ctx);
    if (!value) {
        throw new Error("useHomeLayoutContext must be used inside <HomeLayoutProvider>.");
    }
    return value;
}
