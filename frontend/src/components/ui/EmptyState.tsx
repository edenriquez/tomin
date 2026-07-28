import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Left-aligned, one heading, one line, one action. Centred empty states with
 * an illustration and three links are a decision the user has to make; this
 * is a sentence and a button.
 */
export function EmptyState({
    icon,
    title,
    description,
    action,
    className,
}: {
    icon?: ReactNode;
    title: string;
    /** One line. If it needs two, the product is unclear, not the copy. */
    description?: string;
    action?: ReactNode;
    className?: string;
}) {
    return (
        <div className={cn("max-w-md py-8", className)}>
            {icon && (
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-control bg-fog text-graphite">
                    {icon}
                </div>
            )}
            <h3 className="text-title-sm font-semibold text-ink">{title}</h3>
            {description && <p className="mt-1 text-body-sm text-pewter">{description}</p>}
            {action && <div className="mt-4">{action}</div>}
        </div>
    );
}
