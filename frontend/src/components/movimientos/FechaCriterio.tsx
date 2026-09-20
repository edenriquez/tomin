"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, X } from "lucide-react";
import { DayPicker, type ChevronProps, type DateRange } from "react-day-picker";
import { es } from "react-day-picker/locale";
import { cn } from "@/lib/cn";
import { dayLabel } from "@/lib/format";
import { fromIso, toIso } from "@/lib/movimientosQuery";
import { spanDays } from "@/lib/window";
import {
    FECHA_PRESETS,
    fechaPresetBounds,
    matchFechaPreset,
    parseAnchor,
    type FechaPresetId,
} from "@/lib/fechaCriterio";

/**
 * The date criterion: four pills, and a real calendar behind "Personalizado".
 *
 * The grid is `react-day-picker` rather than the hand-rolled month this file
 * used to import. The reasons were all things the hand-rolled one got wrong and
 * that a calendar library exists to get right: the week started on Sunday in a
 * Mexican product, martes and miércoles were both "M", arrow keys did nothing,
 * and clicking a day of the neighbouring month both paged *and* silently
 * changed the selection. None of those is interesting to own.
 *
 * What is ours is every class on it. No stylesheet is imported from the
 * library: the grid is a real `<table>`, so it lays out without one, and
 * `classNames` maps each of its parts onto a token. A vendor stylesheet would
 * be the one file in the app allowed to disagree with `tokens.ts`.
 *
 * Three decisions worth keeping:
 *
 * - **One month, with dropdowns.** The rail is 252px and two months need over
 *   five hundred; paging blindly across a month boundary was the complaint, and
 *   a month and year you can pick directly answers it inside the width we have.
 * - **A half-made range does not filter.** The selection is held here until it
 *   has both ends, so the list behind the rail does not reload on the first
 *   click and then again on the second. The readout says which end is missing.
 * - **Nothing after the ledger's last day.** The anchor is the newest day with
 *   data, so days past it are disabled rather than selectable-and-empty.
 *
 * The two `<input type="date">` fields are gone. They opened the browser's own
 * calendar on desktop Chrome, which put two different calendars for the same
 * selection in a 220px column.
 */
export function FechaCriterio({
    start,
    end,
    onChange,
    anchor,
    resetKey,
}: {
    start: string;
    end: string;
    onChange: (start: string, end: string) => void;
    /** Newest day on the ledger — "este mes" is that month, not the wall clock. */
    anchor: string;
    resetKey?: string | number | boolean;
}) {
    const at = parseAnchor(anchor);
    const matched = matchFechaPreset(start, end, at);
    const [wantCustom, setWantCustom] = useState(false);

    useEffect(() => {
        setWantCustom(false);
    }, [resetKey]);

    const custom = wantCustom || matched === "custom";
    const active: FechaPresetId | null = custom ? "custom" : matched;

    function pick(id: FechaPresetId) {
        if (id === "custom") {
            setWantCustom(true);
            return;
        }
        setWantCustom(false);
        if (matched === id) {
            onChange("", "");
            return;
        }
        const b = fechaPresetBounds(id, at);
        onChange(b.start, b.end);
    }

    return (
        <section>
            <p className="eyebrow text-ink">Fecha</p>
            <div className="mt-2 grid grid-cols-2 gap-1">
                {FECHA_PRESETS.map((p) => {
                    const on = p.id === "custom" ? active === "custom" : active === p.id;
                    return (
                        <button
                            key={p.id}
                            type="button"
                            aria-pressed={on}
                            onClick={() => pick(p.id)}
                            className={cn(
                                "truncate rounded-control border px-2 py-1 text-left text-label",
                                "transition-colors duration-100",
                                on
                                    ? "border-signal bg-wash/40 font-medium text-ink"
                                    : "border-mist bg-paper text-graphite hover:border-muted hover:text-ink"
                            )}
                        >
                            {p.label}
                        </button>
                    );
                })}
            </div>

            {custom && (
                <RangoPersonalizado
                    start={start}
                    end={end}
                    onChange={onChange}
                    anchor={at}
                    resetKey={resetKey}
                />
            )}

            <Readout start={start} end={end} onClear={() => onChange("", "")} />

            <p className="mt-2 text-label text-ash">
                La fecha acota comercio, categoría y monto.
            </p>
        </section>
    );
}

