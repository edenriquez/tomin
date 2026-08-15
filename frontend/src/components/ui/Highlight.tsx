import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * The signature typographic move: one phrase per headline in Edge on a Wash
 * pill (4.51:1). It always lands on the value-prop keyword and it carries the
 * entire chromatic budget of that headline — everything else stays Ink.
 *
 * Rules, deliberately not enforceable in code: exactly one per headline, never
 * inside a body paragraph, never on a nav item. Two of these in one line and
 * the restraint that makes the accent legible is gone.
 */
export function Highlight({
    children,
    className,
}: {
    children: ReactNode;
    className?: string;
}) {
    return <span className={cn("highlight", className)}>{children}</span>;
}
