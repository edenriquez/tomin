import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function PageHeader({
    title,
    subtitle,
    actions,
    className,
}: {
    title: string;
    subtitle?: string;
    actions?: ReactNode;
    className?: string;
}) {
    return (
        <div className={cn("flex items-start justify-between gap-4", className)}>
            <div className="min-w-0">
                <h1 className="text-title-md font-semibold text-ink">{title}</h1>
                {subtitle && <p className="mt-0.5 text-body-sm text-pewter">{subtitle}</p>}
            </div>
            {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
    );
}
