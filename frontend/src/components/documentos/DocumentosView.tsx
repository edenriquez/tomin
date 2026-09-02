"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FileText, Smartphone, Trash2, Upload, X } from "lucide-react";
import {
    ACCOUNT_KINDS,
    KIND_LABELS,
    SOURCE_LABELS,
    api,
    type AccountKind,
    type Statement,
} from "@/lib/api";
import { cn } from "@/lib/cn";
import { monthLabel } from "@/lib/format";
import { parsePeriodKey } from "@/lib/metrics";
import {
    BackendNotice,
    Button,
    EmptyState,
    Notice,
    Select,
    Skeleton,
    useToast,
} from "@/components/ui";
import { useAppData } from "@/components/AppChrome";
import { useBankScope } from "@/lib/banks";
import { PanelChoice, PanelControls } from "@/components/settings/PanelControls";
import { PanelSettingsToggle } from "@/components/settings/PanelSettingsToggle";
import { usePanelSettings } from "@/components/settings/usePanelSettings";
import { useStatementUpload } from "@/components/StatementDropzone";

/**
 * Documentos: every statement the account has ingested, with the two things a
 * user can do to one — label the account it came from, and delete it (which
 * also deletes the movements extracted from it).
 *
 * One panel of hairline-separated rows, not a stack of floating cards. These
 * rows are a ledger of the user's own uploads: they should read as one
 * continuous document, and a card each turned a list of eight into eight
 * competing surfaces.
 */

const STATUS_LABELS: Record<string, string> = {
    processed: "Procesado",
    processing: "Procesando",
    failed: "Fallido",
    pending: "Pendiente",
};

/** Status is a dot plus a word: at 12px the dot carries the state and the word
 *  carries the meaning, and neither has to be a coloured pill. */
const STATUS_DOT: Record<string, string> = {
    processed: "bg-positive",
    failed: "bg-negative",
    processing: "bg-ash animate-pulse",
    pending: "bg-ash",
};

/** How long the row a deep link pointed at stays washed. Long enough to find
 *  it once the scroll settles, short enough that it never becomes a state. */
const ARRIVAL_MS = 2000;

const SORTS = ["recent", "bank", "period"] as const;
type Sort = (typeof SORTS)[number];
const SORT_LABELS: Record<Sort, string> = {
    recent: "Recientes",
    bank: "Banco",
    period: "Periodo",
};

/**
 * "Ene – Mar 2026", collapsing the year (and the month) when they repeat.
 *
 * Parsing goes through `parsePeriodKey`, which returns null instead of an
 * Invalid Date: these strings are whatever the API sent, and a hand-rolled
 * `split("-")` turns one unexpected `2026-08-12T00:00:00` into `NaN` and then
 * into a thrown RangeError inside the formatter. Local-midnight parsing also
 * matters — `new Date("2026-08-12")` is UTC midnight, the previous evening in
 * Mexico City, and an off-by-one month on a period boundary.
 */
function periodLabel(s: Statement): string {
    const a = parsePeriodKey(s.period_start);
    const b = parsePeriodKey(s.period_end);
    if (!a && !b) return "Sin periodo";
    if (!a || !b) return monthLabel((a ?? b) as Date, true);
    const sameMonth = a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
    if (sameMonth) return monthLabel(a, true);
    if (a.getFullYear() === b.getFullYear()) {
        return `${monthLabel(a)} – ${monthLabel(b, true)}`;
    }
    return `${monthLabel(a, true)} – ${monthLabel(b, true)}`;
}

/** `uploaded_at` is a datetime, not a date — the day is the part worth
 *  showing. Unparseable timestamps render nothing rather than "Invalid Date". */
function uploadedLabel(iso: string): string | null {
    const d = parsePeriodKey(iso.slice(0, 10));
    return d
        ? d.toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" })
        : null;
}

/** Two letters of the bank, or a generic mark when the parser couldn't name
 *  it. A monogram gives the row an anchor without inventing bank logos. */
function monogram(bank: string | null): string | null {
    if (!bank) return null;
    // ASCII-plus-accents rather than \p{L}: the tsconfig target predates
    // unicode property escapes, and bank names here are Latin script anyway.
    const letters = bank.replace(/[^A-Za-zÀ-ÿ0-9 ]/g, "").trim();
    if (!letters) return null;
    const words = letters.split(/\s+/);
    return (words.length > 1 ? words[0][0] + words[1][0] : letters.slice(0, 2)).toUpperCase();
}

