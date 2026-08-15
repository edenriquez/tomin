"use client";

import { Flame, GraduationCap, ShieldCheck, Timer } from "lucide-react";
import { colors } from "@/design/tokens";
import { Button, Highlight } from "@/components/ui";
import { UploadStory } from "@/components/landing/UploadStory";

/**
 * The marketing landing: what a visitor sees before deciding. Its one job is
 * the "Comenzar" click — everything on the page argues for it and nothing
 * else is interactive. The product's charts appear as drawn vignettes, not
 * screenshots: a fake dashboard with fake pesos is a claim; a sketch is a
 * shape.
 *
 * Once convinced, the visitor lands on the Onboarding (the dropzone) — the
 * doing page, kept deliberately free of sales copy.
 */
export function Landing({ onStart }: { onStart: () => void }) {
    return (
        <main className="min-h-dvh">
            {/* ---- Nav ----------------------------------------------------- */}
            <header className="mx-auto flex w-full max-w-page items-center justify-between px-5 py-6 sm:px-8">
                <div className="flex items-center gap-2 text-body font-medium text-ink">
                    <Flame size={16} className="text-signal" aria-hidden />
                    Tomin
                </div>
                <Button onClick={onStart} className="text-ink">
                    Comenzar
                </Button>
            </header>

            <div className="mx-auto w-full max-w-page px-5 sm:px-8">
                {/* ---- Hero: copy left, the upload story as the banner ----- */}
                <section className="grid items-center gap-10 py-12 sm:py-16 lg:grid-cols-[1fr_minmax(0,520px)] lg:gap-14 lg:py-20">
                    <div className="max-w-prose">
                        <h1 className="font-display text-title-lg font-normal text-ink sm:text-display">
                            Tu dinero, <Highlight>claro en minutos</Highlight>.
                        </h1>
                        <p className="mt-5 max-w-lg text-body-lg text-graphite">
                            Sube el PDF de tu banco y Tomin lo convierte en tu centro de
                            mando: cada movimiento dibujado, tus categorías mes a mes y las
                            suscripciones que te cobran sin que las veas. Sin conectar
                            cuentas, sin capturar nada a mano, sin hojas de cálculo.
                        </p>
                        <div className="mt-8 flex flex-wrap items-center gap-4">
                            <Button size="lg" onClick={onStart} className="text-ink">
                                Comenzar con un estado de cuenta
                            </Button>
                            <a
                                href="#como-funciona"
                                className="text-body text-graphite underline decoration-mist underline-offset-4 transition-colors duration-100 hover:text-ink"
                            >
                                Cómo funciona
                            </a>
                        </div>
                        <p className="mt-4 flex items-center gap-1.5 text-body-sm text-ash">
                            <ShieldCheck size={14} aria-hidden />
                            Nunca pedimos la contraseña de tu banco.
                        </p>
                    </div>

                    <UploadStory className="min-w-0" />
                </section>

                {/* ---- Proof: the product's readings ----------------------- */}
                <section aria-label="Qué vas a ver" className="pb-4">
                    <h2 className="font-display text-title-md font-normal text-ink">
                        Lo que vas a ver
                    </h2>
                    <div className="mt-6 grid gap-4 sm:gap-6 md:grid-cols-3">
                        <FeatureCard
                            vignette={<ScatterVignette />}
                            title="Cada movimiento, dibujado"
                            body="Un punto por cargo: el sospechoso y el más caro saltan a la vista. Tócalo y edítalo ahí mismo — nombre, categoría, notas."
                        />
                        <FeatureCard
                            vignette={<StackVignette />}
                            title="Cada mes, por categoría"
                            body="Columnas apiladas que dicen cuánto costó cada mes y en qué. Un clic en la capa enseña los cargos detrás."
                        />
                        <FeatureCard
                            vignette={<CalendarVignette />}
                            title="Tus cobros recurrentes"
                            body="Suscripciones y servicios detectados solos, con su ritmo, su próximo cobro y lo que pesan al mes."
                        />
                    </div>
                </section>

                {/* ---- The loop + trust ------------------------------------ */}
                <section className="mt-10 grid gap-px overflow-hidden rounded-card border border-mist bg-mist sm:mt-12 md:grid-cols-3">
                    <TrustCell
                        icon={GraduationCap}
                        title="Aprende de ti"
                        body="Renombra «POCK*SUPERLECLERC» a «Súper de la esquina» una vez: se aplica a los parecidos y a cada estado de cuenta que subas después."
                    />
                    <TrustCell
                        icon={ShieldCheck}
                        title="Tu archivo no se guarda"
                        body="Leemos el PDF, extraemos los movimientos y lo desechamos. Solo tus números se quedan — y son tuyos."
                    />
                    <TrustCell
                        icon={Timer}
                        title="Un archivo basta"
                        body="Nu, Banamex o cualquier PDF bancario. El primer estado de cuenta ya dibuja tus gráficas; cada uno que sumes afina la historia."
                    />
                </section>

                {/* ---- Cómo funciona --------------------------------------- */}
                <section id="como-funciona" className="scroll-mt-8 py-14 sm:py-20">
                    <h2 className="font-display text-title-md font-normal text-ink">
                        Cómo funciona
                    </h2>
                    <ol className="mt-6 grid gap-4 sm:gap-6 md:grid-cols-3">
                        <StepCard n={1} title="Subes el archivo">
                            El PDF de tu banco o el XML del SAT, arrastrado a la pantalla.
                            Nada de credenciales.
                        </StepCard>
                        <StepCard n={2} title="Tomin lo lee y lo desecha">
                            Extrae los movimientos, detecta el banco, categoriza y descarta
                            el archivo original.
                        </StepCard>
                        <StepCard n={3} title="Ves tu dinero">
                            Gráficas, categorías y cobros recurrentes desde el primer
                            documento — y mejores con cada corrección tuya.
                        </StepCard>
                    </ol>

                    {/* Closing CTA: the reader who reached the bottom is warm. */}
                    <div className="mt-10 flex flex-wrap items-center gap-4 rounded-panel border border-mist bg-paper p-6 shadow-card sm:p-8">
                        <p className="min-w-0 flex-1 font-display text-title-sm font-normal text-ink">
                            Toma el control de tu peso.
                        </p>
                        <Button size="lg" onClick={onStart} className="text-ink">
                            Comenzar
                        </Button>
                    </div>
                </section>
            </div>

            <footer className="border-t border-mist py-8 text-center text-body-sm text-ash">
                Tomin — finanzas personales para México.
            </footer>
        </main>
    );
}