/* -------------------------------------------------------------------------- */
/* The calendar                                                                */
/* -------------------------------------------------------------------------- */

/** How far back the year dropdown goes. Longer than any statement history a
 *  personal ledger holds, and short enough that the list stays scannable. */
const YEARS_BACK = 8;

function RangoPersonalizado({
    start,
    end,
    onChange,
    anchor,
    resetKey,
}: {
    start: string;
    end: string;
    onChange: (start: string, end: string) => void;
    anchor: Date;
    resetKey?: string | number | boolean;
}) {
    // The selection lives here while it is half made. Committing a `from` with
    // no `to` would reload the list behind the rail for a range the user has
    // not finished describing.
    const [draft, setDraft] = useState<DateRange | undefined>(() => toRange(start, end));
    const [hovered, setHovered] = useState<Date | undefined>(undefined);

    // Follows the props whenever they change from outside — a preset pill, a
    // drag on a chart, the dialog reopening.
    useEffect(() => {
        setDraft(toRange(start, end));
    }, [start, end, resetKey]);

    /** While one end is set, the range the pointer is proposing. */
    const preview = useMemo<DateRange | undefined>(() => {
        if (!draft?.from || draft.to || !hovered) return undefined;
        return draft.from <= hovered
            ? { from: draft.from, to: hovered }
            : { from: hovered, to: draft.from };
    }, [draft, hovered]);

    function handleSelect(next: DateRange | undefined) {
        setDraft(next);
        if (!next?.from) {
            onChange("", "");
            return;
        }
        // Only a finished range reaches the query.
        if (next.to) onChange(toIso(next.from), toIso(next.to));
    }

    return (
        <div className="mt-3">
            <DayPicker
                mode="range"
                selected={draft}
                onSelect={handleSelect}
                onDayMouseEnter={(day) => setHovered(day)}
                onDayMouseLeave={() => setHovered(undefined)}
                modifiers={{ preview }}
                locale={es}
                // Monday. The library reads it from the locale too, but saying
                // it here means a change of locale cannot quietly move it.
                weekStartsOn={1}
                // No days from the neighbouring month: they were the cells that
                // paged and selected in the same click.
                showOutsideDays={false}
                captionLayout="dropdown"
                defaultMonth={draft?.to ?? draft?.from ?? anchor}
                startMonth={new Date(anchor.getFullYear() - YEARS_BACK, 0, 1)}
                endMonth={anchor}
                disabled={{ after: anchor }}
                today={anchor}
                // Arrow keys work the moment the calendar appears, instead of
                // after tabbing into it.
                autoFocus
                components={{ Chevron: RailChevron }}
                classNames={CLASSES}
                modifiersClassNames={{
                    // Lighter than a committed range: it is a proposal, and it
                    // is the only band on screen while one is being made.
                    preview: "bg-wash/25",
                }}
            />
        </div>
    );
}

/** All four orientations, not two: the month and year dropdowns render this
 *  with `orientation="down"`, and defaulting that to a right chevron pointed
 *  the caption's affordance the wrong way. */
function RailChevron({ orientation }: ChevronProps) {
    const Icon =
        orientation === "left"
            ? ChevronLeft
            : orientation === "up"
              ? ChevronUp
              : orientation === "down"
                ? ChevronDown
                : ChevronRight;
    return <Icon size={orientation === "down" ? 13 : 15} aria-hidden className="shrink-0" />;
}

/**
 * Every part of the grid, in tokens. Keyed by the library's own `UI` names.
 *
 * `day` is the table cell and `day_button` is the pressable square inside it;
 * the range wash has to sit on the cell, or it would break into islands with a
 * gap between each day.
 */
