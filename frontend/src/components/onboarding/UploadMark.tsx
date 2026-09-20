"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { colors } from "@/design/tokens";

export type UploadMarkState = "idle" | "dragging" | "uploading";

/**
 * The dropzone's mark: two stacked plates with an upload arrow cut into the
 * front one, and file chips arriving at it from the right.
 *
 * It replaced a 36px outlined `FileUp` in a bordered square — a control-bar
 * icon doing the job of the one object on an otherwise empty first screen.
 * The reference for the shape is the familiar "drop files here" mark: a plate
 * offset behind another to give the glyph depth, which is what makes it read
 * as a container you put something *into* rather than a picture of a file.
 *
 * The depth is built the way this system builds everything else — a second
 * surface and a hairline, no gradient and no shadow — and the arrow is the
 * only thing wearing Signal, so the mark points without shouting.
 *
 * Three states, because the mark is the status light too: idle invites,
 * `dragging` fills the arrow (the file is over the target, the answer is
 * yes), `uploading` becomes the spinner it used to be.
 */
export function UploadMark({
    state = "idle",
    className,
}: {
    state?: UploadMarkState;
    className?: string;
}) {
    if (state === "uploading") {
        return (
            <span
                aria-hidden
                className={cn(
                    "flex h-20 w-20 items-center justify-center rounded-panel border border-mist bg-paper",
                    className
                )}
            >
                <Loader2 size={26} className="animate-spin text-signal" />
            </span>
        );
    }

    const on = state === "dragging";

    return (
        <svg
            aria-hidden
            viewBox="0 0 56 56"
            className={cn("h-20 w-20", className)}
        >
            {/* The plate behind: the depth, and the ring that pulses when a
                chip lands on it. */}
            <rect
                x="14"
                y="5"
                width="34"
                height="34"
                rx="10"
                fill={colors.wash}
                fillOpacity="0.5"
                stroke={colors.mist}
                strokeWidth="1.5"
            />
            <rect
                className="upload-mark-pulse"
                x="14"
                y="5"
                width="34"
                height="34"
                rx="10"
                fill="none"
                stroke={colors.signal}
                strokeWidth="1.5"
                style={{ opacity: 0, transformBox: "fill-box", transformOrigin: "center" }}
            />

            {/* The plate in front: where the arrow lives. */}
            <rect
                x="8"
                y="17"
                width="34"
                height="34"
                rx="10"
                fill={on ? colors.wash : colors.paper}
                stroke={on ? colors.signal : colors.muted}
                strokeWidth="1.5"
                className="transition-colors duration-150"
            />

            {/* The tray, then the arrow rising out of it. */}
            <path
                d="M 16 38 v 3 a 3 3 0 0 0 3 3 h 12 a 3 3 0 0 0 3 -3 v -3"
                fill="none"
                stroke={on ? colors.edge : colors.ash}
                strokeWidth="1.8"
                strokeLinecap="round"
                className="transition-colors duration-150"
            />
            <g
                className="upload-mark-arrow"
                style={{ transformBox: "fill-box", transformOrigin: "center" }}
            >
                <path
                    d="M 25 41 V 25"
                    fill="none"
                    stroke={colors.signal}
                    strokeWidth="2.2"
                    strokeLinecap="round"
                />
                <path
                    d="M 19.5 30.5 L 25 25 L 30.5 30.5"
                    fill="none"
                    stroke={colors.signal}
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </g>
        </svg>
    );
}

/** What the chips say. Real shapes of real files — a Mexican bank's monthly
 *  PDF and a SAT invoice — because the point of the animation is recognition:
 *  "that is the thing sitting in my downloads folder". */
const CHIPS = ["Banamex · ago 2026.pdf", "Nu · sep 2026.pdf", "Factura SAT.xml"];

/**
 * The files arriving at the mark, staggered over one shared 6s loop.
 *
 * Hidden below `sm`: the lane needs ~180px to the right of a centred mark, and
 * on a phone that is either off the card or on top of the copy. The arrow
 * keeps moving there, so the mark is never inert.
 */
export function UploadChips({ className }: { className?: string }) {
    return (
        <div
            aria-hidden
            className={cn(
                "pointer-events-none absolute left-full top-1/2 hidden -translate-y-1/2 pl-5 sm:block",
                className
            )}
        >
            {/* Caption scale and a tight stack on purpose: three chips have to
                fit inside the mark's own height, or the lowest one lands on
                the title underneath. */}
            <div className="flex flex-col items-start gap-1">
                {CHIPS.map((name, i) => (
                    <span
                        key={name}
                        className="upload-chip whitespace-nowrap rounded-control bg-soot px-2.5 py-0.5 text-caption font-medium normal-case tracking-normal text-paper"
                        style={{ animationDelay: `${i * 2}s` }}
                    >
                        {name}
                    </span>
                ))}
            </div>
        </div>
    );
}
