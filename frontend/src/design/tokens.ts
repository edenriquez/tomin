/**
 * Tomin design tokens — the single source of truth.
 *
 * Imported by `tailwind.config.ts` (Tailwind 3.4 compiles TS configs natively)
 * and by the ApexCharts theme, so CSS and charts cannot drift apart.
 *
 * Every contrast ratio below is the WCAG 2.1 relative-luminance formula,
 * computed against Paper `#ffffff` unless stated otherwise. Numbers are
 * measured, not aspirational — change a hex and re-measure.
 */

/* -------------------------------------------------------------------------- */
/* Colour                                                                      */
/* -------------------------------------------------------------------------- */

export const colors = {
    /** Surfaces */
    paper: "#ffffff",
    /** Subtle raised/inset surface. Rows on hover, nav active, inert chips. */
    fog: "#f3f3f7",
    /** Hairlines and gridlines ONLY — 1.91:1. Never a data mark, never text. */
    mist: "#b9bbc6",

    /** Text — darkest to lightest */
    /** Headings, metrics, and the label on an Ember button. 21:1 on Paper, 6.68:1 on Ember. */
    ink: "#000000",
    /** Deepest surface: toasts, dark panels, the solid series in two-series charts. */
    abyss: "#000710",
    /** Elevated dark chrome, one step softer than Abyss. */
    carbon: "#15191e",
    /** Body copy. 5.94:1 — the correct default for prose. */
    graphite: "#60646c",
    /**
     * Labels and captions down to 12px. 5.12:1 on Paper, 4.62:1 on Fog.
     * Deliberately darker than the Brex reference (#6f737b): the reference
     * value measures 4.30:1 against Fog, and captions routinely sit on the
     * Fog page background. This is the lightest value that passes AA on both
     * surfaces.
     */
    pewter: "#6a6e76",
    /** Tertiary/disabled. 3.30:1 — large text (>=18.66px) and icons only. */
    steel: "#8b8d98",

    /** The one accent. 3.14:1 on Paper: fine for UI/graphics, NOT for body text.
     *  Button labels on Ember are Ink, never white (white is 3.14:1 and fails AA).
     *  See docs/redesign-plan.md §5 and decision §8.2. */
    ember: "#ff5900",

    /** Semantic, narrowly scoped: deltas and amounts at text scale.
     *  Never a chart fill, never a background. */
    positive: "#0f7a4d", // 5.37:1
    negative: "#b3261e", // 6.54:1
} as const;

/**
 * Chart palettes.
 *
 * Hue is NOT the categorical channel here — the brand permits one accent.
 * Nominal categories use the neutral ramp ordered by value with Ember marking
 * the series the widget is *about*; quantitative encodings (treemap, heatmap)
 * use the Ember tint ramp.
 */
export const chart = {
    /** Nominal categories. Six steps, each >=3:1 on Paper, adjacent steps ~1.35x apart. */
    neutral: ["#15191e", "#2f343b", "#4a4f57", "#60646c", "#767a83", "#8b8d98"],
    /** Continuous magnitude. One colour, the brand colour. Tile text flips to Ink below step 3. */
    emberTint: ["#ff5900", "#ff8c4d", "#ffb083", "#ffd2b8", "#ffeade"],
    /** Two-series comparison uses texture, not hue. */
    grid: colors.mist,
    axisLabel: colors.pewter,
} as const;

/* -------------------------------------------------------------------------- */
/* Type                                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Tracking is baked into the scale so the "-0.01em <=24px / -0.02em at 36 /
 * -0.03em at 72" rule is mechanical rather than remembered.
 */
export const fontSize = {
    "display-lg": ["72px", { lineHeight: "1.0", letterSpacing: "-0.03em" }],
    "display-md": ["56px", { lineHeight: "1.05", letterSpacing: "-0.025em" }],
    "title-lg": ["36px", { lineHeight: "1.15", letterSpacing: "-0.02em" }],
    "title-md": ["24px", { lineHeight: "1.25", letterSpacing: "-0.01em" }],
    "title-sm": ["18px", { lineHeight: "1.35", letterSpacing: "-0.01em" }],
    body: ["15px", { lineHeight: "1.5", letterSpacing: "-0.01em" }],
    "body-sm": ["13px", { lineHeight: "1.45", letterSpacing: "-0.005em" }],
    label: ["12px", { lineHeight: "1.35", letterSpacing: "0" }],
    /** Numbers that are the point of the card. Always tabular. */
    metric: ["32px", { lineHeight: "1.1", letterSpacing: "-0.02em" }],
    "metric-sm": ["20px", { lineHeight: "1.2", letterSpacing: "-0.015em" }],
} as const;

export const fontFamily: Record<string, string[]> = {
    sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
    /** Instrument Serif. Landing page and empty-state heroes only — a serif
     *  inside a dense dashboard reads as a mistake. */
    display: ["var(--font-display)", "ui-serif", "Georgia", "serif"],
};

/* -------------------------------------------------------------------------- */
/* Shape                                                                       */
/* -------------------------------------------------------------------------- */

export const borderRadius = {
    none: "0",
    /** Inline tags and chips only. */
    tag: "6px",
    /** Buttons and inputs — the guide is explicit: 12px, never 8/10px compromises. */
    control: "12px",
    card: "12px",
    sheet: "16px",
    full: "9999px",
} as const;

/**
 * Elevation is expressed with borders, not shadows. `float` is the single
 * exception — the centred Modal, which has nothing behind it to anchor to.
 */
export const boxShadow = {
    none: "none",
    float: "0 12px 40px -8px rgba(10, 12, 16, 0.24)",
} as const;

/**
 * Layout. `page` is the content measure inside the app shell — wide enough for
 * a 12-column widget grid, narrow enough that a table row doesn't become a
 * scan across a 27" monitor.
 */
export const maxWidth = {
    page: "1200px",
} as const;

export const zIndex = {
    sheet: 40,
    modal: 50,
    toast: 60,
} as const;