function FeatureCard({
    vignette,
    title,
    body,
}: {
    vignette: React.ReactNode;
    title: string;
    body: string;
}) {
    return (
        <div className="min-w-0 rounded-card border border-mist bg-paper p-5 shadow-card sm:p-6">
            <div
                aria-hidden
                className="flex h-24 items-end justify-center overflow-hidden rounded-[6px] bg-canvas px-4 pb-3 pt-4"
            >
                {vignette}
            </div>
            <h3 className="mt-4 font-display text-title-sm font-normal text-ink">{title}</h3>
            <p className="mt-1.5 text-body-sm text-graphite">{body}</p>
        </div>
    );
}

function TrustCell({
    icon: Icon,
    title,
    body,
}: {
    icon: React.ComponentType<{ size?: number | string; className?: string }>;
    title: string;
    body: string;
}) {
    return (
        <div className="bg-canvas p-5 sm:p-6">
            <Icon size={16} className="text-signal" aria-hidden />
            <h3 className="mt-2.5 font-display text-title-sm font-normal text-ink">{title}</h3>
            <p className="mt-1.5 text-body-sm text-graphite">{body}</p>
        </div>
    );
}

function StepCard({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
    return (
        <li className="rounded-card border border-mist bg-paper p-5 shadow-card sm:p-6">
            <span className="text-caption font-medium uppercase text-ash">Paso {n}</span>
            <h3 className="mt-2 font-display text-title-sm font-normal text-ink">{title}</h3>
            <p className="mt-1.5 text-body-sm text-graphite">{children}</p>
        </li>
    );
}

/* ---- Vignettes: the product's charts as sketches, not screenshots ------- */

/** The movements scatter: a quiet cloud and the one outlier that matters. */
function ScatterVignette() {
    const dots: [number, number, number][] = [
        [8, 62, 3], [16, 70, 3], [22, 55, 3.5], [30, 66, 3], [36, 48, 3],
        [44, 60, 3.5], [52, 68, 3], [58, 52, 3], [66, 63, 3], [74, 58, 3.5],
        [82, 66, 3], [90, 50, 3], [40, 30, 3], [70, 36, 3],
    ];
    return (
        <svg viewBox="0 0 100 80" className="h-full w-full" role="presentation">
            <line x1="0" y1="76" x2="100" y2="76" stroke={colors.mist} strokeWidth="1" />
            {dots.map(([x, y, r], i) => (
                <circle key={i} cx={x} cy={y} r={r} fill={colors.ash} opacity="0.7" />
            ))}
            {/* The outlier — the reason the chart exists. */}
            <circle cx={62} cy={12} r={4.5} fill={colors.signal} />
        </svg>
    );
}

/** The month-by-category stack. Greys carry the shape; one signal layer. */
function StackVignette() {
    const months: [number, number, number][] = [
        [26, 14, 8], [18, 20, 10], [30, 10, 12], [22, 16, 8], [34, 12, 10],
    ];
    return (
        <svg viewBox="0 0 100 80" className="h-full w-full" role="presentation">
            <line x1="0" y1="76" x2="100" y2="76" stroke={colors.mist} strokeWidth="1" />
            {months.map(([a, b, c], i) => {
                const x = 8 + i * 19;
                const total = a + b + c;
                return (
                    <g key={i}>
                        <rect x={x} y={74 - a} width="12" height={a} rx="1.5" fill={colors.soot} opacity="0.85" />
                        <rect x={x} y={74 - a - b} width="12" height={b} rx="1.5" fill={colors.ash} />
                        <rect x={x} y={74 - total} width="12" height={c} rx="1.5" fill={colors.signal} opacity="0.9" />
                    </g>
                );
            })}
        </svg>
    );
}

/** The recurring calendar: the grid, the rhythm, the next expected charge. */
function CalendarVignette() {
    const charged = new Set([2, 9, 16, 23, 30, 37]);
    return (
        <svg viewBox="0 0 100 80" className="h-full w-full" role="presentation">
            {Array.from({ length: 42 }).map((_, i) => {
                const col = i % 14;
                const row = Math.floor(i / 14);
                const x = 4 + col * 6.8;
                const y = 22 + row * 18;
                const on = charged.has(i);
                return (
                    <rect
                        key={i}
                        x={x}
                        y={y}
                        width="5"
                        height="14"
                        rx="1.5"
                        fill={on ? colors.soot : colors.fog}
                        opacity={on ? 0.8 : 1}
                    />
                );
            })}
            {/* The next expected charge — drawn, not filled. */}
            <rect
                x={4 + 9 * 6.8}
                y={22}
                width="5"
                height="14"
                rx="1.5"
                fill="none"
                stroke={colors.signal}
                strokeWidth="1.5"
                strokeDasharray="2.5 2"
            />
        </svg>
    );
}
