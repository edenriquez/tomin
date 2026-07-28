"use client";

import { useEffect, useState } from "react";

/**
 * `false` until after hydration. Overlays render into `document.body`, which
 * doesn't exist during SSR — without this gate `next build` throws while
 * prerendering any page that can open one.
 */
export function usePortal(): boolean {
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    return mounted;
}
