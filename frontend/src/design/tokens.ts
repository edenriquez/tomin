/**
 * Design tokens — the single source of truth.
 *
 * Imported by `tailwind.config.ts` (Tailwind compiles TS configs natively) and
 * by the ApexCharts theme, so CSS and charts cannot drift apart. Nothing else
 * in the app should contain a hex value.
 *
 * Contrast ratios below are measured against Paper (#ffffff) using the WCAG
 * relative-luminance formula. They are load-bearing: the palette assigns roles
 * by measured legibility, not by eye.
 */

export const color = {
    /** The only accent. 3.14:1 on Paper — legal for UI/graphics, never for body text. */
    ember: "#ff5900",
    /** Deepest surface. Dark sections, income series in charts. */
    abyss: "#000710",
    /** Elevated dark chrome, one step softer than Abyss. */
    carbon: "#15191e",
    /** Headings and heavy borders. */
    ink: "#000000",
    /** Page and card surface. */
    paper: "#ffffff",
    /** The only off-white. Section contrast, input fills, skeletons. */
    fog: "#f3f3f7",
    /** 1.91:1 — hairlines and gridlines ONLY. Never a data mark, never text. */
    mist: "#b9bbc6",
    /** 3.30:1 — labels >=18.66px and icon strokes. Not 12px captions. */
    steel: "#8b8d98",
    /** 4.76:1 — helper and caption text. */
    pewter: "#6f737b",
    /** 5.94:1 — the workhorse body-copy gray. */
    graphite: "#60646c",

    /**
     * Narrow semantic exception. Deltas and amounts inside transaction lists
     * only, at text scale. Never chart fills, never backgrounds, never nav.
     * Without these you cannot legibly render a ledger.
     */
    positive: "#0f7a4d", // 5.37:1
    negative: "#b3261e", // 6.54:1
} as const;

/**
 * Chart palettes.
 *
 * The brand permits exactly one accent, which appears to rule out categorical
 * charts. The resolution is to stop using hue as the categorical channel:
 * order and position carry identity, Ember carries attention.
 */
export const chart = {
    /**
     * Nominal categories, assigned in value order (largest first). Every step
     * is >=3.3:1 on Paper and adjacent steps are ~1.35x apart, so they stay
     * distinguishable side by side. Mist is deliberately excluded (1.91:1).
     *
     * Cap categorical charts at 6 series + "Otros" and drill in for the tail.
     */
    neutral: ["#15191e", "#2f343b", "#4a4f57", "#60646c", "#767a83", "#8b8d98"],

    /**
     * Quantitative encodings (treemap, heatmap) where colour means magnitude,
     * not identity. A single-hue sequential ramp of the brand colour is one
     * colour used as data, not decoration. Tile text flips to Ink from index 2.
     */
    emberTint: ["#ff5900", "#ff8c4d", "#ffb083", "#ffd2b8", "#ffeade"],

    /** Index at which overlaid text must switch from Paper to Ink. */
    emberTintInkFrom: 2,
} as const;

export const radius = {
    tag: "6px",
    card: "12px",
    input: "12px",
    button: "12px",
} as const;

export const layout = {
    pageMaxWidth: "1200px",
} as const;

/**
 * Type scale. Tracking is baked into each step so the "-0.01em at <=24px,
 * -0.02em at 36px, -0.03em at 72px" rule is mechanical rather than remembered.
 * Nobody should ever hand-write `tracking-tight`.
 */
export const typeScale = {
    "display-lg": ["72px", { lineHeight: "1.0", letterSpacing: "-0.03em" }],
    "display-sm": ["48px", { lineHeight: "1.05", letterSpacing: "-0.025em" }],
    "title-lg": ["36px", { lineHeight: "1.15", letterSpacing: "-0.02em" }],
    "title-md": ["24px", { lineHeight: "1.25", letterSpacing: "-0.01em" }],
    "title-sm": ["20px", { lineHeight: "1.4", letterSpacing: "-0.01em" }],
    /** Large numerals on stat tiles. Pair with tabular-nums. */
    metric: ["32px", { lineHeight: "1.1", letterSpacing: "-0.02em" }],
    body: ["15px", { lineHeight: "1.5", letterSpacing: "-0.01em" }],
    "body-sm": ["14px", { lineHeight: "1.43", letterSpacing: "-0.01em" }],
    caption: ["13px", { lineHeight: "1.4", letterSpacing: "-0.005em" }],
    micro: ["12px", { lineHeight: "1.5", letterSpacing: "-0.005em" }],
} as const;

export type ColorToken = keyof typeof color;
