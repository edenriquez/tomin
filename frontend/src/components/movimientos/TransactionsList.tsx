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
import type { Transaction, TransactionPatch } from "@/lib/api";
import { cn } from "@/lib/cn";
import { categoryColor, categoryName, useCategories, type CategoryInfo } from "@/lib/categories";
import { matchMerchant, merchantLogoUrl } from "@/lib/merchants";
import { dayLabel, mxn2 } from "@/lib/format";
import { parsePeriodKey } from "@/lib/metrics";
import { Button } from "@/components/ui";
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
}: {
    /** Already window+search filtered, `tx_date DESC` from the API. */
    items: Transaction[];
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
                        dateLabel={rowDate(t)}
                        onToggle={() => toggle(t)}
                        editing={editing}
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
    dateLabel: string;
    onToggle: () => void;
    editing?: {
        onPatch: (t: Transaction, patch: TransactionPatch) => void;
        onBulkApplied: () => void;
    };
}>(function Row({ transaction: t, categories, selected, dateLabel, onToggle, editing }, ref) {
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
                // The open entry stays flat in the ledger — no card, no
                // margins, no rounding, which all break the ruled lines.
                // Its state is an inset well: the background steps down to
                // Canvas, one level below the card's Paper, the way a form
                // area recedes into stationery.
                "transition-colors duration-100",
                selected && "bg-canvas"
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
                    <Amount t={t} />
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
