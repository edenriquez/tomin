"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowDown, ArrowUp, Info, Trash2, Upload } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button, Skeleton, Tag } from "@/components/ui";
import { SIZE_HEIGHT, SIZE_LABEL, type WidgetSize, type WidgetState } from "@/widgets/types";
import { WidgetMenu, type MenuSection } from "./WidgetMenu";

export type WidgetFrameProps = {
    title: string;
    size: WidgetSize;
    state: WidgetState;
    quality?: "estimate" | "beta";
    /** Sizes the ⋯ menu offers. One size means no "Cambiar tamano" section. */
    sizes?: WidgetSize[];
    onResize?: (size: WidgetSize) => void;
    onRemove?: () => void;
    onMoveUp?: () => void;
    onMoveDown?: () => void;
    onRetry?: () => void;
    detailHref?: string;
    /** Replaces the default "aun no hay movimientos" body. See `WidgetDef.Empty`. */
    empty?: ReactNode;
    /** The chart. Rendered only for `ready` and `insufficient`. */
    children?: ReactNode;
    className?: string;
};

const QUALITY_LABEL = { estimate: "Estimado", beta: "Beta" } as const;

/**
 * The six-state switch (docs/redesign-plan.md §4). Every state occupies the
 * same geometry, so a grid of widgets does not reflow as each one answers.
 *
 * The rule the old dashboard broke: an empty widget never renders `$0`. A zero
 * is a claim about someone's finances and "no data" is not that claim.
 */
export function WidgetFrame({
    title,
    size,
    state,
    quality,
    sizes = [],
    onResize,
    onRemove,
    onMoveUp,
    onMoveDown,
    onRetry,
    detailHref,
    empty,
    children,
    className,
}: WidgetFrameProps) {
    const height = SIZE_HEIGHT[size];

    const sections: MenuSection[] = [];
    if (sizes.length > 1 && onResize) {
        sections.push({
            label: "Cambiar tamano",
            items: sizes.map((s) => ({
                label: SIZE_LABEL[s],
                disabled: s === size,
                onSelect: () => onResize(s),
            })),
        });
    }
    const moves: MenuSection = { items: [] };
    if (onMoveUp) moves.items.push({ label: "Mover arriba", icon: <ArrowUp size={14} />, onSelect: onMoveUp });
    if (onMoveDown)
        moves.items.push({ label: "Mover abajo", icon: <ArrowDown size={14} />, onSelect: onMoveDown });
    if (moves.items.length) sections.push(moves);
    if (onRemove) {
        sections.push({
            items: [{ label: "Quitar", icon: <Trash2 size={14} />, danger: true, onSelect: onRemove }],
        });
    }

    return (
        // min-w-0 is load-bearing: a CSS grid item defaults to min-width:auto
        // and the ApexCharts SVG inside will not shrink below its first render
        // width, overflowing the grid the first time the window narrows.
        <section
            className={cn(
                "flex min-w-0 flex-col rounded-card border border-mist bg-paper",
                className
            )}
            aria-label={title}
        >
            <header className="flex items-start justify-between gap-3 px-6 pb-3 pt-5">
                <div className="flex min-w-0 items-center gap-2">
                    <h2 className="truncate text-title-sm font-semibold text-ink">{title}</h2>
                    {quality && <Tag tone="estimate">{QUALITY_LABEL[quality]}</Tag>}
                </div>
                <WidgetMenu sections={sections} label={`Opciones de ${title}`} />
            </header>

            <div className="min-w-0 flex-1 px-6" style={{ minHeight: height }}>
                <Content state={state} height={height} onRetry={onRetry} empty={empty}>
                    {children}
                </Content>
            </div>

            {detailHref && (
                <footer className="px-6 pb-4 pt-3">
                    <Link
                        href={detailHref}
                        className="text-body-sm font-medium text-graphite hover:text-ink"
                    >
                        Ver detalle →
                    </Link>
                </footer>
            )}
        </section>
    );
}

function Content({
    state,
    height,
    onRetry,
    empty,
    children,
}: {
    state: WidgetState;
    height: number;
    onRetry?: () => void;
    empty?: ReactNode;
    children?: ReactNode;
}) {
    switch (state.kind) {
        case "loading":
            // The skeleton is the final geometry, not a spinner: the card must
            // not change size when the number arrives.
            return (
                <div style={{ height }} className="flex flex-col justify-end gap-3 py-2">
                    <Skeleton className="h-full w-full rounded-control" />
                </div>
            );

        case "empty":
            if (empty) return <div style={{ height }}>{empty}</div>;
            return (
                <div style={{ height }} className="flex flex-col justify-center">
                    <p className="text-body font-medium text-ink">Aun no hay movimientos.</p>
                    <p className="mt-1 max-w-sm text-body-sm text-pewter">
                        Este dato se calcula a partir de tus estados de cuenta.
                    </p>
                    <div className="mt-4">
                        <Link href="/documentos">
                            <Button size="sm" icon={<Upload size={16} />}>
                                Subir documento
                            </Button>
                        </Link>
                    </div>
                </div>
            );

        case "error":
            return (
                <div style={{ height }} className="flex flex-col justify-center">
                    <p className="text-body font-medium text-ink">
                        No pudimos cargar este dato.
                    </p>
                    <p
                        className="mt-1 max-w-sm truncate text-body-sm text-pewter"
                        title={state.message}
                    >
                        {state.message}
                    </p>
                    {onRetry && (
                        <div className="mt-4">
                            <Button size="sm" variant="secondary" onClick={onRetry}>
                                Reintentar
                            </Button>
                        </div>
                    )}
                </div>
            );

        case "insufficient":
            return (
                <div className="flex min-w-0 flex-col">
                    {/* The data still renders. The strip says what it is missing
                        rather than hiding a partial answer behind an empty state. */}
                    <div className="flex items-start gap-2 rounded-control bg-fog px-3 py-2">
                        <Info size={14} className="mt-0.5 shrink-0 text-graphite" aria-hidden />
                        <p className="text-body-sm text-graphite">{state.note}</p>
                    </div>
                    <div className="min-w-0 flex-1">{children}</div>
                </div>
            );

        case "ready":
            return <div className="min-w-0">{children}</div>;
    }
}
