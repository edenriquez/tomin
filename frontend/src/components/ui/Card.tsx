import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export type CardProps = HTMLAttributes<HTMLDivElement> & {
    /** Header row. Pairs with `actions` on the right. */
    title?: ReactNode;
    actions?: ReactNode;
    /** Drops the default padding for full-bleed content such as a Table. */
    flush?: boolean;
};

/** Elevation in this system comes from a Mist border, never a shadow. */
export function Card({
    title,
    actions,
    flush = false,
    className,
    children,
    ...rest
}: CardProps) {
    return (
        <div
            className={cn(
                "min-w-0 rounded-card border border-mist bg-paper",
                !flush && "p-6",
                className
            )}
            {...rest}
        >
            {(title || actions) && (
                <div
                    className={cn(
                        "flex items-center justify-between gap-4",
                        flush ? "border-b border-mist px-6 py-4" : "mb-4"
                    )}
                >
                    {typeof title === "string" ? (
                        <h2 className="text-title-sm font-semibold text-ink">{title}</h2>
                    ) : (
                        title
                    )}
                    {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
                </div>
            )}
            {children}
        </div>
    );
}
