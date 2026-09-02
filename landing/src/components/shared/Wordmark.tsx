import Link from "next/link";
import { Flame } from "lucide-react";
import { cn } from "@/lib/cn";

export type Tone = "light" | "dark";

/** Flame in Signal next to the wordmark — the only logo the product has today. */
export function Wordmark({ tone = "light", className }: { tone?: Tone; className?: string }) {
    return (
        <Link
            href="/"
            className={cn(
                "inline-flex items-center gap-2 text-body font-medium",
                tone === "dark" ? "text-bone" : "text-ink",
                className
            )}
        >
            <Flame size={16} className="text-signal" aria-hidden />
            Tomin
        </Link>
    );
}
