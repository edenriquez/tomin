"use client";

import { useMemo, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/cn";
import { isNewTagName, matchesTag, type Tag } from "@/lib/tags";
import { Input } from "@/components/ui";

/**
 * Type to filter existing tags, Enter to pick the first match, or create the
 * tag you just typed.
 *
 * Creation is inline and immediate on purpose: a user tagging a movement
 * "deducible" for the first time should not have to leave, find a management
 * screen, create the tag, come back and start over. The cost is that a created
 * tag exists even if the sheet is then cancelled — an empty tag in the list is
 * a much smaller problem than a dead end mid-task.
 */
export function TagCombobox({
    tags,
    /** Already on the transaction: filtered out of the suggestions. */
    exclude = [],
    onPick,
    onCreate,
    placeholder = "Buscar o crear etiqueta...",
    disabled = false,
    className,
}: {
    tags: Tag[];
    exclude?: string[];
    onPick: (tag: Tag) => void;
    /** Resolves with the created tag, or rejects. Owned by the caller so the
     *  new tag lands in the page's tag list too, not just in this input. */
    onCreate: (name: string) => Promise<Tag | null>;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
}) {
    const [query, setQuery] = useState("");
    const [creating, setCreating] = useState(false);
    const [open, setOpen] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const excluded = useMemo(() => new Set(exclude), [exclude]);

    const matches = useMemo(
        () =>
            tags
                .filter((t) => !excluded.has(t.id))
                .filter((t) => (query.trim() ? matchesTag(t, query) : true))
                .slice(0, 6),
        [tags, excluded, query]
    );

    const canCreate = isNewTagName(tags, query);

    const pick = (tag: Tag) => {
        onPick(tag);
        setQuery("");
        setOpen(false);
        inputRef.current?.focus();
    };

    const create = async () => {
        const name = query.trim();
        if (!name || creating) return;
        setCreating(true);
        try {
            const tag = await onCreate(name);
            if (tag) pick(tag);
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className={cn("relative", className)}>
            <Input
                ref={inputRef}
                value={query}
                disabled={disabled || creating}
                placeholder={placeholder}
                onChange={(e) => {
                    setQuery(e.target.value);
                    setOpen(true);
                }}
                onFocus={() => setOpen(true)}
                // A click on a suggestion blurs the input first, so the list has
                // to outlive the blur by a tick or the click never lands.
                onBlur={() => setTimeout(() => setOpen(false), 120)}
                onKeyDown={(e) => {
                    if (e.key === "Escape") {
                        setOpen(false);
                        return;
                    }
                    if (e.key !== "Enter") return;
                    e.preventDefault();
                    if (matches.length) pick(matches[0]);
                    else if (canCreate) void create();
                }}
                aria-label="Agregar etiqueta"
            />

            {open && (matches.length > 0 || canCreate) && (
                <ul
                    className={cn(
                        "absolute left-0 right-0 top-full z-10 mt-1 overflow-hidden",
                        "rounded-control border border-mist bg-paper py-1 shadow-lg"
                    )}
                >
                    {matches.map((tag) => (
                        <li key={tag.id}>
                            <button
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => pick(tag)}
                                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-body-sm text-ink hover:bg-fog"
                            >
                                <span className="truncate">{tag.name}</span>
                                {tag.kind === "investment" && (
                                    <span className="ml-auto shrink-0 text-label text-pewter">
                                        Inversion
                                    </span>
                                )}
                            </button>
                        </li>
                    ))}
                    {canCreate && (
                        <li>
                            <button
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => void create()}
                                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-body-sm text-ink hover:bg-fog"
                            >
                                <Plus size={14} className="shrink-0 text-graphite" aria-hidden />
                                <span className="truncate">Crear &laquo;{query.trim()}&raquo;</span>
                            </button>
                        </li>
                    )}
                </ul>
            )}
        </div>
    );
}
