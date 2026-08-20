"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, MessageSquareText, Plus, Trash2 } from "lucide-react";
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
 *
 * The open lens expands to show its conversations, collapsible and indented
 * under a hairline — threads belong to the lens the way chapters belong to a
 * book, and putting them here means switching analyses never asks the user to
 * scroll to the bottom of the detail first. Only the active lens expands:
 * every row unfolding at once would turn a list of six lenses into a wall.
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

                            {active && <ConversationRail workstationId={w.id} />}
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
}

/**
 * The open lens's threads, as a collapsible under its row.
 *
 * The active thread comes from the URL (`?c=`), the same place the chat reads
 * it, so the rail and the transcript can never highlight different threads.
 * "Nueva conversación" is a link that *clears* the param rather than a mode:
 * an empty chat under this lens IS the new conversation.
 */
function ConversationRail({ workstationId }: { workstationId: string }) {
    const { conversationsFor, loadConversations, removeConversation } = useWorkspace();
    const router = useRouter();
    const searchParams = useSearchParams();
    const activeConversationId = searchParams.get("c");

    const [open, setOpen] = useState(true);
    // A different lens starts unfolded again: collapsing is a way to quiet the
    // list you are looking at, not a preference to remember.
    useEffect(() => setOpen(true), [workstationId]);

    useEffect(() => loadConversations(workstationId), [workstationId, loadConversations]);
    const conversations = conversationsFor(workstationId);

    // Nothing yet: no header, no empty state. The chat band below the numbers
    // already invites the first question; an empty "Conversaciones (0)" here
    // would be furniture.
    if (conversations !== null && conversations.length === 0) return null;

    return (
        <div className="ml-3 border-l border-mist pl-2 pt-0.5">
            <button
                type="button"
                aria-expanded={open}
                onClick={() => setOpen((v) => !v)}
                className={cn(
                    "flex w-full items-center gap-1.5 rounded-control px-2 py-1.5",
                    "text-label font-medium uppercase tracking-wide text-ash",
                    "transition-colors duration-100 hover:text-ink"
                )}
            >
                <ChevronDown
                    size={12}
                    aria-hidden
                    className={cn("transition-transform duration-100", !open && "-rotate-90")}
                />
                Conversaciones
                {conversations !== null && (
                    <span className="tabular font-normal">{conversations.length}</span>
                )}
            </button>

            {open && (
                <ul className="mt-0.5 space-y-px pb-1">
                    {conversations === null &&
                        [0, 1].map((i) => (
                            <li key={i} className="px-2 py-1">
                                <Skeleton className="h-4 w-full" />
                            </li>
                        ))}

                    {conversations?.map((c) => {
                        const current = c.id === activeConversationId;
                        return (
                            <li key={c.id} className="group relative">
                                <Link
                                    href={`/workspace/${workstationId}?c=${c.id}`}
                                    aria-current={current ? "true" : undefined}
                                    title={c.title}
                                    className={cn(
                                        "flex items-center gap-1.5 rounded-control py-1.5 pl-2 pr-7",
                                        "text-body-sm transition-colors duration-100",
                                        current
                                            ? "bg-fog font-medium text-ink"
                                            : "text-graphite hover:bg-fog hover:text-ink"
                                    )}
                                >
                                    <MessageSquareText
                                        size={13}
                                        aria-hidden
                                        className="shrink-0 text-ash"
                                    />
                                    <span className="min-w-0 truncate">{c.title}</span>
                                </Link>
                                <button
                                    type="button"
                                    aria-label={`Borrar conversación «${c.title}»`}
                                    onClick={async () => {
                                        if (await removeConversation(workstationId, c.id)) {
                                            // Deleting the thread you are in
                                            // lands you on the fresh chat, not
                                            // on a transcript that no longer
                                            // exists.
                                            if (current) {
                                                router.replace(`/workspace/${workstationId}`);
                                            }
                                        }
                                    }}
                                    className={cn(
                                        "absolute right-1 top-1/2 -translate-y-1/2 rounded-full p-1",
                                        "text-ash opacity-0 transition-opacity duration-100",
                                        "hover:text-negative focus-visible:opacity-100",
                                        "group-hover:opacity-100"
                                    )}
                                >
                                    <Trash2 size={12} aria-hidden />
                                </button>
                            </li>
                        );
                    })}

                    {conversations !== null && activeConversationId && (
                        <li>
                            <Link
                                href={`/workspace/${workstationId}`}
                                className={cn(
                                    "flex items-center gap-1.5 rounded-control py-1.5 pl-2",
                                    "text-body-sm text-graphite",
                                    "transition-colors duration-100 hover:bg-fog hover:text-ink"
                                )}
                            >
                                <Plus size={13} aria-hidden className="shrink-0 text-ash" />
                                Nueva conversación
                            </Link>
                        </li>
                    )}
                </ul>
            )}
        </div>
    );
}
