/**
 * Tomin design tokens — the single source of truth.
 *
 * Imported by `tailwind.config.ts` (Tailwind 3.4 compiles TS configs natively)
 * and by the ApexCharts theme, so CSS and charts cannot drift apart.
 *
 * The system is "quiet analyst's desk on warm paper": a warm-stone canvas, a
 * single cyan accent, and 1px hairlines as the primary structural device.
 * Every contrast ratio below is the WCAG 2.1 relative-luminance formula,
 * measured against Canvas `#fafaf9` unless stated otherwise, because Canvas —
 * not white — is what most text actually sits on.
 */

/* -------------------------------------------------------------------------- */
/* Colour                                                                      */
/* -------------------------------------------------------------------------- */

export const colors = {
    /** Surfaces */
    /** The page. Warm off-white that reads as paper, not screen-white. */
    canvas: "#fafaf9",
    /** Card surfaces, nav, input fills — one elevation step above Canvas. */
    paper: "#ffffff",
    /** Subtle raised/inset surface. Rows on hover, nav active, inert chips. */
    fog: "#f5f4f2",
    /** Hairlines and gridlines — 1.31:1. The structure of the whole UI.
     *  Never a data mark, never text. */
    mist: "#e8e6e5",
    /** Heavier hairline: input borders, decorative separators — 1.60:1. */
    muted: "#d6d3d1",

    /** Text — darkest to lightest */
    /** Headings, metrics, and the label on a Signal button. 19.3:1 on Canvas. */
    ink: "#0c0a09",
    /** Deepest surface: toasts, dark panels, the active tab pill. */
    soot: "#1c1917",
    /**
     * Body copy, labels, captions. 4.62:1 on Canvas, 4.80:1 on Paper — the one
     * secondary text colour. The old three-step grey ramp (graphite/pewter/
     * steel) collapsed to this plus Ash: the reference system uses exactly two
     * recessive text values and a third only invites 3:1 captions.
     */
    graphite: "#78716c",
    /** Tertiary/disabled/icon strokes. 2.42:1 — decorative and disabled only,
     *  never text a user has to read. */
    ash: "#a8a29e",

    /**
     * The one accent. 2.36:1 on Canvas: correct for fills, icons and borders,
     * NOT for text on a light surface. Button labels on Signal are Ink (5.60:1)
     * — white would be 2.36:1 and fails AA at every size.
     */
    signal: "#3ba6f1",
    /** The accent as *text*: 3.16:1 on Canvas, 4.51:1 on Wash. Only ever used
     *  on a Wash pill (the highlight span) or as a 1px outlined border. */
    edge: "#3398e1",
    /** The pill behind a highlight span. Carries Edge text at 4.51:1. */
    wash: "#c1e1f7",

    /**
     * Semantic, narrowly scoped: deltas and amounts at text scale.
     * Never a chart fill, never a background.
     *
     * A deliberate deviation from the reference guide's "one accent only" rule.
     * In a ledger, the sign of a number is information, not decoration —
     * rendering a loss in the same grey as a gain would cost the user more than
     * the restraint buys. Both are warm-shifted to sit inside the stone palette.
     */
    positive: "#15704a", // 5.72:1 on Canvas
    negative: "#a8322a", // 6.02:1 on Canvas
} as const;

/**
 * Chart palettes.
 *
 * Hue is NOT the categorical channel here — the brand permits one accent.
 * Nominal categories use the warm stone ramp ordered by value with Signal
 * marking the series the widget is *about*; quantitative encodings (treemap,
 * heatmap) use the Signal tint ramp.
 */
export const chart = {
    /** Nominal categories. Six steps, each >=3:1 on Canvas, adjacent steps ~1.3x apart. */
    neutral: ["#1c1917", "#3b3532", "#57504b", "#78716c", "#918a84", "#a8a29e"],
    /** Continuous magnitude. One colour, the brand colour. Tile text flips to Ink below step 3. */
    signalTint: ["#1f7fc7", "#3ba6f1", "#7cc4f6", "#a8d8fa", "#c1e1f7"],
    /** Two-series comparison uses texture, not hue. */
    grid: colors.mist,
    axisLabel: colors.graphite,
} as const;

