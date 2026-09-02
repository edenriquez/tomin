"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity } from "lucide-react";
import { cn } from "@/lib/cn";
import { colors } from "@/design/tokens";
import { telemetryApi, type UiEvent } from "@/lib/telemetry";
import { BackendNotice, EmptyState, Skeleton } from "@/components/ui";

/**
 * Where attention goes: the interaction log, read back as heat.
 *
 * Every figure here is a count of things a person did. The view exists for
 * one decision — how Movimientos should be ordered — so the first card is the
 * one that answers it directly (chart or list?), and the matrix below is the
 * general instrument: what, where, how often.
 *
 * Form follows the data's job. Counts by name × view are *magnitude*, so the
 * matrix is one hue, light to dark — never a rainbow, and the number is printed
 * in every cell that has one, so colour is a reading aid and not the only
 * reading. Hours and days are magnitude too, in the user's own clock.
 */
const RANGES = [7, 30, 90] as const;

export function TelemetryView() {
    const [days, setDays] = useState<(typeof RANGES)[number]>(30);
    const [events, setEvents] = useState<UiEvent[] | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let stale = false;
        telemetryApi
            .recent(days)
            .then((res) => {
                if (stale) return;
                setEvents(res.items);
                setError(null);
            })
            .catch((e) => !stale && setError((e as Error).message));
        return () => {
            stale = true;
        };
    }, [days]);

    const model = useMemo(() => (events ? build(events, days) : null), [events, days]);

    return (
        <div className="space-y-4 sm:space-y-6">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
                <div>
                    <h1 className="font-display text-title font-normal text-ink">Puntos de calor</h1>
                    <p className="mt-1 text-body-sm text-graphite">
                        Lo que se toca, dónde y cuánto. Solo tus propias interacciones; nada sale de aquí.
                    </p>
                </div>
                <div role="group" aria-label="Rango" className="inline-flex items-center gap-0.5 rounded-control border border-mist bg-fog p-1">
                    {RANGES.map((n) => (
                        <button
                            key={n}
                            type="button"
                            aria-pressed={days === n}
                            onClick={() => setDays(n)}
                            className={cn(
                                "rounded-control px-3 py-1.5 text-body-sm transition-colors duration-200",
                                days === n ? "bg-paper font-medium text-ink shadow-card" : "text-graphite hover:text-ink"
                            )}
                        >
                            {n} días
                        </button>
                    ))}
                </div>
            </div>

            {error && <BackendNotice what="la telemetría" detail={error} />}

            {events === null && !error ? (
                <div className="space-y-4">
                    <Skeleton className="h-28" />
                    <Skeleton className="h-72" />
                </div>
            ) : model && model.total === 0 ? (
                <EmptyState icon={Activity} title="Todavía no hay interacciones">
                    Usa la app un rato — cada clic, arrastre y búsqueda se registra y aparece aquí.
                </EmptyState>
            ) : model ? (
                <>
                    <Verdict model={model} />
                    <Card title="Qué se toca, y dónde" hint="Eventos por vista. Más oscuro, más veces.">
                        <Matrix model={model} />
                    </Card>
                    <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
                        <Card title="A qué hora" hint="Hora local del navegador.">
                            <Strip cells={model.hours} label={(i) => `${String(i).padStart(2, "0")}h`} />
                        </Card>
                        <Card title="Qué días" hint={`Últimos ${days} días, de izquierda a derecha.`}>
                            <Strip cells={model.byDay.map((d) => d.count)} label={(i) => model.byDay[i].day.slice(5)} every={Math.max(1, Math.floor(model.byDay.length / 6))} />
                        </Card>
                    </div>
                    <Card title="Tabla" hint="Los mismos números, para leer o copiar.">
                        <Table model={model} />
                    </Card>
                </>
            ) : null}
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/* The decision this view exists for                                           */
/* -------------------------------------------------------------------------- */

function Verdict({ model }: { model: Model }) {
    const chart = model.count("movimientos.row_select", "chart");
    const list = model.count("movimientos.row_select", "list");
    const picks = chart + list;
    const drags = model.byName.get("window.select")?.bySource ?? new Map<string, number>();
    const dragged = Array.from(drags.entries()).filter(([k]) => k.startsWith("drag")).reduce((a, [, n]) => a + n, 0);
    const picker = drags.get("picker") ?? 0;
    const preset = drags.get("preset") ?? 0;
    const searches = model.byName.get("movimientos.search")?.total ?? 0;
    const more = model.byName.get("movimientos.show_more")?.total ?? 0;

    return (
        <div className="grid gap-4 sm:grid-cols-3">
            <Tile
                label="Cómo se elige un movimiento"
                value={picks ? `${Math.round((list / picks) * 100)}% lista` : "—"}
                detail={picks ? `${list} desde la lista · ${chart} desde la gráfica` : "sin selecciones aún"}
            />
            <Tile
                label="Cómo se acota el periodo"
                value={preset + dragged + picker ? top([["presets", preset], ["arrastre", dragged], ["fechas", picker]]) : "—"}
                detail={`${preset} presets · ${dragged} arrastres · ${picker} con fechas`}
            />
            <Tile
                label="Buscar vs. desplazar"
                value={searches + more ? `${searches} / ${more}` : "—"}
                detail="búsquedas iniciadas / veces «mostrar más»"
            />
        </div>
    );
}

function top(pairs: [string, number][]): string {
    const [name, n] = pairs.sort((a, b) => b[1] - a[1])[0];
    const total = pairs.reduce((a, [, v]) => a + v, 0);
    return `${Math.round((n / total) * 100)}% ${name}`;
}

function Tile({ label, value, detail }: { label: string; value: string; detail: string }) {
    return (
        <div className="rounded-card border border-mist bg-paper p-5 shadow-card">
            <p className="text-label text-graphite">{label}</p>
            <p className="tabular mt-2 font-display text-title-sm font-normal text-ink">{value}</p>
            <p className="mt-1 text-label text-ash">{detail}</p>
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/* The matrix                                                                  */
/* -------------------------------------------------------------------------- */

function Matrix({ model }: { model: Model }) {
    const max = Math.max(1, ...model.names.flatMap((n) => model.paths.map((p) => model.cell(n, p))));
    return (
        <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-0.5 text-body-sm">
                <thead>
                    <tr className="text-left text-label text-graphite">
                        <th className="py-2 pr-3 font-medium">Evento</th>
                        {model.paths.map((p) => (
                            <th key={p} className="px-1 py-2 text-center font-medium">{viewName(p)}</th>
                        ))}
                        <th className="py-2 pl-3 text-right font-medium">Total</th>
                    </tr>
                </thead>
                <tbody>
                    {model.names.map((name) => (
                        <tr key={name}>
                            <td className="whitespace-nowrap py-1 pr-3 font-mono text-label text-ink">{name}</td>
                            {model.paths.map((p) => {
                                const n = model.cell(name, p);
                                return (
                                    <td key={p} className="p-0">
                                        <div
                                            title={`${name} · ${viewName(p)} · ${n}`}
                                            className="tabular flex h-9 min-w-14 items-center justify-center rounded-input text-label"
                                            style={{
                                                background: heat(n, max),
                                                color: n / max > 0.55 ? colors.paper : colors.ink,
                                            }}
                                        >
                                            {n || ""}
                                        </div>
                                    </td>
                                );
                            })}
                            <td className="tabular py-1 pl-3 text-right text-ink">{model.byName.get(name)?.total ?? 0}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function Strip({ cells, label, every = 3 }: { cells: number[]; label: (i: number) => string; every?: number }) {
    const max = Math.max(1, ...cells);
    return (
        <div>
            <div className="flex gap-0.5">
                {cells.map((n, i) => (
                    <div
                        key={i}
                        title={`${label(i)} · ${n}`}
                        className="h-10 flex-1 rounded-input"
                        style={{ background: heat(n, max) }}
                    />
                ))}
            </div>
            <div className="mt-1 flex text-caption text-ash">
                {cells.map((_, i) => (
                    <span key={i} className="flex-1 text-center">{i % every === 0 ? label(i) : ""}</span>
                ))}
            </div>
        </div>
    );
}

function Table({ model }: { model: Model }) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full border-collapse text-body-sm">
                <thead>
                    <tr className="border-b border-mist text-left text-label text-graphite">
                        <th className="py-2 pr-4 font-medium">Evento</th>
                        <th className="py-2 pr-4 font-medium">Vista</th>
                        <th className="py-2 pr-4 font-medium">Detalle</th>
                        <th className="py-2 text-right font-medium">Veces</th>
                    </tr>
                </thead>
                <tbody>
                    {model.rows.map((r) => (
                        <tr key={`${r.name}|${r.path}|${r.source}`} className="border-b border-mist/60">
                            <td className="py-1.5 pr-4 font-mono text-label text-ink">{r.name}</td>
                            <td className="py-1.5 pr-4 text-graphite">{viewName(r.path)}</td>
                            <td className="py-1.5 pr-4 text-graphite">{r.source ?? "—"}</td>
                            <td className="tabular py-1.5 text-right text-ink">{r.count}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function Card({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
    return (
        <section className="min-w-0 rounded-card border border-mist bg-paper p-5 shadow-card sm:p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-display text-title-sm font-normal text-ink">{title}</h2>
                {hint && <span className="text-label text-ash">{hint}</span>}
            </div>
            <div className="mt-4">{children}</div>
        </section>
    );
}

/* -------------------------------------------------------------------------- */
/* Aggregation                                                                 */
/* -------------------------------------------------------------------------- */

type NameStat = { total: number; bySource: Map<string, number> };
type Row = { name: string; path: string; source: string | null; count: number };

type Model = {
    total: number;
    names: string[];
    paths: string[];
    byName: Map<string, NameStat>;
    rows: Row[];
    hours: number[];
    byDay: { day: string; count: number }[];
    cell: (name: string, path: string) => number;
    count: (name: string, source: string) => number;
};

function build(events: UiEvent[], days: number): Model {
    const cells = new Map<string, number>();
    const byName = new Map<string, NameStat>();
    const rows = new Map<string, Row>();
    const paths = new Map<string, number>();
    const hours = Array<number>(24).fill(0);
    const dayCounts = new Map<string, number>();

    for (const e of events) {
        const key = `${e.name}|${e.path}`;
        cells.set(key, (cells.get(key) ?? 0) + 1);
        paths.set(e.path, (paths.get(e.path) ?? 0) + 1);
        const stat = byName.get(e.name) ?? { total: 0, bySource: new Map() };
        stat.total += 1;
        // The one prop worth a column: where a gesture came from.
        const source = sourceOf(e);
        if (source) stat.bySource.set(source, (stat.bySource.get(source) ?? 0) + 1);
        byName.set(e.name, stat);
        const rk = `${key}|${source ?? ""}`;
        const row = rows.get(rk) ?? { name: e.name, path: e.path, source, count: 0 };
        row.count += 1;
        rows.set(rk, row);
        const at = new Date(e.occurred_at);
        hours[at.getHours()] += 1;
        const day = localDay(at);
        dayCounts.set(day, (dayCounts.get(day) ?? 0) + 1);
    }

    const byDay: { day: string; count: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const day = localDay(d);
        byDay.push({ day, count: dayCounts.get(day) ?? 0 });
    }

    return {
        total: events.length,
        names: Array.from(byName.entries()).sort((a, b) => b[1].total - a[1].total).map(([n]) => n),
        paths: Array.from(paths.entries()).sort((a, b) => b[1] - a[1]).map(([p]) => p),
        byName,
        rows: Array.from(rows.values()).sort((a, b) => b.count - a.count),
        hours,
        byDay,
        cell: (name, path) => cells.get(`${name}|${path}`) ?? 0,
        count: (name, source) => byName.get(name)?.bySource.get(source) ?? 0,
    };
}

function sourceOf(e: UiEvent): string | null {
    const p = e.props ?? {};
    if (typeof p.source === "string") return p.source;
    if (typeof p.kind === "string") return p.kind;
    if (typeof p.mode === "string") return p.mode;
    return null;
}

function localDay(d: Date): string {
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${m}-${day}`;
}

/** One hue, light to dark. Square-root so a single hot cell does not wash
 *  every other one out to white. */
function heat(n: number, max: number): string {
    if (n === 0) return colors.fog;
    const t = 0.15 + 0.85 * Math.sqrt(n / max);
    return `${colors.signal}${Math.round(t * 255).toString(16).padStart(2, "0")}`;
}

const VIEW_NAMES: Record<string, string> = {
    "/": "Movimientos",
    "/categorias": "Categorías",
    "/fijos": "Fijos",
    "/pronostico": "Pronóstico",
    "/recurrentes": "Fijos",
    "/precios": "Precios",
    "/workspace": "Lecturas",
    "/documentos": "Documentos",
    "/dev/telemetria": "Telemetría",
};

function viewName(path: string): string {
    if (VIEW_NAMES[path]) return VIEW_NAMES[path];
    if (path.startsWith("/workspace/")) return "Lecturas · detalle";
    return path;
}
