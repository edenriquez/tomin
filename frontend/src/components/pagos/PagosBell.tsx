"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { Bell } from "lucide-react";
import { cn } from "@/lib/cn";
import { track } from "@/lib/telemetry";
import { buildDuePair } from "./dueMonth";
import { useRecurringSeries } from "@/components/recurrentes/useRecurringSeries";

/**
 * The header's way into Pagos. The badge counts charges projected to land in
 * the next seven days; its tone follows the closest one, like the calendar.
 */
export function PagosBell({ dataVersion }: { dataVersion: number }) {
    const pathname = usePathname();
    const { dated: items, loading } = useRecurringSeries(dataVersion);
    const active = pathname.startsWith("/pagos");

    const badge = useMemo(() => {
        if (loading) return null;
        const pair = buildDuePair(items);
        const due = [...pair.thisMonth, ...pair.upcoming].filter(
            (l) => l.status === "due" && (l.urgency === "urgent" || l.urgency === "soon")
        );
        if (due.length === 0) return null;
        return {
            count: due.length,
            urgent: due.some((l) => l.urgency === "urgent"),
        };
    }, [items, loading]);

    const title = badge
        ? `Pagos · ${badge.count} en los próximos 7 días`
        : "Pagos";

    return (
        <Link
            href="/pagos"
            onClick={() => track("nav.view", { to: "/pagos", source: "header" })}
            aria-current={active ? "page" : undefined}
            aria-label={title}
            title={title}
            className={cn(
                "relative inline-flex h-9 items-center gap-2 rounded-control px-3 text-body",
                "transition-colors duration-100",
                active
                    ? "bg-fog font-medium text-ink ring-1 ring-inset ring-mist"
                    : "text-graphite hover:text-ink"
            )}
        >
            <Bell size={15} aria-hidden />
            <span className="hidden sm:inline">Pagos</span>
            {badge && (
                <span
                    aria-hidden
                    className={cn(
                        "tabular inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1.5",
                        "text-caption font-medium leading-none text-paper",
                        badge.urgent ? "bg-negative due-pulse-soon" : "bg-soot"
                    )}
                >
                    {badge.count}
                </span>
            )}
        </Link>
    );
}
