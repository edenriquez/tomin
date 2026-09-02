import { APP_URL, SITE } from "@/lib/site";
import { cn } from "@/lib/cn";
import { Button } from "./Button";
import type { Tone } from "./Wordmark";

/** The closing panel: the reader who reached the bottom is warm. */
export function CtaBand({ tone = "light" }: { tone?: Tone }) {
    const dark = tone === "dark";
    return (
        <section className="mx-auto w-full max-w-page px-5 pb-16 sm:px-8 sm:pb-24">
            <div
                className={cn(
                    "flex flex-wrap items-center gap-6 rounded-panel border p-6 sm:p-10",
                    dark ? "border-line bg-slate" : "border-mist bg-paper shadow-card"
                )}
            >
                <div className="min-w-0 flex-1">
                    <h2 className="text-title-md sm:text-title-lg">{SITE.tagline}</h2>
                    <p className={cn("mt-2 text-body-lg", dark ? "text-dust" : "text-graphite")}>
                        Un estado de cuenta basta. Nunca pedimos la contraseña de tu banco.
                    </p>
                </div>
                <Button href={APP_URL} size="lg" tone={tone}>
                    Comenzar con un estado de cuenta
                </Button>
            </div>
        </section>
    );
}