export function DocumentosView() {
    const { dataVersion } = useAppData();
    // Read-only: the archive deliberately ignores the global bank scope — a
    // filtered-out document would read as data loss on the management screen —
    // but when a scope is active, it says so instead of looking inconsistent.
    const bankScope = useBankScope(dataVersion);
    const [items, setItems] = useState<Statement[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const { toast } = useToast();

    const [cfg, setCfg] = usePanelSettings("documentos.lista", { sort: "recent" as string });
    const sort: Sort = (SORTS as readonly string[]).includes(cfg.sort)
        ? (cfg.sort as Sort)
        : "recent";

    const load = useCallback(async () => {
        try {
            const res = await api.statements();
            setItems(res.items);
            setError(null);
        } catch (e) {
            setError((e as Error).message);
            setItems([]);
        }
    }, []);

    // Re-runs when the shell reports an upload, which is what keeps the header
    // button and this list in agreement.
    useEffect(() => {
        load();
    }, [load, dataVersion]);

    // The empty state's own upload button. Same hook as the header's, so the
    // validation, the toasts and the reload are literally the same behaviour.
    const { pick, uploading, input } = useStatementUpload(load);

    /**
     * The deep link the phone hands out after a device upload:
     * `/documentos?statement=<id>`. It is only a pointer — if the id names a
     * document this account doesn't have (deleted, or never arrived), the page
     * behaves like any other visit rather than apologising for a stale link.
     */
    const arrivalId = useSearchParams().get("statement");
    const arrived = useMemo(
        () => (arrivalId ? items?.find((s) => s.id === arrivalId) ?? null : null),
        [arrivalId, items]
    );
    const arrivedId = arrived?.id ?? null;
    const [faded, setFaded] = useState(false);
    const [noticeDismissed, setNoticeDismissed] = useState(false);

    // Keyed on the id rather than on `items`: the array identity changes on
    // every optimistic label edit, and re-lighting the row minutes later would
    // read as a glitch. Starting only once the row exists also means a slow
    // fetch doesn't spend the whole beat on an empty list.
    useEffect(() => {
        if (!arrivedId) return;
        setFaded(false);
        const t = setTimeout(() => setFaded(true), ARRIVAL_MS);
        return () => clearTimeout(t);
    }, [arrivedId]);

    const sorted = useMemo(() => {
        if (!items) return null;
        const rows = [...items];
        // Every comparator falls back to newest-first, so ties inside a bank or
        // a period still read chronologically instead of by insertion order.
        const recency = (s: Statement) => (s.uploaded_at ? Date.parse(s.uploaded_at) : 0);
        rows.sort((x, y) => {
            if (sort === "bank") {
                const c = (x.bank ?? "￿").localeCompare(y.bank ?? "￿", "es-MX");
                if (c !== 0) return c;
            }
            if (sort === "period") {
                const c = (y.period_end ?? "").localeCompare(x.period_end ?? "");
                if (c !== 0) return c;
            }
            return recency(y) - recency(x);
        });
        return rows;
    }, [items, sort]);

    const summary = useMemo(() => {
        if (!items?.length) return null;
        const banks = new Set(items.map((s) => s.bank).filter(Boolean));
        const starts = items.map((s) => s.period_start).filter(Boolean) as string[];
        const ends = items.map((s) => s.period_end).filter(Boolean) as string[];
        const coverage =
            starts.length && ends.length
                ? periodLabel({
                      period_start: starts.reduce((a, b) => (a < b ? a : b)),
                      period_end: ends.reduce((a, b) => (a > b ? a : b)),
                  } as Statement)
                : "—";
        return { count: items.length, banks: banks.size, coverage };
    }, [items]);

    async function setKind(s: Statement, kind: AccountKind | null) {
        // Optimistic: the select already shows the choice; a failure reverts.
        const before = items;
        setItems((cur) =>
            cur ? cur.map((x) => (x.id === s.id ? { ...x, account_kind: kind } : x)) : cur
        );
        try {
            await api.updateStatement(s.id, { account_kind: kind });
        } catch (e) {
            setItems(before ?? null);
            toast(`No se pudo guardar la etiqueta: ${(e as Error).message}`, "negative");
        }
    }

    async function remove(s: Statement) {
        try {
            const res = await api.deleteStatement(s.id);
            toast(`Se eliminaron ${res.transactions_deleted} movimiento(s).`, "positive");
            await load();
        } catch (e) {
            toast(`No se pudo eliminar: ${(e as Error).message}`, "negative");
        }
    }

    return (
        <div className="space-y-4 sm:space-y-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
                <div className="max-w-prose">
                    <h1 className="font-display text-title-md font-normal text-ink sm:text-title-lg">
                        Documentos
                    </h1>
                    <p className="mt-1.5 text-body text-graphite">
                        Todo lo que Tomin ha leído. Etiqueta de qué cuenta viene cada
                        documento; al eliminarlo se borran también sus movimientos.
                    </p>
                </div>
                {summary && <Summary {...summary} />}
            </div>

            {error && <BackendNotice what="la información" detail={error} />}

            {/* Custody as news, not as status: the chip on the row states the
                permanent fact, this line only marks the arrival, and only when
                the phone really was the reader. Dismissible for the same
                reason — news should be closable. */}
            {arrived?.source === "device" && !noticeDismissed && (
                <Notice className="flex items-center justify-between gap-3">
                    Documento recibido desde tu teléfono.
                    <button
                        type="button"
                        aria-label="Ocultar aviso"
                        onClick={() => setNoticeDismissed(true)}
                        className={cn(
                            "-my-1 shrink-0 rounded-control p-1 text-ash",
                            "transition-colors duration-100 hover:bg-paper hover:text-ink"
                        )}
                    >
                        <X size={14} aria-hidden />
                    </button>
                </Notice>
            )}

            {bankScope.selected.length > 0 && (
                <p className="text-body-sm text-graphite">
                    El filtro de bancos no aplica aquí — el archivo siempre muestra todos
                    tus documentos.
                </p>
            )}

            <section className="min-w-0 overflow-hidden rounded-card border border-mist bg-paper shadow-card">
                <div className="border-b border-mist px-5 py-4 sm:px-6">
                    <div className="flex items-center gap-2">
                        <h2 className="font-display text-title-sm font-normal text-ink">
                            Archivo
                        </h2>
                        {sorted && (
                            <span className="text-body-sm text-graphite">{sorted.length}</span>
                        )}
                        <PanelSettingsToggle className="ml-auto" />
                    </div>
                    <PanelControls>
                        <PanelChoice<Sort>
                            label="Ordenar por"
                            value={sort}
                            options={SORTS.map((s) => ({ value: s, label: SORT_LABELS[s] }))}
                            onChange={(s) => setCfg({ sort: s })}
                        />
                    </PanelControls>
                </div>

                {sorted === null ? (
                    <div className="space-y-3 p-5 sm:p-6">
                        {[0, 1, 2].map((i) => (
                            <Skeleton key={i} className="h-14" />
                        ))}
                    </div>
                ) : sorted.length === 0 ? (
                    <div className="px-5 py-4 sm:px-6">
                        <EmptyState
                            icon={FileText}
                            title="Aún no hay documentos"
                            action={
                                <>
                                    <Button
                                        className="text-ink"
                                        loading={uploading}
                                        onClick={pick}
                                        icon={<Upload size={16} />}
                                    >
                                        Subir documento
                                    </Button>
                                    {input}
                                </>
                            }
                        >
                            Sube un estado de cuenta en PDF o una factura del SAT y Tomin
                            extrae los movimientos.
                        </EmptyState>
                    </div>
                ) : (
                    <ul className="divide-y divide-mist">
                        {sorted.map((s) => (
                            <StatementRow
                                key={s.id}
                                statement={s}
                                highlighted={s.id === arrivedId && !faded}
                                onKind={(kind) => setKind(s, kind)}
                                onDelete={() => remove(s)}
                            />
                        ))}
                    </ul>
                )}
            </section>
        </div>
    );
}

/** The three facts about the archive that are worth a glance. Hairline-split
 *  columns rather than three cards: it is one statement about one thing. */
function Summary({
    count,
    banks,
    coverage,
}: {
    count: number;
    banks: number;
    coverage: string;
}) {
    return (
        <dl className="flex divide-x divide-mist rounded-card border border-mist bg-paper shadow-card">
            <Stat label="Documentos" value={String(count)} />
            <Stat label="Bancos" value={String(banks)} />
            <Stat label="Periodo" value={coverage} />
        </dl>
    );
}

function Stat({ label, value }: { label: string; value: string }) {
    return (
        <div className="px-4 py-3 sm:px-5">
            <dt className="text-caption uppercase text-ash">{label}</dt>
            <dd className="mt-0.5 font-display text-metric-sm font-normal tabular-nums text-ink">
                {value}
            </dd>
        </div>
    );
}

function StatementRow({
    statement: s,
    highlighted = false,
    onKind,
    onDelete,
}: {
    statement: Statement;
    /** This is the document a deep link pointed at, for one short beat. */
    highlighted?: boolean;
    onKind: (kind: AccountKind | null) => void;
    onDelete: () => Promise<void>;
}) {
    // Two-tap delete in place of a modal: on the row the context IS the
    // confirmation prompt, and there is no dialog to mis-tap on a phone.
    const [confirming, setConfirming] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const mark = monogram(s.bank);
    const uploaded = s.uploaded_at ? uploadedLabel(s.uploaded_at) : null;
    const ref = useRef<HTMLLIElement>(null);

    // The archive can be long; a wash the user has to hunt for is no arrival at
    // all. Centred rather than top-aligned so the row lands away from the
    // sticky chrome, and smooth only when the OS hasn't asked otherwise.
    useEffect(() => {
        if (!highlighted) return;
        const reduced =
            typeof window !== "undefined" &&
            window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
        ref.current?.scrollIntoView({ block: "center", behavior: reduced ? "auto" : "smooth" });
    }, [highlighted]);

    return (
        <li
            ref={ref}
            className={cn(
                "flex flex-wrap items-center gap-3 px-5 py-4 sm:flex-nowrap sm:px-6",
                // The ring is always there and usually invisible: toggling
                // `ring-1` on and off would snap the outline away at the end of
                // the beat, while a colour can be crossfaded out with the wash.
                "ring-1 ring-inset ring-transparent",
                "transition-[background-color,box-shadow] duration-200",
                highlighted ? "bg-fog ring-edge" : "hover:bg-fog/60"
            )}
        >
            <div
                aria-hidden
                className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-input",
                    "border border-mist bg-fog text-label font-medium text-graphite"
                )}
            >
                {mark ?? <FileText size={16} className="text-ash" />}
            </div>

            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="truncate text-body font-medium text-ink">
                        {s.bank ?? "Banco desconocido"}
                    </span>
                    {/* The custody fact, in the chip idiom the charts use for
                        "Estimado": inert Fog, hairline ring, no accent. It
                        qualifies the document the way that badge qualifies a
                        number — and it is absent, never negated, for the web
                        route and for everything ingested before the field
                        existed. */}
                    {s.source === "device" && (
                        <span
                            title="El archivo original vive en tu teléfono; aquí solo llegaron los datos."
                            className={cn(
                                "inline-flex shrink-0 items-center gap-1 rounded-tag bg-fog px-2 py-0.5",
                                "text-label font-medium text-graphite ring-1 ring-inset ring-mist"
                            )}
                        >
                            <Smartphone size={11} aria-hidden className="text-ash" />
                            Custodiado en tu teléfono
                        </span>
                    )}
                    <span className="inline-flex items-center gap-1.5 text-label text-graphite">
                        <span
                            aria-hidden
                            className={cn(
                                "h-1.5 w-1.5 rounded-full",
                                STATUS_DOT[s.status] ?? "bg-ash"
                            )}
                        />
                        {STATUS_LABELS[s.status] ?? s.status}
                    </span>
                </div>
                <div className="mt-0.5 truncate text-body-sm text-graphite">
                    {SOURCE_LABELS[s.source_type] ?? s.source_type}
                    <Dot />
                    {periodLabel(s)}
                    {uploaded && (
                        <>
                            <Dot />
                            <span className="text-ash">subido {uploaded}</span>
                        </>
                    )}
                </div>
            </div>

            <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
                <Select
                    aria-label={`Tipo de cuenta de ${s.bank ?? "documento"}`}
                    value={s.account_kind}
                    placeholder="Sin etiqueta"
                    options={ACCOUNT_KINDS.map((k) => ({ value: k, label: KIND_LABELS[k] }))}
                    onChange={onKind}
                    className="min-w-36 flex-1 sm:w-40 sm:flex-none"
                />

                {confirming ? (
                    <>
                        <Button
                            size="sm"
                            variant="danger"
                            loading={deleting}
                            onClick={async () => {
                                setDeleting(true);
                                try {
                                    await onDelete();
                                } finally {
                                    setDeleting(false);
                                    setConfirming(false);
                                }
                            }}
                        >
                            ¿Borrar todo?
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
                            Cancelar
                        </Button>
                    </>
                ) : (
                    <Button
                        size="sm"
                        variant="ghost"
                        icon={<Trash2 size={14} />}
                        aria-label={`Eliminar ${s.bank ?? "documento"}`}
                        onClick={() => setConfirming(true)}
                    >
                        <span className="hidden sm:inline">Eliminar</span>
                    </Button>
                )}
            </div>
        </li>
    );
}

function Dot() {
    return <span className="px-1.5 text-mist">·</span>;
}
