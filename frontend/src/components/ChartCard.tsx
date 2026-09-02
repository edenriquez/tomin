import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { PanelControls } from "@/components/settings/PanelControls";

/** The one card charts live in: Paper, hairline, the 16px-blur whisper. */
export function ChartCard({
    title,
    badge,
    controls,
    action,
    className,
    children,
}: {
    title: string;
    /** Quality qualifier from the metric catalog, e.g. "Estimado" for a
     *  heuristic the backend itself doesn't fully trust. */
    badge?: string;
    /** This card's own settings controls — `PanelControl` rows, built from
     *  `usePanelSettings`. Rendered only in editor mode, below the title. */
    controls?: ReactNode;
    /** A single control at the far right of the title row — the card's own
     *  settings toggle, typically. */
    action?: ReactNode;
    className?: string;
    children: ReactNode;
}) {
    return (
        <section
            className={cn(
                "min-w-0 rounded-card border border-mist bg-paper p-5 shadow-card sm:p-6",
                className
            )}
        >
            <div className="flex items-center gap-2">
                <h2 className="font-display text-title-sm font-normal text-ink">{title}</h2>
                {badge && (
                    <span className="rounded-tag bg-fog px-2 py-0.5 text-label font-medium text-graphite ring-1 ring-inset ring-mist">
                        {badge}
                    </span>
                )}
                {action && <span className="ml-auto">{action}</span>}
            </div>
            {controls && <PanelControls>{controls}</PanelControls>}
            <div className="mt-4">{children}</div>
        </section>
    );
}
