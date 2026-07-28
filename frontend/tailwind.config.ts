import type { Config } from "tailwindcss";
import {
    borderRadius,
    boxShadow,
    colors,
    fontFamily,
    fontSize,
    maxWidth,
    zIndex,
} from "./src/design/tokens";

/**
 * `colors.brand` is deliberately absent and `boxShadow` is deliberately
 * shadow-free apart from `float`. That turns every legacy `bg-brand` and
 * `shadow-sm` into a visible error instead of a silent violation.
 */
const config: Config = {
    content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
    theme: {
        extend: {
            colors: { ...colors },
            fontFamily: { ...fontFamily },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            fontSize: fontSize as any,
            borderRadius: { ...borderRadius },
            maxWidth: { ...maxWidth },
            zIndex: Object.fromEntries(
                Object.entries(zIndex).map(([k, v]) => [k, String(v)])
            ),
        },
        boxShadow: { ...boxShadow },
    },
    plugins: [],
};

export default config;
