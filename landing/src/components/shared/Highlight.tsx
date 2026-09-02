import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** One phrase per headline in Edge on a Wash pill. Exactly one. */
export function Highlight({ children, className }: { children: ReactNode; className?: string }) {
    return <span className={cn("highlight", className)}>{children}</span>;
}
