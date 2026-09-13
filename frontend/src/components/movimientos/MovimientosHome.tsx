"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { track } from "@/lib/telemetry";
import { useFace } from "@/lib/useFace";
import { RecurrentesView } from "@/components/recurrentes/RecurrentesView";
import { PorCategoriaView } from "./PorCategoriaView";

export const FACES = ["categoria", "recurrentes"] as const;
export type MovimientosFace = (typeof FACES)[number];

const FACE_LABELS: Record<MovimientosFace, string> = {
    categoria: "Por categoría",
    recurrentes: "Cargos recurrentes",
};

export function faceFromParam(value: string | null): MovimientosFace {
    return value === "recurrentes" ? "recurrentes" : "categoria";
}

export function movimientosHref(face: MovimientosFace): string {
    return face === "categoria" ? "/" : "/?cara=recurrentes";
}

/**
 * How long the reading on screen is held while the face being opened fetches.
 * Under this, the switch lands as one clean swap; over it, the new face shows
 * its skeletons rather than leaving a tab that looks dead.
 */
const REVEAL_GRACE_MS = 400;

/**
 * The unified Movimientos reading. Lista is the modal; these two faces
 * understand and act on the same set.
 *
 * Switching faces is a swap — not a navigation, and not a remount:
 * - the face is state mirrored into `?cara=` (see `useFace`). It used to be
 *   `router.replace()`, which is a real navigation: an RSC round trip before
 *   anything moved, then the page subtree replaced, every fetch under it
 *   restarted and the layout bouncing on the way back up;
 * - a face that has been read once stays mounted behind the other, so coming
 *   back is instant, refetches nothing, and keeps its open group and criterios;
 * - the first time a face is opened it has no data yet, and skeletons are never
 *   the height of what they become. So the reading already on screen is held
 *   for a beat while the new one loads behind it; only if it is slow do its
 *   skeletons show, and then they are clipped to the height the page already
 *   had, so the page changes size once — when the real content lands — instead
 *   of twice.
 */
export function MovimientosHome() {
    const [face, setFace] = useFace(faceFromParam, movimientosHref);
    /** The face actually on screen. Trails `face` only while it loads. */
    const [shown, setShown] = useState<MovimientosFace>(face);
    const [mounted, setMounted] = useState<MovimientosFace[]>([face]);
    /** The height the reading had when a slow face took the screen. */
    const [held, setHeld] = useState<number | null>(null);
    const hostRef = useRef<HTMLDivElement>(null);
    const settled = useRef<Record<MovimientosFace, boolean>>({
        categoria: false,
        recurrentes: false,
    });
    const faceRef = useRef(face);
    faceRef.current = face;

    useEffect(() => {
        track("movimientos.face", { face, source: "arrive" });
    }, [face]);

    // Mount the chosen face so it can start fetching — it may have been chosen
    // by a link or the back button, not only by the tabs.
    useEffect(() => {
        setMounted((cur) => (cur.includes(face) ? cur : [...cur, face]));
    }, [face]);

    // Reveal it: at once when it has data already, otherwise after the grace.
    useEffect(() => {
        if (shown === face) return;
        if (settled.current[face]) {
            setShown(face);
            return;
        }
        const t = setTimeout(() => {
            setHeld(hostRef.current?.offsetHeight ?? null);
            setShown(face);
        }, REVEAL_GRACE_MS);
        return () => clearTimeout(t);
    }, [face, shown]);

    /** Each face says when it stops waiting on data. */
    const report = useCallback((of: MovimientosFace, loading: boolean) => {
        settled.current[of] = !loading;
        if (loading || of !== faceRef.current) return;
        setShown(of);
        setHeld(null);
    }, []);
    const reportCategoria = useCallback((l: boolean) => report("categoria", l), [report]);
    const reportRecurrentes = useCallback((l: boolean) => report("recurrentes", l), [report]);

    function pick(next: MovimientosFace) {
        if (next === face) return;
        track("movimientos.face", { face: next, source: "switch" });
        setFace(next);
    }

    const tabs = (
        <div
            role="tablist"
            aria-label="Cara de movimientos"
            className="inline-flex rounded-control border border-mist bg-fog p-0.5"
        >
            {FACES.map((f) => {
                const selected = f === face;
                return (
                    <button
                        key={f}
                        type="button"
                        role="tab"
                        aria-selected={selected}
                        onClick={() => pick(f)}
                        className={cn(
                            "h-8 rounded-control px-3.5 text-body-sm transition-colors duration-100",
                            selected
                                ? "bg-soot font-medium text-paper"
                                : "text-graphite hover:text-ink"
                        )}
                    >
                        {FACE_LABELS[f]}
                    </button>
                );
            })}
        </div>
    );

    // No `space-y` on the host: the face waiting behind is still a child, and a
    // `display:none` sibling would leave its gap above the visible one. Each
    // face spaces its own cards.
    return (
        <div
            ref={hostRef}
            aria-busy={shown !== face}
            style={held !== null ? { height: held, overflow: "hidden" } : undefined}
        >
            {mounted.map((f) => (
                <div key={f} hidden={f !== shown}>
                    {f === "categoria" ? (
                        <PorCategoriaView tabs={tabs} onLoadingChange={reportCategoria} />
                    ) : (
                        <RecurrentesView tabs={tabs} onLoadingChange={reportRecurrentes} />
                    )}
                </div>
            ))}
        </div>
    );
}
