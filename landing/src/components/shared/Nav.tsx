import { APP_URL } from "@/lib/site";
import { cn } from "@/lib/cn";
import { Button } from "./Button";
import { Wordmark, type Tone } from "./Wordmark";

/**
 * Sticky nav. The one element on either page allowed `backdrop-blur` — a
 * blurred strip the height of a button costs nothing; a blurred hero does.
 */
export function Nav({ tone = "light" }: { tone?: Tone }) {
    const dark = tone === "dark";
    return (
        <header
            className={cn(
                "sticky top-0 z-30 border-b backdrop-blur-md",
                dark ? "border-line bg-night/70" : "border-mist bg-canvas/80"
            )}
        >
            <div className="mx-auto flex w-full max-w-page items-center justify-between px-5 py-4 sm:px-8">
                <Wordmark tone={tone} />
                <nav className="flex items-center gap-2 sm:gap-4">
                    <a
                        href="#como-funciona"
                        className={cn(
                            "hidden text-body sm:inline",
                            dark ? "text-dust hover:text-bone" : "text-graphite hover:text-ink"
                        )}
                    >
                        Cómo funciona
                    </a>
                    <Button href={APP_URL} tone={tone} size="sm">
                        Comenzar
                    </Button>
                </nav>
            </div>
        </header>
    );
}
