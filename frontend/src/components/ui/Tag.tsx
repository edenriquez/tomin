import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type TagTone = "neutral" | "estimate" | "positive" | "negative" | "accent";

const TONES: Record<TagTone, string> = {
    neutral: "bg-fog text-pewter",
    /** "estimate" / "beta" — the widget renders, but the number is a heuristic. */
    estimate: "bg-fog text-graphite ring-1 ring-inset ring-mist",
    positive: "bg-fog text-positive",
    negative: "bg-fog text-negative",
    /** Ink on Ember; the only fill-coloured tag. Use sparingly. */
    accent: "bg-ember text-ink font-semibold",
};

export function Tag({
    tone = "neutral",
    icon,
    className,
    children,
}: {
    tone?: TagTone;
    icon?: ReactNode;
    className?: string;
    children: ReactNode;
}) {
    return (
        <span
            className={cn(
                "inline-flex items-center gap-1 rounded-tag px-1.5 py-0.5 text-label font-medium",
                TONES[tone],
                className
            )}
        >
            {icon}
            {children}
        </span>
    );
}
