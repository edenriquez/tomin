"use client";

import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { Lectura } from "./types";

/**
 * The sentence next to the ring. Paper, hairline, the card whisper — the same
 * surface as a tooltip, but it stays, and it can carry an action. Announced
 * politely so a screen reader hears the lectura when it changes.
 */
export function LensCallout({
    lectura,
    style,
    below,
    actions,
}: {
    lectura: Lectura;
    style: CSSProperties;
    /** Drawn under the mark instead of over it (mark too close to the top). */
    below: boolean;
    actions?: ReactNode;
}) {
    return (
        <div
            role="status"
            aria-live="polite"
            className={cn(
                "lens-callout absolute z-10 w-max max-w-[260px] rounded-card border border-mist bg-paper px-3 py-2 shadow-card",
                below ? "lens-callout-below" : "lens-callout-above"
            )}
            style={style}
        >
            <p className="line-clamp-2 text-body-sm text-ink" title={lectura.title}>{lectura.title}</p>
            <p className="mt-0.5 text-body-sm text-graphite">{lectura.detail}</p>
            {actions && <div className="mt-2 flex items-center gap-2">{actions}</div>}
        </div>
    );
}
