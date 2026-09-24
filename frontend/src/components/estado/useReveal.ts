"use client";

import { useEffect, useRef, useState } from "react";

/**
 * True once the element has scrolled into view, and never false again: each
 * chart plays its animation the first time it is seen, not on every scroll.
 * Without IntersectionObserver (or with reduced motion, where the CSS has no
 * transitions anyway) it is true from the start.
 */
export function useReveal<T extends Element>() {
    const ref = useRef<T>(null);
    const [seen, setSeen] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el || seen) return;
        if (typeof IntersectionObserver === "undefined") {
            setSeen(true);
            return;
        }
        const io = new IntersectionObserver(
            (entries) => {
                if (entries.some((e) => e.isIntersecting)) {
                    setSeen(true);
                    io.disconnect();
                }
            },
            { threshold: 0.35 }
        );
        io.observe(el);
        return () => io.disconnect();
    }, [seen]);

    return { ref, seen };
}
