import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function BentoCard({
    eyebrow,
    metric,
    title,
    body,
    mock,
    className,
    mockClassName,
}: {
    eyebrow: string;
    metric?: string;
    title: string;
    body: string;
    mock: ReactNode;
    className?: string;
    mockClassName?: string;
}) {
    return (
        <article
            className={cn(
                "bento flex flex-col overflow-hidden rounded-panel border border-line bg-slate p-5 transition-transform duration-200 hover:-translate-y-0.5 sm:p-6",
                className
            )}
        >
            {/* The eyebrow never breaks mid-phrase; on a narrow card the metric drops to its own line, still right-aligned. */}
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <p className="eyebrow whitespace-nowrap">{eyebrow}</p>
                {metric && (
                    <p className="ml-auto tabular text-metric-sm text-bone sm:text-metric">{metric}</p>
                )}
            </div>
            <div
                aria-hidden
                className={cn("mt-5 flex h-36 items-end overflow-hidden rounded-card bg-night/60 px-4 pb-3 pt-4 sm:h-44", mockClassName)}
            >
                {mock}
            </div>
            <h3 className="mt-5 text-title-sm">{title}</h3>
            <p className="mt-1.5 text-body-sm text-dust">{body}</p>
        </article>
    );
}
