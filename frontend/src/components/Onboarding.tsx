"use client";

import { useState } from "react";
import { Flame } from "lucide-react";
import type { UploadResult } from "@/lib/api";
import { StatementDropzone } from "@/components/StatementDropzone";
import { ReviewStatement } from "@/components/onboarding/ReviewStatement";

/**
 * The doing page: the visitor already said yes on the Landing, so no sales
 * copy survives here — a short instruction, the dropzone, and the three
 * facts about what happens to the file. Two steps on one screen:
 *
 * 1. upload — the dropzone owns the viewport;
 * 2. review — the OCR shows its work (`ReviewStatement`) before the app opens.
 */
const STEPS = [
    {
        title: "Subes el archivo",
        body: "El PDF de tu banco o el XML del SAT. Nunca pedimos la contraseña de tu banco.",
    },
    {
        title: "Lo leemos y lo desechamos",
        body: "Extraemos los movimientos, los categorizamos, y el archivo original no se guarda.",
    },
    {
        title: "Ves tu dinero",
        body: "Cada movimiento en una gráfica, tus categorías mes a mes y tus cobros recurrentes.",
    },
];

export function Onboarding({ onComplete }: { onComplete?: () => void }) {
    const [result, setResult] = useState<UploadResult | null>(null);

    return (
        // dvh, not vh: on a phone, 100vh hides the bottom of the page behind
        // the browser's collapsing toolbar.
        <main className="flex min-h-dvh flex-col">
            <header className="mx-auto w-full max-w-page px-5 pt-6 sm:px-8 sm:pt-8">
                <div className="flex items-center gap-2 text-body font-medium text-ink">
                    <Flame size={16} className="text-signal" aria-hidden />
                    Tomin
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

                        <StatementDropzone className="mt-8 sm:mt-10" onResult={setResult} />

                        {/* Hairlines, not cards: a caption on the dropzone
                            above, and three more boxes would compete with it. */}
                        <ol className="mt-8 grid gap-px overflow-hidden rounded-card border border-mist bg-mist sm:mt-12 md:grid-cols-3">
                            {STEPS.map((step, i) => (
                                <li key={step.title} className="bg-canvas p-5 sm:p-6">
                                    <span className="text-caption font-medium uppercase text-ash">
                                        Paso {i + 1}
                                    </span>
                                    <h2 className="mt-2 font-display text-title-sm font-normal text-ink">
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
