"use client";

import { SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/cn";
import { useEditorMode } from "./usePanelSettings";

/**
 * Reveals a view's own controls, from inside that view.
 *
 * This used to be a global switch in the header. It came down because the
 * header is for things that apply everywhere, and panel settings apply to two
 * cards — the Movimientos chart and list, the Documentos sort. A control that
 * lives next to the thing it changes needs no explanation; one that lives in
 * the header needs the user to remember which views it was for.
 */
export function PanelSettingsToggle({ className }: { className?: string }) {
    const [editing, setEditing] = useEditorMode();
    return (
        <button
            type="button"
            aria-pressed={editing}
            aria-label="Ajustes de esta vista"
            title="Ajustes de esta vista"
            onClick={() => setEditing(!editing)}
            className={cn(
                "inline-flex h-8 w-8 items-center justify-center rounded-control",
                "transition-colors duration-100",
                editing ? "bg-soot text-paper" : "text-ash hover:bg-fog hover:text-ink",
                className
            )}
        >
            <SlidersHorizontal size={15} aria-hidden />
        </button>
    );
}
