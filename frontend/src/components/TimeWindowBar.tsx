"use client";

import { forwardRef, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarDays, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { dayLabel } from "@/lib/format";
import { WINDOW_LABELS, WINDOW_VOCABULARY, type TimeWindow } from "@/lib/window";
import { useSettings } from "@/components/settings/SettingsProvider";
import { usePortal } from "@/components/ui/usePortal";
import { useTimeWindow } from "@/components/TimeWindowProvider";

/**
 * The time filter, in the header of every view.
 *
 * One segmented control: the enabled presets, and one more segment for two
 * dates. Whichever way the span was chosen — a segment, the picker, or a drag
 * across a chart — this control shows it, because a filter the user cannot see
 * is a filter they cannot trust the numbers under.
 *
 * It is drawn as one piece, not a row of pills: a hairline capsule on Fog with
 * the active segment raised on Paper. That is what makes it read as part of
 * the header furniture rather than as a toolbar someone bolted on below it.
 *
 * `disabled` is for views that read the whole history on purpose (Precios,
 * Fijos, Documentos). The control stays — the selection is still yours
 * and still waits for the next view — but it says so instead of pretending to act.
 */
export function TimeWindowBar({ disabled = false }: { disabled?: boolean }) {
    const { settings } = useSettings();
    const { window: active, anchor, selectPreset, selectCustom, clearCustom } = useTimeWindow();

    const shown = WINDOW_VOCABULARY.filter((w) => settings.windows.includes(w));
    const isCustom = active.kind === "custom";

    // The raised segment is one element that travels. Each button reports its
    // rectangle; the thumb is positioned under whichever is active and moves
    // with a transition, so switching from "30 días" to "3 meses" glides
    // rather than blinking off one and on the other.
    const groupRef = useRef<HTMLDivElement>(null);
    const segmentRefs = useRef(new Map<string, HTMLElement>());
    const [thumb, setThumb] = useState<{ x: number; w: number } | null>(null);
    const activeKey = isCustom ? "custom" : active.kind === "preset" ? active.id : "";
    const register = useCallback((key: string) => (el: HTMLElement | null) => {
        if (el) segmentRefs.current.set(key, el);
        else segmentRefs.current.delete(key);
    }, []);
    useLayoutEffect(() => {
        const place = () => {
            const group = groupRef.current;
            const el = segmentRefs.current.get(activeKey);
            if (!group || !el) return setThumb(null);
            const g = group.getBoundingClientRect();
            const r = el.getBoundingClientRect();
            setThumb({ x: r.left - g.left + group.scrollLeft, w: r.width });
        };
        place();
        const observer = new ResizeObserver(place);
        if (groupRef.current) observer.observe(groupRef.current);
        return () => observer.disconnect();
    }, [activeKey, shown.length]);

    return (
        <div
            role="group"
            aria-label="Periodo"
            aria-disabled={disabled || undefined}
            title={
                disabled
                    ? "Esta vista muestra todo el historial; el periodo aplica en las demás."
                    : undefined
            }
            ref={groupRef}
            className={cn(
                "relative inline-flex max-w-full items-center gap-0.5 overflow-x-auto rounded-control",
                "border border-mist bg-fog p-1",
                disabled && "opacity-55"
            )}
        >
            {thumb && (
                <span
                    aria-hidden
                    className="pointer-events-none absolute bottom-1 top-1 rounded-control bg-paper shadow-card transition-[transform,width] duration-300 ease-out"
                    style={{ width: thumb.w, transform: `translateX(${thumb.x}px)`, left: 0 }}
                />
            )}
            {shown.map((id) => {
                const current = !isCustom && active.kind === "preset" && active.id === id;
                return (
                    <button
                        key={id}
                        ref={register(id)}
                        type="button"
                        aria-pressed={current}
                        disabled={disabled}
                        onClick={() => selectPreset(id)}
                        title={
                            id === "all"
                                ? "Todo tu historial"
                                : `${WINDOW_LABELS[id]} hasta el ${dayLabel(fromIso(anchor))}, tu último movimiento`
                        }
                        className={cn(SEGMENT, current ? SEGMENT_ON : SEGMENT_OFF)}
                    >
                        {WINDOW_LABELS[id]}
                    </button>
                );
            })}

            <span aria-hidden className="mx-1 h-4 w-px shrink-0 bg-mist" />
            <CustomSegment
                ref={register("custom")}
                active={active}
                disabled={disabled}
                onApply={(a, b) => selectCustom(a, b, "picker")}
                onClear={clearCustom}
            />
        </div>
    );
}

/**
 * Two dates, as one segment.
 *
 * Idle it reads "Fechas"; while a custom range is on it reads the range itself
 * ("12 ago – 25 ago") with an × that returns to the previous preset. Either
 * opens the picker: two native date inputs — no calendar widget to learn, and
 * the phone's own picker on a phone.
 *
 * The picker is rendered through a portal, positioned from the segment's own
 * rectangle. Inside the control it would be clipped: the capsule scrolls
 * horizontally on narrow screens, and an overflow container swallows anything
 * absolutely positioned past its edge — which is exactly where a popover goes.
 */
const CustomSegment = forwardRef<HTMLSpanElement, {
    active: TimeWindow;
    disabled: boolean;
    onApply: (start: string, end: string) => void;
    onClear: () => void;
}>(function CustomSegment({ active, disabled, onApply, onClear }, ref) {
    const [open, setOpen] = useState(false);
    const isCustom = active.kind === "custom";
    const [start, setStart] = useState(isCustom ? active.start : "");
    const [end, setEnd] = useState(isCustom ? active.end : "");
    const anchorRef = useRef<HTMLButtonElement>(null);
    const panelRef = useRef<HTMLFormElement>(null);
    const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
    const mounted = usePortal();

    // The inputs follow the selection: a range dragged on a chart must show
    // up here as the dates it covers, ready to be nudged.
    useEffect(() => {
        if (active.kind === "custom") {
            setStart(active.start);
            setEnd(active.end);
        }
    }, [active]);

    // Anchored under the segment, right-aligned to it, and kept on screen.
    useLayoutEffect(() => {
        if (!open) return;
        const place = () => {
            const a = anchorRef.current?.getBoundingClientRect();
            if (!a) return;
            const width = panelRef.current?.offsetWidth ?? 320;
            const left = Math.max(12, Math.min(a.right - width, window.innerWidth - width - 12));
            setPos({ top: a.bottom + 8, left });
        };
        place();
        window.addEventListener("resize", place);
        window.addEventListener("scroll", place, true);
        return () => {
            window.removeEventListener("resize", place);
            window.removeEventListener("scroll", place, true);
        };
    }, [open]);

    useEffect(() => {
        if (!open) return;
        function onDown(e: PointerEvent) {
            const t = e.target as Node;
            if (panelRef.current?.contains(t) || anchorRef.current?.contains(t)) return;
            setOpen(false);
        }
        function onKey(e: KeyboardEvent) {
            if (e.key === "Escape") setOpen(false);
        }
        window.addEventListener("pointerdown", onDown);
        window.addEventListener("keydown", onKey);
        return () => {
            window.removeEventListener("pointerdown", onDown);
            window.removeEventListener("keydown", onKey);
        };
    }, [open]);

    const valid = Boolean(start && end);

    return (
        <>
            <span ref={ref} className={cn("relative z-10 inline-flex items-center rounded-control", isCustom && "font-medium text-ink")}>
                <button
                    ref={anchorRef}
                    type="button"
                    aria-pressed={isCustom}
                    aria-expanded={open}
                    aria-haspopup="dialog"
                    disabled={disabled}
                    onClick={() => setOpen((v) => !v)}
                    className={cn(
                        SEGMENT,
                        "inline-flex items-center gap-1.5",
                        isCustom ? "text-ink" : SEGMENT_OFF
                    )}
                >
                    <CalendarDays size={14} aria-hidden className={isCustom ? "" : "text-ash"} />
                    {isCustom ? rangeLabel(active.start, active.end) : "Fechas"}
                </button>
                {isCustom && (
                    <button
                        type="button"
                        aria-label="Quitar el rango de fechas"
                        disabled={disabled}
                        onClick={onClear}
                        className="-ml-1 mr-1 inline-flex size-5 items-center justify-center rounded-control text-graphite hover:bg-fog hover:text-ink"
                    >
                        <X size={12} aria-hidden />
                    </button>
                )}
            </span>

            {mounted &&
                open &&
                createPortal(
                    <form
                        ref={panelRef}
                        role="dialog"
                        aria-label="Elegir fechas"
                        style={pos ? { top: pos.top, left: pos.left } : { visibility: "hidden" }}
                        className={cn(
                            "fixed z-50 w-[320px] rounded-card border border-mist bg-paper p-4",
                            "shadow-float"
                        )}
                        onSubmit={(e) => {
                            e.preventDefault();
                            if (!valid) return;
                            onApply(start, end);
                            setOpen(false);
                        }}
                    >
                        <p className="text-label text-graphite">Rango de fechas</p>
                        <div className="mt-3 grid grid-cols-2 gap-3">
                            <label className="flex flex-col gap-1">
                                <span className="text-caption uppercase tracking-wide text-ash">Desde</span>
                                <input
                                    type="date"
                                    autoFocus
                                    value={start}
                                    max={end || undefined}
                                    onChange={(e) => setStart(e.target.value)}
                                    className={INPUT}
                                />
                            </label>
                            <label className="flex flex-col gap-1">
                                <span className="text-caption uppercase tracking-wide text-ash">Hasta</span>
                                <input
                                    type="date"
                                    value={end}
                                    min={start || undefined}
                                    onChange={(e) => setEnd(e.target.value)}
                                    className={INPUT}
                                />
                            </label>
                        </div>
                        <div className="mt-4 flex items-center justify-between gap-2">
                            <span className="text-label text-ash">
                                {valid ? `${rangeLabel(start, end)} · ${days(start, end)} días` : "Elige ambas fechas"}
                            </span>
                            <span className="flex gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => setOpen(false)}
                                    className="rounded-control px-3 py-1.5 text-body-sm text-graphite hover:text-ink"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={!valid}
                                    className={cn(
                                        "rounded-control bg-soot px-3.5 py-1.5 text-body-sm font-medium text-paper",
                                        !valid && "opacity-40"
                                    )}
                                >
                                    Aplicar
                                </button>
                            </span>
                        </div>
                    </form>,
                    document.body
                )}
        </>
    );
});

function rangeLabel(start: string, end: string): string {
    const from = dayLabel(fromIso(start));
    const to = dayLabel(fromIso(end));
    return start === end ? from : `${from} – ${to}`;
}

function days(start: string, end: string): number {
    const ms = fromIso(end).getTime() - fromIso(start).getTime();
    return Math.round(ms / 86_400_000) + 1;
}

/** Local midnight, so the label is the day the user picked and not the one before. */
function fromIso(day: string): Date {
    const [y, m, d] = day.split("-").map(Number);
    return new Date(y, m - 1, d);
}

const SEGMENT =
    "relative z-10 shrink-0 whitespace-nowrap rounded-control px-3 py-1.5 text-body-sm transition-colors duration-200";
// The raised Paper surface is the thumb behind the row (see the group); the
// active segment itself only firms its text, so the surface can glide between
// segments without either of them repainting.
const SEGMENT_ON = "font-medium text-ink";
const SEGMENT_OFF = "text-graphite hover:text-ink";
const INPUT =
    "h-9 rounded-input border border-mist bg-paper px-2 text-body-sm text-ink outline-none focus:border-ink";