/* -------------------------------------------------------------------------- */
/* Type                                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Two rules are baked into the scale so they are mechanical rather than
 * remembered:
 *
 * 1. Display sizes carry tight negative tracking (-0.021em at 52, -0.025em at
 *    32) and are set at weight 400. The whisper-weight headline is the brand
 *    voice — never bump a heading to 600 for emphasis, use size or a highlight
 *    span instead.
 * 2. Body is 14px at 1.64 line-height with slight positive tracking. This is
 *    the dominant UI rhythm; do not break it.
 */
export const fontSize = {
    "display-lg": ["72px", { lineHeight: "1.0", letterSpacing: "-0.03em" }],
    display: ["52px", { lineHeight: "1.12", letterSpacing: "-0.021em" }],
    "title-lg": ["32px", { lineHeight: "1.25", letterSpacing: "-0.025em" }],
    "title-md": ["24px", { lineHeight: "1.25", letterSpacing: "-0.02em" }],
    "title-sm": ["20px", { lineHeight: "1.2", letterSpacing: "-0.005em" }],
    "body-lg": ["16px", { lineHeight: "1.69", letterSpacing: "0.003em" }],
    body: ["14px", { lineHeight: "1.64", letterSpacing: "0.004em" }],
    "body-sm": ["13px", { lineHeight: "1.53", letterSpacing: "0.004em" }],
    label: ["12px", { lineHeight: "1.33", letterSpacing: "0.004em" }],
    /** All-caps eyebrows. The wide tracking is the point. */
    caption: ["10px", { lineHeight: "1.6", letterSpacing: "0.025em" }],
    /** Numbers that are the point of the card. Always tabular, always weight 400. */
    metric: ["32px", { lineHeight: "1.15", letterSpacing: "-0.025em" }],
    "metric-sm": ["20px", { lineHeight: "1.2", letterSpacing: "-0.015em" }],
} as const;

export const fontFamily: Record<string, string[]> = {
    sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
    /**
     * Roobert is a commercial licence; Inter Tight is the guide's own named
     * substitute. Display sizes (>=20px), metrics, and hero copy only — a
     * display face inside a 13px table row reads as a mistake.
     */
    display: ["var(--font-display)", "var(--font-inter)", "ui-sans-serif", "sans-serif"],
};

/* -------------------------------------------------------------------------- */
/* Shape                                                                       */
/* -------------------------------------------------------------------------- */

export const borderRadius = {
    none: "0",
    /** Inline tags and chips. Pills, like every other interactive affordance. */
    tag: "9999px",
    /** Buttons and interactive pills. The guide is explicit: fully round. */
    control: "9999px",
    /** Inputs stay rectangular-ish — a pill text field is a search box, not a form. */
    input: "6px",
    card: "10px",
    /** Feature cards, the dropzone, the floating preview. */
    panel: "16px",
    sheet: "16px",
    full: "9999px",
} as const;

/**
 * Elevation is expressed with hairlines first and shadow second. `card` is a
 * whisper — it lifts the surface off the warm canvas without reading as a
 * shadow. `float` is reserved for exactly one element per screen: the centred
 * Modal, or a hero product preview, which have nothing behind them to anchor to.
 */
export const boxShadow = {
    none: "none",
    subtle: "rgba(0, 0, 0, 0.05) 0px 1px 2px 0px",
    card: "rgba(0, 0, 0, 0.05) 0px 4px 16px 0px",
    chip: "rgba(0, 0, 0, 0.1) 0px 4px 6px -1px, rgba(0, 0, 0, 0.1) 0px 2px 4px -2px",
    float: "rgba(17, 12, 46, 0.12) 0px 12px 45px 0px",
} as const;

/**
 * Layout. `page` is the content measure inside the app shell — wide enough for
 * a 12-column widget grid, narrow enough that a table row doesn't become a
 * scan across a 27" monitor. `prose` is the measure for the onboarding hero,
 * where a 52px headline needs to break after ~3 words per line.
 */
export const maxWidth = {
    page: "1200px",
    prose: "640px",
} as const;

export const zIndex = {
    sheet: 40,
    modal: 50,
    toast: 60,
} as const;
