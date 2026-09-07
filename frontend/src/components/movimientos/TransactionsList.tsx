"use client";

import { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import {
    Banknote,
    Bus,
    Clapperboard,
    Home,
    Receipt,
    ShoppingCart,
    type LucideIcon,
} from "lucide-react";
import type { AttentionKind, Transaction, TransactionPatch } from "@/lib/api";
import { LENS_KIND_LABELS } from "@/components/charts/lens/types";
import { cn } from "@/lib/cn";
import { categoryColor, categoryName, useCategories, type CategoryInfo } from "@/lib/categories";
import { matchMerchant, merchantLogoUrl } from "@/lib/merchants";
import { dayLabel, mxn2 } from "@/lib/format";
import { parsePeriodKey } from "@/lib/metrics";
import { Button, Checkbox } from "@/components/ui";
import { EditorStrip, InlineCategory, InlineName, useInlineEdit } from "./TransactionEditor";

/**
 * The rows under the chart. Flat entries separated by hairlines — one card
 * (the parent's) holding a ledger, not a pile of outlined boxes:
 *
 *     [icon]  7-Eleven                                   −$9.99
 *             19 jul                       Comida y Supermercados
 *
 * The icon is the category's mark (tinted disc in its color) — the nearest
 * honest thing to the merchant logo statements don't carry. Date under the
 * description, category under the amount: each column reads "what · when"
 * and "how much · of what kind".
 *
 * Layout contract: the list bleeds to the parent card's edges (-mx) so the
 * dividers run full width; rows re-apply the card's own padding (p-5/sm:p-6
 * at both call sites).
 *
 * Selection is shared with the chart: the selected row gets a Fog wash and a
 * 2px Signal inset edge, and when the chart drives the selection the list
 * scrolls the row into view — extending the visible page first if the row is
 * beyond it.
 */
export function TransactionsList({
    items,
    visibleCount,
    onShowMore,
    selectedId,
    onSelect,
    editing,
    membership,
    attention,
}: {
    /** Already window+search filtered, `tx_date DESC` from the API. */
    items: Transaction[];
    /** Row id → why the chart rings it. The list repeats the reading as a
     *  quiet tag beside the amount, so it exists off the chart too. */
    attention?: Map<string, AttentionKind>;
    visibleCount: number;
    onShowMore: () => void;
    selectedId: string | null;
    onSelect: (id: string | null) => void;
    /** Editing powers. When present, the selected row becomes its own
     *  editor: name and category editable in place, the strip below for the
     *  rest. Selection IS the edit mode — one concept. */
    editing?: {
        onPatch: (t: Transaction, patch: TransactionPatch) => void;
        onBulkApplied: () => void;
    };
    /** Membership in the Lectura set. Highlight (selectedId) stays inspect. */
    membership?: {
        excluded: Set<string>;
        onToggle: (id: string, inSet: boolean) => void;
    };
}) {
    const categories = useCategories();
    const rowRefs = useRef(new Map<string, HTMLElement>());

    // Chart → list: scroll the selected row into view once it is rendered.
    // (The parent extends visibleCount before this effect sees the id.)
    useEffect(() => {
        if (!selectedId) return;
        const el = rowRefs.current.get(selectedId);
        el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }, [selectedId, visibleCount]);

    const visible = items.slice(0, visibleCount);

    // Keyboard ledger: with a row selected, ↓/↑ move to the next or previous
    // row (extending the page through onSelect when needed) and Escape
    // closes it. Paired with the category keys in the editor, a batch of
    // uncategorized rows is one hand on the keyboard: letter, ↓, letter, ↓.
    useEffect(() => {
        if (!selectedId) return;
        function onKey(e: KeyboardEvent) {
            if (e.metaKey || e.ctrlKey || e.altKey) return;
            const target = e.target;
            if (
                target instanceof HTMLElement &&
                (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
            ) {
                return;
            }
            if (e.key === "Escape") {
                // The editor claims Escape first when a category is armed.
                if (e.defaultPrevented) return;
                e.preventDefault();
                onSelect(null);
                return;
            }
            if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
            const at = items.findIndex((t) => t.id === selectedId);
            if (at < 0) return;
            const next = items[at + (e.key === "ArrowDown" ? 1 : -1)];
            if (!next) return;
            e.preventDefault();
            onSelect(next.id);
        }
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [selectedId, items, onSelect]);

    const setRef = (id: string) => (el: HTMLElement | null) => {
        if (el) rowRefs.current.set(id, el);
        else rowRefs.current.delete(id);
    };

    function rowDate(t: Transaction): string {
        const d = parsePeriodKey(t.date);
        return d ? dayLabel(d) : t.date;
    }

    function toggle(t: Transaction) {
        onSelect(t.id === selectedId ? null : t.id);
    }

    return (
        <div className="-mx-5 sm:-mx-6">
            <ul className="divide-y divide-mist border-t border-mist">
                {visible.map((t) => (
                    <Row
                        key={t.id}
                        ref={setRef(t.id)}
                        transaction={t}
                        categories={categories}
                        selected={t.id === selectedId}
                        inSet={membership ? !membership.excluded.has(t.id) : undefined}
                        onMembership={
                            membership
                                ? (on) => membership.onToggle(t.id, on)
                                : undefined
                        }
                        dateLabel={rowDate(t)}
                        onToggle={() => toggle(t)}
                        editing={editing}
                        flag={attention?.get(t.id)}
                    />
                ))}
            </ul>

            {items.length > visibleCount && (
                <div className="flex items-center justify-center gap-3 border-t border-mist px-5 pt-4 sm:px-6">
                    <Button variant="secondary" size="sm" onClick={onShowMore}>
                        Mostrar más
                    </Button>
                    <span className="text-label text-graphite">
                        {visibleCount} de {items.length}
                    </span>
                </div>
            )}
        </div>
    );
}

/**
 * One entry. Unselected it is a static reading; selected (with editing
 * powers) the same pixels become the editor — the title is an input dressed
 * as itself, the category text is a quiet picker, and the strip below holds
 * the rest. No form appears; the row is the form.
 */
const Row = forwardRef<HTMLLIElement, {
    transaction: Transaction;
    categories: Map<string, CategoryInfo> | null;
    selected: boolean;
    inSet?: boolean;
    onMembership?: (inSet: boolean) => void;
    dateLabel: string;
    onToggle: () => void;
    editing?: {
        onPatch: (t: Transaction, patch: TransactionPatch) => void;
        onBulkApplied: () => void;
    };
    /** Why the chart rings this row, if it does. */
    flag?: AttentionKind;
}>(function Row({ transaction: t, categories, selected, inSet, onMembership, dateLabel, onToggle, editing, flag }, ref) {
    // Unconditional (hooks) and cheap: it holds no fetch until a commit.
    const edit = useInlineEdit(
        t,
        (patch) => editing?.onPatch(t, patch),
        () => editing?.onBulkApplied()
    );
    const editable = selected && !!editing;

    return (
        <li
            ref={ref}
                className={cn(
                "transition-colors duration-100",
                selected && "bg-canvas",
                inSet === false && "opacity-50"
            )}
        >
            <div
                role="button"
                tabIndex={0}
                onClick={onToggle}
                onKeyDown={(e) => {
                    // Only keys aimed at the row itself: the inline inputs
                    // bubble their keystrokes up here, and a Space typed into
                    // the name must stay a space, not collapse the editor.
                    if (e.target !== e.currentTarget) return;
                    if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onToggle();
                    }
                }}
                aria-expanded={editable}
                className={cn(
                    "flex w-full cursor-pointer items-center gap-3.5 px-5 py-3.5 text-left sm:px-6",
                    "transition-colors duration-100",
                    !selected && "hover:bg-fog"
                )}
            >
                <RowAvatar categories={categories} transaction={t} />

                {onMembership && inSet !== undefined && (
                    <span
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                    >
                        <Checkbox
                            checked={inSet}
                            onChange={onMembership}
                            aria-label={
                                inSet
                                    ? `Quitar ${t.description} del conjunto`
                                    : `Dejar ${t.description} en el conjunto`
                            }
                        />
                    </span>
                )}

                <span className="min-w-0 flex-1">
                    {editable ? (
                        <InlineName transaction={t} edit={edit} />
                    ) : (
                        <span className="block truncate text-body font-medium text-ink">
                            {t.description}
                        </span>
                    )}
                    <span className="mt-0.5 block text-body-sm text-graphite">{dateLabel}</span>
                </span>

                <span className="min-w-0 max-w-[45%] shrink-0 text-right">
                    <span className="flex items-center justify-end gap-2">
                        {flag && <FlagTag kind={flag} />}
                        <Amount t={t} />
                    </span>
                    {editable ? (
                        <InlineCategory transaction={t} edit={edit} />
                    ) : (
                        <span
                            className="mt-0.5 block truncate text-body-sm text-graphite"
                            title={categoryName(categories, t.category_id)}
                        >
                            {categoryName(categories, t.category_id)}
                        </span>
                    )}
                </span>
            </div>
            {editable && (
                <div className="animate-reveal border-t border-mist px-5 sm:px-6">
                    <EditorStrip
                        transaction={t}
                        onPatch={(patch) => editing!.onPatch(t, patch)}
                        edit={edit}
                    />
                </div>
            )}
        </li>
    );
});

/** Seed taxonomy icon names → lucide glyphs. Anything unknown reads as a
 *  generic receipt — a wrong guess at a merchant would be worse than none. */
const CATEGORY_ICONS: Record<string, LucideIcon> = {
    home: Home,
    shopping_cart: ShoppingCart,
    commute: Bus,
    movie: Clapperboard,
    payments: Banknote,
};

/**
 * The row's mark. A recognized merchant shows its actual logo (served from
 * /public/logos — local, no third-party request per row) on a Paper disc
 * with a hairline ring; anything unrecognized falls back to the category's
 * icon on a disc washed with its color (10% alpha — a tint, never a fill).
 * A wrong logo would be worse than none, so the matcher is conservative and
 * a failed image swaps to the category mark rather than a broken glyph.
 */
function RowAvatar({
    categories,
    transaction: t,
}: {
    categories: Map<string, CategoryInfo> | null;
    transaction: Transaction;
}) {
    const [imageFailed, setImageFailed] = useState(false);
    const slug = useMemo(
        () => matchMerchant(t.raw_description || t.description || ""),
        [t.raw_description, t.description]
    );

    if (slug && !imageFailed) {
        return (
            <span
                aria-hidden
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-mist bg-paper"
            >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={merchantLogoUrl(slug)}
                    alt=""
                    width={22}
                    height={22}
                    loading="lazy"
                    className="h-[22px] w-[22px] rounded-[4px] object-contain"
                    onError={() => setImageFailed(true)}
                />
            </span>
        );
    }

    const color = categoryColor(categories, t.category_id);
    const iconName = (t.category_id && categories?.get(t.category_id)?.icon) || "";
    const Icon = CATEGORY_ICONS[iconName] ?? Receipt;
    return (
        <span
            aria-hidden
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full"
            style={{ background: `${color}1a`, color }}
        >
            <Icon size={18} strokeWidth={1.75} />
        </span>
    );
}

/**
 * The reading, off the chart: a hairline tag in the accent, one word. Signal
 * is a border here, never text on light — the label stays Ink.
 */
function FlagTag({ kind }: { kind: AttentionKind }) {
    const word = { unusual_amount: "inusual", possible_duplicate: "duplicado", new_merchant: "nuevo" }[kind];
    return (
        <span
            title={LENS_KIND_LABELS[kind]}
            className="rounded-tag border border-signal px-1.5 py-px text-caption font-medium uppercase text-ink"
        >
            {word}
        </span>
    );
}

function Amount({ t }: { t: Transaction }) {
    const income = t.type === "income";
    return (
        <span
            className={cn(
                "tabular block whitespace-nowrap text-right text-body font-medium",
                income ? "text-positive" : "text-ink"
            )}
        >
            {income ? "+" : "−"}
            {mxn2(t.amount)}
        </span>
    );
}
