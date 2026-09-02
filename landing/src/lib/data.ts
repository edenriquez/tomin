/**
 * The one set of fake-but-plausible numbers both POCs quote, so the comparison
 * between /b and /d is about design, not about which one got the better copy.
 * Everything is in pesos and deliberately unglamorous — the product's voice.
 */
export const FIGURES = {
    /** The hero number on /b: a year of coffees. */
    heroAmount: "$4,812.00",
    heroCaption: "lo que se fue en cafés este año",

    movements: 214,
    movementsCaption: "movimientos en un estado de cuenta de Nu",

    categoriesTop: "Súper",
    categoriesTopShare: "31%",

    fixedCount: 3,
    fixedMonthly: "$487.00",
    fixedCaption: "suscripciones que no recordabas",

    forecastNeed: "$9,140",
    forecastCaption: "fijos antes de la próxima quincena",

    ticketStore: "SORIANA",
    ticketTotal: "$1,412.60",
    ticketItem: "Leche 1L",
    ticketDelta: "+19%",
    ticketLine: "La leche te subió 19%.",
} as const;

/** Scatter dots for the story and the Movimientos mock, in a 0–100 × 0–80 box. */
export const SCATTER: ReadonlyArray<readonly [number, number, number]> = [
    [8, 62, 3], [16, 70, 3], [22, 55, 3.5], [30, 66, 3], [36, 48, 3],
    [44, 60, 3.5], [52, 68, 3], [58, 52, 3], [66, 63, 3], [74, 58, 3.5],
    [82, 66, 3], [90, 50, 3], [40, 30, 3], [70, 36, 3],
];

/** The outlier: the reason the scatter exists. */
export const OUTLIER: readonly [number, number, number] = [62, 12, 4.5];

/** Month stacks [dark, mid, signal] for the Categorías mock. */
export const STACKS: ReadonlyArray<readonly [number, number, number]> = [
    [26, 14, 8], [18, 20, 10], [30, 10, 12], [22, 16, 8], [34, 12, 10],
];

/** Calendar cells with a charge (0–41, 14 columns × 3 rows). */
export const CHARGED = new Set([2, 9, 16, 23, 30, 37]);
