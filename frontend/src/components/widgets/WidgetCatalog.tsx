"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Check, Lock } from "lucide-react";
import { cn } from "@/lib/cn";
import { fetchCatalog, type MetricSpec } from "@/lib/metrics";
import { Skeleton, Tag } from "@/components/ui";
import { resolveWidget } from "@/widgets/registry";
import { firstUnmet, requirementCopy, useCapabilities } from "@/widgets/useCapabilities";
import { useHomeLayoutContext } from "@/widgets/HomeLayoutProvider";

/**
 * The widget picker.
 *
 * It lists *everything* the catalog declares, including what this account
 * cannot use yet — dimmed, with the condition that unlocks it and a link to
 * the action that satisfies it. That turns the catalog into the onboarding
 * surface instead of hiding half the product from a new user.
 */
export function WidgetCatalog({ onPicked }: { onPicked?: () => void }) {
    const [specs, setSpecs] = useState<MetricSpec[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const { capabilities } = useCapabilities();
    const layout = useHomeLayoutContext();

    useEffect(() => {
        let alive = true;
        fetchCatalog()
            .then((items) => alive && setSpecs(items))
            .catch((e: Error) => alive && setError(e.message));
        return () => {
            alive = false;
        };
    }, []);

    const groups = useMemo(() => {
        const byGroup = new Map<string, MetricSpec[]>();
        for (const spec of specs ?? []) {
            const list = byGroup.get(spec.group) ?? [];
            list.push(spec);
            byGroup.set(spec.group, list);
        }
        return Array.from(byGroup.entries());
    }, [specs]);

    if (error) {
        return (
            <div>
                <p className="text-body font-medium text-ink">No pudimos cargar el catalogo.</p>
                <p className="mt-1 text-body-sm text-pewter">
                    Revisa que el backend este corriendo en el puerto 8000.
                </p>
            </div>
        );
    }

    if (!specs) {
        return (
            <div className="space-y-3">
                {[0, 1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full rounded-card" />
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {groups.map(([group, items]) => (
                <section key={group}>
                    <h3 className="mb-2 text-label font-semibold uppercase text-pewter">
                        {group}
                    </h3>
                    <ul className="space-y-2">
                        {items.map((spec: MetricSpec) => {
                            const def = resolveWidget(spec);
                            const unmet = firstUnmet(spec.requires, capabilities);
                            const active = layout.widgets.some((w) => w.metricId === spec.id);
                            return (
                                <CatalogRow
                                    key={spec.id}
                                    title={def.title}
                                    blurb={def.blurb}
                                    quality={def.quality}
                                    active={active}
                                    unmet={unmet}
                                    onToggle={() => {
                                        layout.toggle(spec.id);
                                        onPicked?.();
                                    }}
                                />
                            );
                        })}
                    </ul>
                </section>
            ))}
        </div>
    );
}

function CatalogRow({
    title,
    blurb,
    quality,
    active,
    unmet,
    onToggle,
}: {
    title: string;
    blurb: string;
    quality?: "estimate" | "beta";
    active: boolean;
    unmet: string | null;
    onToggle: () => void;
}) {
    const locked = unmet !== null;
    const copy = locked ? requirementCopy(unmet) : null;

    return (
        <li
            className={cn(
                "flex items-start gap-3 rounded-card border border-mist p-3",
                locked && "opacity-60"
            )}
        >
            <button
                type="button"
                role="checkbox"
                aria-checked={active}
                aria-label={active ? `Quitar ${title}` : `Agregar ${title}`}
                disabled={locked}
                onClick={onToggle}
                className={cn(
                    "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-tag border",
                    "disabled:cursor-not-allowed",
                    active ? "border-ember bg-ember text-ink" : "border-mist bg-paper"
                )}
            >
                {active && <Check size={14} aria-hidden />}
            </button>

            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-body font-medium text-ink">{title}</span>
                    {quality === "estimate" && <Tag tone="estimate">Estimado</Tag>}
                    {quality === "beta" && <Tag tone="estimate">Beta</Tag>}
                </div>
                <p className="mt-0.5 text-body-sm text-pewter">{blurb}</p>

                {copy && (
                    <p className="mt-2 flex flex-wrap items-center gap-2">
                        <Tag tone="neutral" icon={<Lock size={11} aria-hidden />}>
                            {copy.label}
                        </Tag>
                        <Link
                            href={copy.href}
                            className="text-body-sm font-medium text-graphite underline underline-offset-2 hover:text-ink"
                        >
                            {copy.action}
                        </Link>
                    </p>
                )}
            </div>
        </li>
    );
}
