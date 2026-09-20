"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";
import { useOverlay } from "@/components/ui/useOverlay";
import { usePortal } from "@/components/ui/usePortal";
import { PagosView } from "./PagosView";

type Phase = "enter" | "open" | "leave";

/** How long the leave animation runs before the panel is unmounted. Must match
 *  `pagos-modal-out` in globals.css: cut it short and the modal blinks out. */
const LEAVE_MS = 190;
const REDUCED_LEAVE_MS = 60;

function prefersReducedMotion(): boolean {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Pagos, over whatever you were reading.
 *
 * It used to be a room of its own at `/pagos`, and that was the problem: the
 * bell took you out of the reading you were in — por categoría, cargos
 * recurrentes — and left you somewhere with no way back but the browser. What
 * is due next is a glance, not a destination, so it opens on top and closes
 * onto exactly the page you left.
 *
 * The motion says the same thing the structure does. The panel grows out of
 * the top-right corner, where the bell is, and collapses back into it — an
 * overlay that appears from where the finger landed reads as that control
 * opening rather than a new window arriving. Closing is animated too, which
 * means the panel outlives `open` by one beat: `render` holds it on screen
 * while `phase` runs it out.
 */
export function PagosModal({ open, onClose }: { open: boolean; onClose: () => void }) {
    const panelRef = useRef<HTMLDivElement>(null);
    const mounted = usePortal();
    const [render, setRender] = useState(false);
    const [phase, setPhase] = useState<Phase>("enter");

    useOverlay(open, onClose, panelRef);

    if (open && !render) {
        setRender(true);
        setPhase("enter");
    }

    useLayoutEffect(() => {
        if (!render) return;
        if (open) {
            if (prefersReducedMotion()) {
                setPhase("open");
                return;
            }
            // The resting pose is taken over from the keyframes once they are
            // done, so a re-render mid-animation cannot snap the panel.
            const settle = window.setTimeout(() => setPhase("open"), 300);
            return () => window.clearTimeout(settle);
        }
        setPhase("leave");
        const gone = window.setTimeout(
            () => setRender(false),
            prefersReducedMotion() ? REDUCED_LEAVE_MS : LEAVE_MS
        );
        return () => window.clearTimeout(gone);
    }, [open, render]);

    if (!mounted || !render) return null;

    return createPortal(
        <div className="fixed inset-0 z-modal flex items-center justify-center p-0 sm:p-6">
            <div
                onClick={onClose}
                aria-hidden
                className={cn(
                    "pagos-modal-scrim absolute inset-0 bg-soot/40",
                    phase === "enter" && "modal-enter",
                    phase === "leave" && "modal-leave",
                    phase === "open" && "is-open"
                )}
            />
            <div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-label="Pagos"
                tabIndex={-1}
                className={cn(
                    "pagos-modal-panel relative flex h-dvh w-full flex-col overflow-hidden",
                    "bg-canvas outline-none sm:h-auto sm:max-h-[90dvh] sm:max-w-[min(820px,94vw)]",
                    "sm:rounded-panel sm:border sm:border-mist sm:shadow-float",
                    phase === "enter" && "modal-enter",
                    phase === "leave" && "modal-leave",
                    phase === "open" && "is-open"
                )}
            >
                <header className="flex shrink-0 items-center justify-between gap-4 border-b border-mist bg-paper px-5 py-4 sm:px-6">
                    <h2 className="min-w-0 text-title-sm font-normal text-ink">Pagos</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Cerrar"
                        className="-mr-1 shrink-0 rounded-control p-1 text-graphite transition-colors duration-100 hover:bg-fog hover:text-ink"
                    >
                        <X size={18} />
                    </button>
                </header>

                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
                    <PagosView />
                </div>
            </div>
        </div>,
        document.body
    );
}
