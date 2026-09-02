import { cn } from "@/lib/cn";
import type { Tone } from "./Wordmark";

export function Footer({ tone = "light" }: { tone?: Tone }) {
    const dark = tone === "dark";
    return (
        <footer
            className={cn(
                "border-t py-8 text-center text-body-sm",
                dark ? "border-line text-dust" : "border-mist text-ash"
            )}
        >
            Tomin — finanzas personales para México.
        </footer>
    );
}
