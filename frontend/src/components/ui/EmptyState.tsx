import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * The app's one empty state: icon disc, display-face title, one line of body,
 * optional action. Centered — an empty area has no content to align with, and
 * the four hand-rolled variants (three alignments, two disc styles) read as
 * four different apps.
 */
export function EmptyState({
    icon: Icon,
    title,
    children,
    action,
    className,
}: {
    icon: LucideIcon;
    title: string;
    /** One line. If it needs two, the product is unclear, not the copy. */
    children?: ReactNode;
    action?: ReactNode;
    className?: string;
}) {
    return (
        <div className={cn("animate-reveal py-8 text-center", className)}>
            <div className="mx-auto mb-4 flex h-9 w-9 items-center justify-center rounded-input border border-mist bg-canvas text-ash">
                <Icon size={18} aria-hidden />
            </div>
            <p className="font-display text-title-sm font-normal text-ink">{title}</p>
            {children && (
                <p className="mx-auto mt-1.5 max-w-sm text-body-sm text-graphite">{children}</p>
            )}
            {action && <div className="mt-3">{action}</div>}
        </div>
    );
}
