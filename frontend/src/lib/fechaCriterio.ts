import { resolveWindow } from "./window";
import { fromIso, toIso } from "./movimientosQuery";

/** Date pills in the movimientos criterios rail — calendar months, not the
 *  rolling 7/14/30d windows the rest of the app uses. */
export const FECHA_PRESETS = [
    { id: "month", label: "Este mes" },
    { id: "last_month", label: "Mes pasado" },
    { id: "3m", label: "Últimos 3m" },
    { id: "custom", label: "Personalizado" },
] as const;

export type FechaPresetId = (typeof FECHA_PRESETS)[number]["id"];

export function fechaPresetBounds(
    id: Exclude<FechaPresetId, "custom">,
    anchor: Date
): { start: string; end: string } {
    if (id === "3m") {
        const bounds = resolveWindow("3m", anchor);
        return { start: bounds.start ?? toIso(anchor), end: bounds.end ?? toIso(anchor) };
    }
    const y = anchor.getFullYear();
    const m = anchor.getMonth();
    if (id === "month") {
        return { start: toIso(new Date(y, m, 1)), end: toIso(anchor) };
    }
    return {
        start: toIso(new Date(y, m - 1, 1)),
        end: toIso(new Date(y, m, 0)),
    };
}

/** Which pill is pressed for these bounds. Empty range is none. */
export function matchFechaPreset(
    start: string,
    end: string,
    anchor: Date
): FechaPresetId | null {
    if (!start && !end) return null;
    for (const id of ["month", "last_month", "3m"] as const) {
        const b = fechaPresetBounds(id, anchor);
        if (b.start === start && b.end === end) return id;
    }
    return "custom";
}

export function parseAnchor(iso: string): Date {
    return fromIso(iso);
}
