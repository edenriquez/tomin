"use client";

import { useEffect, useState } from "react";
import { Flame } from "lucide-react";
import type { UploadResult } from "@/lib/api";
import { track } from "@/lib/telemetry";
import { StatementDropzone } from "@/components/StatementDropzone";
import { ReviewStatement } from "@/components/onboarding/ReviewStatement";

/**
 * The doing page: the visitor already said yes on the landing site, so no
 * sales copy survives here — a short instruction, the dropzone, and the three
 * facts about what happens to the file. Two steps on one screen:
 *
 * 1. upload — the dropzone owns the viewport;
 * 2. review — the OCR shows its work (`ReviewStatement`) before the app opens.
 *
 * Someone who lands here cold (a shared link, a bookmark) gets one quiet way
 * back to the pitch; the pitch itself is not repeated.
 */
const LANDING_URL = process.env.NEXT_PUBLIC_LANDING_URL ?? "http://localhost:3001";

const STEPS = [
    {
        title: "Subes el archivo",
        body: "El PDF de tu banco o el XML del SAT. Tomin nunca pide la contraseña de tu banca en línea; si el PDF trae una, la pide solo para abrirlo y no la guarda.",
    },
    {
        title: "Tomin lo lee y lo desecha",
        body: "Saca los movimientos, los categoriza y desecha el archivo original. Solo quedan tus números.",
    },
    {
        title: "Ves tu dinero",
        body: "Cada movimiento en una gráfica, tus categorías mes a mes y un plan: gastos fijos contra ingresos.",
    },
];

export function Onboarding({
    onComplete,
    fromLanding = false,
}: {
    onComplete?: () => void;
    /** The visitor clicked a CTA on the landing: their click should end in an
     *  action, not in more reading. The dropzone's button takes focus. */
    fromLanding?: boolean;
}) {
    const [result, setResult] = useState<UploadResult | null>(null);

    useEffect(() => {
        track("onboarding.view", { from_landing: fromLanding });
    }, [fromLanding]);

    return (
        // dvh, not vh: on a phone, 100vh hides the bottom of the page behind
        // the browser's collapsing toolbar.
        <main className="flex min-h-dvh flex-col">
            <header className="mx-auto w-full max-w-page px-5 pt-6 sm:px-8 sm:pt-8">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2 text-body font-medium text-ink">
                        <Flame size={16} className="text-signal" aria-hidden />
                        Tomin
                    </div>
                    <a
                        href={LANDING_URL}
                        onClick={() => track("onboarding.to_landing")}
                        className="text-body-sm text-graphite underline decoration-mist underline-offset-4 transition-colors duration-100 hover:text-ink"
                    >
                        ¿Qué es Tomin?
                    </a>
                </div>
            </header>

            <div className="mx-auto w-full max-w-page flex-1 px-5 py-10 sm:px-8 sm:py-14">
                {result ? (
                    <div className="mx-auto max-w-xl">
                        <ReviewStatement result={result} onDone={() => onComplete?.()} />
                    </div>
                ) : (
                    <>
                        <div className="max-w-prose">
                            <h1 className="font-display text-title-lg font-normal text-ink sm:text-display">
                                Empieza con un estado de cuenta.
                            </h1>
                        </div>

                        <StatementDropzone
                            className="mt-8 sm:mt-10"
                            autoFocus={fromLanding}
                            onResult={(r) => {
                                track("onboarding.uploaded", {
                                    template: r.template,
                                    transactions: r.transactions_created,
                                });
                                setResult(r);
                            }}
                        />

                        {/* Hairlines, not cards: a caption on the dropzone
                            above, and three more boxes would compete with it. */}
                        <ol className="mt-8 grid gap-px overflow-hidden rounded-card border border-mist bg-mist sm:mt-12 md:grid-cols-3">
                            {STEPS.map((step, i) => (
                                <li key={step.title} className="bg-canvas p-5 sm:p-6">
                                    <span className="eyebrow">
                                        Paso {i + 1}
                                    </span>
                                    <h2 className="mt-2 font-display text-title-md font-normal text-ink">
                                        {step.title}
                                    </h2>
                                    <p className="mt-1.5 text-body-sm text-graphite">{step.body}</p>
                                </li>
                            ))}
                        </ol>
                    </>
                )}
            </div>
        </main>
    );
}
