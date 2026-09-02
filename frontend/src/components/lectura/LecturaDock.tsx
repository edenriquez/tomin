"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui";

/**
 * The commit surface. Search is still search until this appears; once it
 * does, the predicate is the set and Leer conjunto is the one action.
 */
export function LecturaDock({
    summary,
    chips,
    onRead,
    onClear,
    busy,
}: {
    summary: string;
    chips: string[];
    onRead: () => void;
    onClear: () => void;
    busy?: boolean;
}) {
    return (
        <div className="sticky bottom-4 z-10 rounded-panel border border-mist bg-paper px-4 py-3 shadow-[0_-12px_40px_rgba(28,25,23,0.10),0_16px_40px_rgba(17,12,46,0.14)]">
            <div className="flex flex-wrap items-center gap-2">
                <p className="min-w-0 text-body-sm font-medium text-ink">{summary}</p>
                {chips.map((c) => (
                    <span
                        key={c}
                        className="rounded-tag bg-fog px-2 py-0.5 text-label text-graphite ring-1 ring-inset ring-mist"
                    >
                        {c}
                    </span>
                ))}
                <span className="ml-auto flex items-center gap-1.5">
                    <Button
                        size="sm"
                        loading={busy}
                        onClick={onRead}
                        className="border-soot bg-soot text-paper hover:bg-ink hover:border-ink hover:brightness-100"
                    >
                        Leer conjunto
                    </Button>
                    <button
                        type="button"
                        onClick={onClear}
                        aria-label="Soltar el conjunto"
                        className="rounded-control p-1.5 text-graphite hover:bg-fog hover:text-ink"
                    >
                        <X size={14} aria-hidden />
                    </button>
                </span>
            </div>
        </div>
    );
}
