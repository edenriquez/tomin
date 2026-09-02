"use client";

import {
    useLayoutEffect,
    useRef,
    useState,
    type AnimationEvent,
    type PointerEvent as ReactPointerEvent,
    type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";
import { useOverlay } from "./useOverlay";
import { usePortal } from "./usePortal";

const ENTER_MS = 320;
const LEAVE_MS = 240;
const DISMISS_PX = 96;
const DISMISS_VELOCITY = 0.7;
const COMMIT_PX = 8;

type Phase = "enter" | "open" | "leave";

/**
 * A surface that comes up from the bottom of the viewport. Drag the handle
 * (or the sheet itself, when scrolled to the top) downward to dismiss — the
 * same close as the dimmed page and Escape.
 */
export function BottomSheet({
    open,
    onClose,
    title,
    children,
}: {
    open: boolean;
    onClose: () => void;
    title: string;
    children: ReactNode;
}) {
    const panelRef = useRef<HTMLDivElement>(null);
    const scrimRef = useRef<HTMLDivElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const handleRef = useRef<HTMLDivElement>(null);
    const mounted = usePortal();

    const [render, setRender] = useState(false);
    const [phase, setPhase] = useState<Phase>("enter");
    const [dragging, setDragging] = useState(false);

    if (open && !render) {
        setRender(true);
        setPhase("enter");
    }

    useOverlay(render, onClose, panelRef);

    useLayoutEffect(() => {
        if (!render) return;

        if (open) {
            const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
            if (reduce) {
                setPhase("open");
                return;
            }
            // If the animation clock is frozen (background tab), still land
            // on-screen rather than staying translated off the viewport.
            const force = window.setTimeout(() => setPhase("open"), ENTER_MS + 40);
            return () => window.clearTimeout(force);
        }

        setPhase("leave");
        setDragging(false);
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const ms = reduce ? 80 : LEAVE_MS;
        const t = window.setTimeout(() => setRender(false), ms);
        return () => window.clearTimeout(t);
    }, [open, render]);

    function onPanelAnimationEnd(e: AnimationEvent<HTMLDivElement>) {
        if (e.target !== e.currentTarget) return;
        if (open && phase === "enter") setPhase("open");
    }

    const drag = useRef<{
        pointerId: number;
        startY: number;
        lastY: number;
        lastT: number;
        fromHandle: boolean;
        committed: boolean;
    } | null>(null);

    function capture(el: HTMLDivElement, pointerId: number) {
        try {
            el.setPointerCapture(pointerId);
        } catch {
            /* untrusted pointer events (tests, automation) may reject capture */
        }
    }

    function follow(y: number) {
        const panel = panelRef.current;
        const scrim = scrimRef.current;
        if (panel) panel.style.transform = `translate3d(0, ${y}px, 0)`;
        if (scrim) {
            const h = panel?.offsetHeight || 1;
            scrim.style.opacity = String(Math.max(0, 1 - y / (h * 0.7)));
        }
    }

    function clearFollow() {
        const panel = panelRef.current;
        const scrim = scrimRef.current;
        if (panel) panel.style.transform = "";
        if (scrim) scrim.style.opacity = "";
    }

    function scrolledAwayFromTop(target: EventTarget | null): boolean {
        let el = target instanceof Element ? target : null;
        const root = panelRef.current;
        while (el && el !== root) {
            const style = window.getComputedStyle(el);
            const overflowY = style.overflowY;
            const scrolls =
                overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay";
            if (scrolls && el.scrollHeight > el.clientHeight + 1 && el.scrollTop > 0) {
                return true;
            }
            el = el.parentElement;
        }
        return Boolean(scrollRef.current && scrollRef.current.scrollTop > 0);
    }

    function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
        if (e.pointerType === "mouse" && e.button !== 0) return;
        const fromHandle = Boolean(handleRef.current?.contains(e.target as Node));
        if (!fromHandle && scrolledAwayFromTop(e.target)) return;
        drag.current = {
            pointerId: e.pointerId,
            startY: e.clientY,
            lastY: e.clientY,
            lastT: performance.now(),
            fromHandle,
            committed: fromHandle,
        };
        if (fromHandle) {
            setDragging(true);
            capture(e.currentTarget, e.pointerId);
        }
    }

    function onPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
        const d = drag.current;
        if (!d || d.pointerId !== e.pointerId) return;
        const dy = e.clientY - d.startY;
        if (!d.committed) {
            if (dy < -COMMIT_PX) {
                drag.current = null;
                return;
            }
            if (dy < COMMIT_PX) return;
            d.committed = true;
            setDragging(true);
            capture(e.currentTarget, e.pointerId);
        }
        d.lastY = e.clientY;
        d.lastT = performance.now();
        follow(Math.max(0, dy));
    }

    function onPointerUp(e: ReactPointerEvent<HTMLDivElement>) {
        const d = drag.current;
        if (!d || d.pointerId !== e.pointerId) return;
        const dy = Math.max(0, e.clientY - d.startY);
        const dt = Math.max(1, performance.now() - d.lastT);
        const velocity = (e.clientY - d.lastY) / dt;
        drag.current = null;
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
            e.currentTarget.releasePointerCapture(e.pointerId);
        }
        if (!d.committed) {
            setDragging(false);
            return;
        }
        if (dy > DISMISS_PX || velocity > DISMISS_VELOCITY) {
            onClose();
            return;
        }
        setDragging(false);
        window.requestAnimationFrame(clearFollow);
    }

    if (!mounted || !render) return null;

    return createPortal(
        <div className="fixed inset-0 z-sheet flex items-end justify-center">
            <div
                ref={scrimRef}
                onClick={onClose}
                aria-hidden
                className={cn(
                    "bottom-sheet-scrim absolute inset-0 bg-soot/40",
                    phase === "enter" && "sheet-enter",
                    phase === "open" && "is-open",
                    phase === "leave" && "sheet-leave",
                    dragging && "is-dragging"
                )}
            />
            <div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-label={title}
                tabIndex={-1}
                onAnimationEnd={onPanelAnimationEnd}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                className={cn(
                    "bottom-sheet-panel relative flex w-full max-w-page flex-col bg-paper outline-none",
                    "h-[min(92dvh,100%)] rounded-t-sheet border-t border-mist",
                    "pb-[env(safe-area-inset-bottom)]",
                    phase === "enter" && "sheet-enter",
                    phase === "open" && "is-open",
                    phase === "leave" && "sheet-leave",
                    dragging && "is-dragging"
                )}
            >
                <div
                    ref={handleRef}
                    aria-label="Arrastra hacia abajo para cerrar"
                    className="flex shrink-0 cursor-grab touch-none justify-center py-2.5 active:cursor-grabbing"
                >
                    <span aria-hidden className="block h-1 w-10 rounded-full bg-muted" />
                </div>
                <div
                    ref={scrollRef}
                    className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-6 sm:px-6"
                >
                    {children}
                </div>
            </div>
        </div>,
        document.body
    );
}
