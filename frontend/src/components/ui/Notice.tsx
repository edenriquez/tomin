import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * The app's one error banner: Signal edge on a Fog wash, body-sm graphite.
 * Every view used to hand-roll this exact markup; one component means the
 * next tone tweak happens once.
 */
export function Notice({ children, className }: { children: ReactNode; className?: string }) {
    return (
        <p
            className={cn(
                "rounded-card border-l-2 border-signal bg-fog p-3 text-body-sm text-graphite",
                className
            )}
        >
            {children}
        </p>
    );
}

/** The standard "backend unreachable" copy, parameterized by what failed. */
export function BackendNotice({ what, detail }: { what: string; detail: string }) {
    return (
        <Notice>
            No pudimos cargar {what} ({detail}). Revisa que el backend esté corriendo en el
            puerto 8000.
        </Notice>
    );
}
