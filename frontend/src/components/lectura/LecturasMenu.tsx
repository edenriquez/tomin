"use client";

import { useState } from "react";
import Link from "next/link";
import { FlaskConical } from "lucide-react";
import { cn } from "@/lib/cn";
import { describeRule } from "@/lib/workstations";
import { useCategories } from "@/lib/categories";
import { useWorkspace } from "@/components/workspace/WorkspaceProvider";
import { useLectura } from "./LecturaProvider";

/**
 * Saved lenses, next to the period pills — not a seventh tab. Picking one
 * opens the Lectura on this page.
 */
export function LecturasMenu() {
    const { items } = useWorkspace();
    const { workstation, openSaved } = useLectura();
    const categories = useCategories();
    const [open, setOpen] = useState(false);

    const count = items?.length ?? 0;

    return (
        <div className="relative">
            <button
                type="button"
                aria-expanded={open}
                aria-haspopup="listbox"
                onClick={() => setOpen((v) => !v)}
                className={cn(
                    "inline-flex h-9 items-center gap-1.5 rounded-control px-3 text-body-sm",
                    "transition-colors duration-100",
                    workstation || open
                        ? "bg-fog font-medium text-ink ring-1 ring-inset ring-mist"
                        : "text-graphite hover:text-ink"
                )}
            >
                <FlaskConical size={14} aria-hidden />
                Lecturas
                {count > 0 && (
                    <span className="tabular text-label text-ash">{count}</span>
                )}
            </button>

            {open && (
                <>
                    <button
                        type="button"
                        aria-label="Cerrar lecturas"
                        className="fixed inset-0 z-20 cursor-default"
                        onClick={() => setOpen(false)}
                    />
                    <ul
                        role="listbox"
                        className="absolute left-0 z-30 mt-1 w-64 rounded-card border border-mist bg-paper py-1 shadow-card"
                    >
                        {count === 0 && (
                            <li className="px-3 py-2 text-body-sm text-graphite">
                                Todavía no tienes ninguna. Filtra un conjunto y elige Leer
                                conjunto.
                            </li>
                        )}
                        {items?.map((w) => {
                            const current = w.id === workstation?.id;
                            return (
                                <li key={w.id}>
                                    <button
                                        type="button"
                                        role="option"
                                        aria-selected={current}
                                        onClick={() => {
                                            openSaved(w);
                                            setOpen(false);
                                        }}
                                        className={cn(
                                            "flex w-full flex-col px-3 py-2 text-left",
                                            "hover:bg-fog",
                                            current && "bg-fog"
                                        )}
                                    >
                                        <span className="truncate text-body-sm font-medium text-ink">
                                            {w.name}
                                        </span>
                                        <span className="truncate text-label text-ash">
                                            {describeRule(w, categories)}
                                        </span>
                                    </button>
                                </li>
                            );
                        })}
                        <li className="border-t border-mist">
                            <Link
                                href="/workspace"
                                onClick={() => setOpen(false)}
                                className="block px-3 py-2 text-body-sm text-graphite hover:bg-fog hover:text-ink"
                            >
                                Ver todas
                            </Link>
                        </li>
                    </ul>
                </>
            )}
        </div>
    );
}
