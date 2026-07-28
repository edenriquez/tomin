"use client";

import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { Skeleton } from "./Skeleton";

export type Column<T> = {
    key: string;
    header: ReactNode;
    /** Numeric columns right-align and get tabular figures automatically. */
    numeric?: boolean;
    width?: string;
    cell: (row: T) => ReactNode;
};

export type TableProps<T> = {
    columns: Column<T>[];
    rows: T[];
    rowKey: (row: T) => string;
    onRowClick?: (row: T) => void;
    loading?: boolean;
    /** Rendered in place of the body when there are no rows and we aren't loading. */
    empty?: ReactNode;
    skeletonRows?: number;
    className?: string;
    /** Accessible name; a table with no caption is unlabelled to a screen reader. */
    caption?: string;
};

export function Table<T>({
    columns,
    rows,
    rowKey,
    onRowClick,
    loading = false,
    empty,
    skeletonRows = 6,
    className,
    caption,
}: TableProps<T>) {
    const showEmpty = !loading && rows.length === 0;

    return (
        <div className={cn("w-full overflow-x-auto", className)}>
            <table className="w-full border-collapse text-body-sm">
                {caption && <caption className="sr-only">{caption}</caption>}
                <thead>
                    <tr className="border-b border-mist">
                        {columns.map((c) => (
                            <th
                                key={c.key}
                                scope="col"
                                style={{ width: c.width }}
                                className={cn(
                                    // 12px Pewter, sentence case. Uppercase headers
                                    // are shouting at a column of numbers.
                                    "whitespace-nowrap px-3 py-2 text-label font-medium text-pewter",
                                    c.numeric ? "text-right" : "text-left",
                                    "first:pl-0 last:pr-0"
                                )}
                            >
                                {c.header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {loading &&
                        Array.from({ length: skeletonRows }).map((_, i) => (
                            <tr key={i} className="border-b border-mist last:border-0">
                                {columns.map((c) => (
                                    <td key={c.key} className="px-3 py-3 first:pl-0 last:pr-0">
                                        <Skeleton
                                            className={cn("h-4", c.numeric ? "ml-auto w-16" : "w-32")}
                                        />
                                    </td>
                                ))}
                            </tr>
                        ))}
                    {!loading &&
                        rows.map((row) => (
                            <tr
                                key={rowKey(row)}
                                onClick={onRowClick ? () => onRowClick(row) : undefined}
                                className={cn(
                                    "border-b border-mist last:border-0",
                                    onRowClick && "cursor-pointer hover:bg-fog"
                                )}
                            >
                                {columns.map((c) => (
                                    <td
                                        key={c.key}
                                        className={cn(
                                            "px-3 py-2.5 text-ink first:pl-0 last:pr-0",
                                            c.numeric && "tabular text-right"
                                        )}
                                    >
                                        {c.cell(row)}
                                    </td>
                                ))}
                            </tr>
                        ))}
                </tbody>
            </table>
            {showEmpty && (empty ?? <TableEmpty />)}
        </div>
    );
}

export function TableEmpty({ children }: { children?: ReactNode }) {
    return (
        <div className="py-6 text-body-sm text-pewter">
            {children ?? "No hay nada que mostrar todavía."}
        </div>
    );
}

/** Standalone skeleton for when the column set itself isn't known yet. */
export function TableSkeleton({ rows = 6, columns = 4 }: { rows?: number; columns?: number }) {
    return (
        <div className="w-full" aria-hidden>
            <div className="flex gap-3 border-b border-mist py-2">
                {Array.from({ length: columns }).map((_, i) => (
                    <Skeleton key={i} className="h-3 flex-1" />
                ))}
            </div>
            {Array.from({ length: rows }).map((_, r) => (
                <div key={r} className="flex gap-3 border-b border-mist py-3 last:border-0">
                    {Array.from({ length: columns }).map((_, c) => (
                        <Skeleton key={c} className="h-4 flex-1" />
                    ))}
                </div>
            ))}
        </div>
    );
}

export function Pagination({
    page,
    pageSize,
    total,
    onPageChange,
    className,
}: {
    /** 1-based. */
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
    className?: string;
}) {
    const pages = Math.max(1, Math.ceil(total / pageSize));
    const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
    const to = Math.min(page * pageSize, total);

    return (
        <div
            className={cn(
                "flex items-center justify-between gap-4 border-t border-mist pt-3",
                className
            )}
        >
            <p className="tabular text-label text-pewter">
                {from}–{to} de {total}
            </p>
            <div className="flex items-center gap-1">
                <button
                    type="button"
                    onClick={() => onPageChange(page - 1)}
                    disabled={page <= 1}
                    aria-label="Página anterior"
                    className="rounded-control p-1.5 text-graphite hover:bg-fog hover:text-ink disabled:pointer-events-none disabled:opacity-40"
                >
                    <ChevronLeft size={16} />
                </button>
                <span className="tabular px-1 text-label text-pewter">
                    {page} / {pages}
                </span>
                <button
                    type="button"
                    onClick={() => onPageChange(page + 1)}
                    disabled={page >= pages}
                    aria-label="Página siguiente"
                    className="rounded-control p-1.5 text-graphite hover:bg-fog hover:text-ink disabled:pointer-events-none disabled:opacity-40"
                >
                    <ChevronRight size={16} />
                </button>
            </div>
        </div>
    );
}
