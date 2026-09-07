"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowDownToLine, ArrowUpFromLine, HardDrive } from "lucide-react";
import { cn } from "@/lib/cn";
import { track } from "@/lib/telemetry";
import { FijosView } from "@/components/fijos/FijosView";
import { PronosticoView } from "@/components/pronostico/PronosticoView";

/**
 * Plan: Fijos and Pronóstico under one roof.
 *
 * They were two tabs that shared everything — the same two API calls, the same
 * pinned set (`useFijos`), the same 6/12-month horizon, the same projection
 * engine — and split one question ("¿me alcanza?") into two halves that could
 * not see each other. Here they are two faces of one view: what leaves, and
 * what comes in against it. The horizon you pick on one face is the horizon
 * of the other, because it always was.
 *
 * The face lives in the URL so a link to "lo que entra" is a link, and the
 * retired `/pronostico` can land on it.
 */
export const FACES = ["fijos", "ingresos"] as const;
export type Face = (typeof FACES)[number];

const FACE_LABELS: Record<Face, { label: string; hint: string }> = {
    fijos: { label: "Lo que se va", hint: "Tus fijos y lo que viene" },
    ingresos: { label: "Lo que entra", hint: "Nómina y extra, contra tus fijos" },
};

export function faceFromParam(value: string | null): Face {
    return value === "ingresos" ? "ingresos" : "fijos";
}

export function planHref(face: Face): string {
    return face === "fijos" ? "/plan" : "/plan?cara=ingresos";
}

export function PlanView() {
    const params = useSearchParams();
    const router = useRouter();
    const face = faceFromParam(params.get("cara"));

    useEffect(() => {
        track("plan.face", { face, source: "arrive" });
    }, [face]);

    function pick(next: Face) {
        if (next === face) return;
        track("plan.face", { face: next, source: "switch" });
        router.replace(planHref(next), { scroll: false });
    }

    return (
        <div className="space-y-4 sm:space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div
                    role="tablist"
                    aria-label="Cara del plan"
                    className="inline-flex rounded-control border border-mist bg-paper p-0.5 shadow-card"
                >
                    {FACES.map((f) => {
                        const selected = f === face;
                        const Icon = f === "fijos" ? ArrowUpFromLine : ArrowDownToLine;
                        return (
                            <button
                                key={f}
                                type="button"
                                role="tab"
                                aria-selected={selected}
                                onClick={() => pick(f)}
                                title={FACE_LABELS[f].hint}
                                className={cn(
                                    "inline-flex h-9 items-center gap-2 rounded-control px-4 text-body",
                                    "transition-colors duration-100",
                                    selected
                                        ? "bg-fog font-medium text-ink ring-1 ring-inset ring-mist"
                                        : "text-graphite hover:text-ink"
                                )}
                            >
                                <Icon size={15} aria-hidden />
                                {FACE_LABELS[f].label}
                            </button>
                        );
                    })}
                </div>

                {/* Said once, quietly: the pins and the income labels are the
                    user's work, and today they live in this browser only. A
                    device change loses them and nothing else in the app would
                    have warned. */}
                <p
                    className="inline-flex items-center gap-1.5 text-label text-ash"
                    title="Los fijos que fijas y los abonos que etiquetas se guardan en este navegador. En otro navegador o celular empiezas de cero."
                >
                    <HardDrive size={12} aria-hidden />
                    Tus fijos y etiquetas se guardan en este navegador
                </p>
            </div>

            {face === "fijos" ? (
                <FijosView onGoToIngresos={() => pick("ingresos")} />
            ) : (
                <PronosticoView onGoToFijos={() => pick("fijos")} />
            )}
        </div>
    );
}
