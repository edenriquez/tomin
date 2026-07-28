import { cn } from "@/lib/cn";

/**
 * A Fog block at the final geometry. No shimmer: an animated gradient draws
 * the eye to the thing that isn't there yet.
 */
export function Skeleton({
    className,
    width,
    height,
}: {
    className?: string;
    width?: number | string;
    height?: number | string;
}) {
    return (
        <div
            aria-hidden
            style={{ width, height }}
            className={cn("rounded-tag bg-fog", className)}
        />
    );
}

/** Placeholder sized for a chart, so the card doesn't jump when data lands. */
export function ChartSkeleton({ height = 320 }: { height?: number }) {
    return (
        <div
            style={{ height }}
            className="flex w-full items-end gap-2 rounded-control bg-fog p-4"
            aria-hidden
        />
    );
}
