import { ShieldCheck } from "lucide-react";
import { APP_URL } from "@/lib/site";
import { FIGURES } from "@/lib/data";
import { Button } from "@/components/shared/Button";
import { Highlight } from "@/components/shared/Highlight";
import { MeshGradient } from "./MeshGradient";

/**
 * The Stripe gesture on Tomin's terms: a headline about the pain, one CTA, one
 * trust line — and below it, one number set at 96px. The number is the
 * product: a raw statement turned into a sentence you didn't have.
 */
export function HeroB() {
    return (
        <section className="relative isolate overflow-hidden">
            <MeshGradient />
            <div className="relative mx-auto w-full max-w-page px-5 pb-16 pt-20 sm:px-8 sm:pb-24 sm:pt-28">
                <p className="eyebrow rise">Finanzas personales para México</p>
                <h1 className="rise mt-4 max-w-[16ch] text-title-lg sm:text-display lg:text-display-lg">
                    Tu estado de cuenta, <Highlight>leído</Highlight>.
                </h1>
                <p className="rise rise-2 mt-6 max-w-prose text-body-lg text-dust">
                    Sube el PDF de tu banco. Tomin extrae cada movimiento, detecta lo que te cobran
                    sin que lo veas y desecha el archivo. Sin conectar cuentas, sin capturar a mano.
                </p>
                <div className="rise rise-2 mt-8 flex flex-wrap items-center gap-4">
                    <Button href={APP_URL} size="lg" tone="dark">
                        Comenzar con un estado de cuenta
                    </Button>
                    <a
                        href="#como-funciona"
                        className="text-body text-dust underline decoration-lineStrong underline-offset-4 hover:text-bone"
                    >
                        Cómo funciona
                    </a>
                </div>
                <p className="rise rise-2 mt-4 flex items-center gap-1.5 text-body-sm text-dust">
                    <ShieldCheck size={14} aria-hidden className="text-signal" />
                    Nunca pedimos la contraseña de tu banco.
                </p>

                <div className="rise rise-3 mt-16 border-t border-line pt-8 sm:mt-24">
                    <p className="tabular font-display text-[56px] leading-none tracking-[-0.03em] text-bone sm:text-[96px]">
                        {FIGURES.heroAmount}
                    </p>
                    <p className="mt-3 text-body-lg text-dust">{FIGURES.heroCaption}</p>
                </div>
            </div>
        </section>
    );
}
