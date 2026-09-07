import type { ReactNode } from "react";
import { API_URL } from "@/lib/api";
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

/**
 * The chat's off state, said once and without environment variables: which
 * ones to set is a deployment detail for `docs/`, not something a person
 * reading their expenses should meet in the UI. `children` is the optional
 * reassurance ("todo lo demás funciona") a surface may add.
 */
export function ChatOffNotice({ className, children }: { className?: string; children?: ReactNode }) {
    return (
        <p className={cn("text-body-sm text-graphite", className)}>
            El chat no está activado en este servidor.{children}
        </p>
    );
}

/**
 * The standard "backend unreachable" copy, parameterized by what failed.
 *
 * The address comes from `API_URL`, never from a literal. It used to say "el
 * puerto 8000" unconditionally, which is right until someone runs the backend
 * anywhere else — and then the banner confidently contradicts the very detail
 * printed next to it, sending the reader to check a port nothing was ever
 * asked of.
 */
export function BackendNotice({ what, detail }: { what: string; detail: string }) {
    return (
        <Notice>
            No pudimos cargar {what} ({detail}). Revisa que el backend esté corriendo en{" "}
            {API_URL}.
        </Notice>
    );
}
