"use client";

import { useEffect, type RefObject } from "react";

const FOCUSABLE = [
    "a[href]",
    "button:not([disabled])",
    "input:not([disabled])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    "[tabindex]:not([tabindex='-1'])",
].join(",");

/**
 * The three things every overlay has to get right and every hand-rolled one
 * gets wrong: Escape closes it, Tab cannot leave it, and the page behind it
 * does not scroll.
 */
export function useOverlay(
    open: boolean,
    onClose: () => void,
    panelRef: RefObject<HTMLElement>
) {
    // Scroll lock. Padding compensates for the scrollbar so the page behind
    // doesn't shift sideways the moment the overlay opens.
    useEffect(() => {
        if (!open) return;
        const { body, documentElement } = document;
        const gap = window.innerWidth - documentElement.clientWidth;
        const prevOverflow = body.style.overflow;
        const prevPad = body.style.paddingRight;
        body.style.overflow = "hidden";
        if (gap > 0) body.style.paddingRight = `${gap}px`;
        return () => {
            body.style.overflow = prevOverflow;
            body.style.paddingRight = prevPad;
        };
    }, [open]);

    // Escape, focus trap, and focus restoration.
    useEffect(() => {
        if (!open) return;
        const previouslyFocused = document.activeElement as HTMLElement | null;

        const panel = panelRef.current;
        const first = panel?.querySelector<HTMLElement>(FOCUSABLE);
        (first ?? panel)?.focus();

        function onKeyDown(e: KeyboardEvent) {
            if (e.key === "Escape") {
                e.stopPropagation();
                onClose();
                return;
            }
            if (e.key !== "Tab" || !panelRef.current) return;

            const nodes = Array.from(
                panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)
            ).filter((n) => n.offsetParent !== null);
            if (nodes.length === 0) {
                e.preventDefault();
                return;
            }
            const firstNode = nodes[0];
            const lastNode = nodes[nodes.length - 1];
            const active = document.activeElement;

            if (e.shiftKey && (active === firstNode || !panelRef.current.contains(active))) {
                e.preventDefault();
                lastNode.focus();
            } else if (!e.shiftKey && active === lastNode) {
                e.preventDefault();
                firstNode.focus();
            }
        }

        document.addEventListener("keydown", onKeyDown, true);
        return () => {
            document.removeEventListener("keydown", onKeyDown, true);
            previouslyFocused?.focus?.();
        };
    }, [open, onClose, panelRef]);
}
