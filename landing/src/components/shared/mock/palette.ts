import { colors } from "@/design/tokens";
import { dark } from "@/design/dark";

/**
 * Every mock screen draws with five colours so the same SVG reads on paper
 * and on Night. Signal is the accent in both — the one thing that never
 * changes between tones.
 */
export type MockPalette = {
    /** Gridlines, axis, hairlines. */
    line: string;
    /** The dark data mark. */
    ink: string;
    /** The recessive data mark. */
    muted: string;
    /** The accent. */
    accent: string;
    /** Surface behind the mock. */
    surface: string;
    /** Inert cells. */
    fog: string;
};

export const LIGHT: MockPalette = {
    line: colors.mist,
    ink: colors.soot,
    muted: colors.ash,
    accent: colors.signal,
    surface: colors.canvas,
    fog: colors.fog,
};

export const DARK: MockPalette = {
    line: dark.colors.lineStrong,
    ink: dark.colors.bone,
    muted: "#6b645f",
    accent: colors.signal,
    surface: dark.colors.slate,
    fog: "#2c2725",
};