const CLASSES = {
    root: "w-full",
    months: "flex flex-col",
    month: "w-full",
    month_caption: "flex items-center justify-center pb-2",
    dropdowns: "flex items-center gap-1",
    dropdown_root: "relative inline-flex items-center",
    dropdown:
        "absolute inset-0 h-full w-full cursor-pointer appearance-none opacity-0",
    caption_label:
        "inline-flex items-center gap-1 rounded-control px-1.5 py-0.5 text-body-sm font-medium text-ink hover:bg-fog",
    nav: "flex items-center justify-between",
    button_previous:
        "inline-flex h-6 w-6 items-center justify-center rounded-control text-graphite transition-colors duration-100 hover:bg-fog hover:text-ink disabled:pointer-events-none disabled:text-mist",
    button_next:
        "inline-flex h-6 w-6 items-center justify-center rounded-control text-graphite transition-colors duration-100 hover:bg-fog hover:text-ink disabled:pointer-events-none disabled:text-mist",
    month_grid: "w-full border-collapse",
    weekdays: "",
    weekday:
        "pb-1 text-caption font-medium uppercase text-ash",
    week: "",
    // The cell carries the wash so a range reads as one band.
    day: "p-0 text-center align-middle",
    day_button:
        "mx-auto flex h-7 w-7 items-center justify-center rounded-full text-label tabular text-ink transition-colors duration-100 hover:bg-fog",
    today: "font-medium text-edge",
    selected: "",
    // The cell keeps the band; the *button* inside the two ends gets filled, so
    // you can see which days you picked and not just that a band exists. The
    // `[&>button]` reaches the day_button, which is this td's only child.
    range_start:
        "rounded-l-full bg-wash/40 [&>button]:bg-signalDeep [&>button]:font-medium [&>button]:text-paper [&>button]:hover:bg-signalDeeper",
    range_middle: "bg-wash/40",
    range_end:
        "rounded-r-full bg-wash/40 [&>button]:bg-signalDeep [&>button]:font-medium [&>button]:text-paper [&>button]:hover:bg-signalDeeper",
    outside: "text-ash",
    disabled: "text-mist",
    hidden: "invisible",
} as const;

/* -------------------------------------------------------------------------- */
/* The readout                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * What is selected, in words, with its length.
 *
 * The rail used to state the range only as two `yyyy-mm-dd` values inside the
 * inputs that set them, so "how long is this window" was arithmetic the reader
 * had to do. It is also the only place that says a range is half made, which
 * is the one state the calendar cannot show on its own.
 */
function Readout({
    start,
    end,
    onClear,
}: {
    start: string;
    end: string;
    onClear: () => void;
}) {
    if (!start && !end) {
        return (
            <p className="mt-3 text-label text-ash">
                Sin acotar: todo el periodo abierto.
            </p>
        );
    }
    const half = !start || !end;
    const days = half ? 0 : spanDays(start, end);

    return (
        <div className="mt-3 flex items-start justify-between gap-2">
            <p className="min-w-0 text-label text-graphite">
                {half ? (
                    <span className="text-ink">Elige el otro extremo</span>
                ) : (
                    <>
                        <span className="font-medium text-ink">
                            {dayLabel(fromIso(start))} – {dayLabel(fromIso(end))}
                        </span>
                        <span className="tabular">
                            {" · "}
                            {days.toLocaleString("es-MX")} día{days === 1 ? "" : "s"}
                        </span>
                    </>
                )}
            </p>
            <button
                type="button"
                onClick={onClear}
                aria-label="Quitar la fecha"
                className="shrink-0 rounded-control p-0.5 text-ash transition-colors duration-100 hover:text-ink"
            >
                <X size={13} aria-hidden />
            </button>
        </div>
    );
}

function toRange(start: string, end: string): DateRange | undefined {
    if (!start && !end) return undefined;
    const from = start ? fromIso(start) : undefined;
    const to = end ? fromIso(end) : undefined;
    if (!from) return to ? { from: to, to } : undefined;
    return { from, to };
}
