"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { cn } from "@/lib/cn";
import { Skeleton } from "@/components/ui";
import { describeRule } from "@/lib/workstations";
import { useWorkspace } from "./WorkspaceProvider";

/**
 * The list of saved lenses.
 *
 * On desktop this is the persistent left rail; below `lg` the same component is
 * the whole of `/workspace`, which is why it takes `variant` rather than being
 * two components. One list, two placements — a phone-shaped copy would drift
 * from the desktop one within a release.
 */
export function WorkspaceSidebar({
    activeId,
    onNew,
    variant = "rail",
}: {
    activeId?: string;
    onNew: () => void;
    variant?: "rail" | "page";
}) {
    const { items, error } = useWorkspace();

    return (
        <nav aria-label="Análisis" className={cn(variant === "rail" && "w-60 shrink-0")}>
            <button
                type="button"
                onClick={onNew}
                className={cn(
                    "flex w-full items-center gap-2 rounded-control px-3 py-2 text-body",
                    "text-graphite transition-colors duration-100 hover:bg-fog hover:text-ink"
                )}
            >
                <Plus size={15} aria-hidden />
                Nuevo análisis
            </button>

            <div aria-hidden className="my-2 h-px bg-mist" />

            {items === null && (
                <ul className="space-y-1 px-3 py-1">
                    {[0, 1, 2].map((i) => (
                        <li key={i}>
                            <Skeleton className="h-9 w-full" />
                        </li>
                    ))}
                </ul>
            )}

            {error && (
                <p className="px-3 py-2 text-body-sm text-graphite">
                    No se pudieron cargar tus análisis.
                </p>
            )}

            {items?.length === 0 && !error && (
                <p className="px-3 py-2 text-body-sm text-graphite">
                    Todavía no tienes ninguno.
                </p>
            )}

            <ul className="space-y-0.5">
                {items?.map((w) => {
                    const active = w.id === activeId;
                    return (
                        <li key={w.id}>
                            <Link
                                href={`/workspace/${w.id}`}
                                aria-current={active ? "page" : undefined}
                                className={cn(
                                    "block rounded-control px-3 py-2",
                                    "transition-colors duration-100",
                                    // Fog with a hairline, matching the active
                                    // nav item. NOT the Soot pill: that belongs
                                    // to the period filter, and two dark pills
                                    // on one screen read as the same control.
                                    active
                                        ? "bg-fog text-ink ring-1 ring-inset ring-mist"
                                        : "text-graphite hover:bg-fog hover:text-ink"
                                )}
                            >
                                <span
                                    className={cn(
                                        "block truncate text-body",
                                        active && "font-medium"
                                    )}
                                >
                                    {w.name}
                                </span>
                                {/* The rule, one line, always visible: every
                                    number in the detail is only as trustworthy
                                    as the set, and the set is this. */}
                                <span className="mt-0.5 block truncate text-label text-ash">
                                    {describeRule(w)}
                                </span>
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
}
