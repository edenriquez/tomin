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
            <div className="flex items-baseline justify-between gap-4">
                <p className="eyebrow">{eyebrow}</p>
                {metric && (
                    <p className="tabular font-display text-metric-sm text-bone sm:text-metric">{metric}</p>
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
