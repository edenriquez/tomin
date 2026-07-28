import type { Config } from "tailwindcss";
import { color, layout, radius, typeScale } from "./src/design/tokens";

const config: Config = {
    content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
    theme: {
        extend: {
            colors: { ...color },
            fontFamily: {
                sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
                display: ["var(--font-display)", "Georgia", "serif"],
            },
            fontSize: typeScale as unknown as Record<
                string,
                [string, { lineHeight: string; letterSpacing: string }]
            >,
            borderRadius: {
                tag: radius.tag,
                card: radius.card,
                input: radius.input,
                button: radius.button,
            },
            borderColor: { DEFAULT: color.mist },
            maxWidth: { page: layout.pageMaxWidth },
            spacing: {
                "section-sm": "48px",
                section: "64px",
                "section-lg": "80px",
            },
        },
        /**
         * Not under `extend`. Overriding the scale outright removes `shadow-sm`
         * and friends from the build, so the "no drop shadows" rule becomes a
         * visible error rather than a silent violation.
         */
        boxShadow: {
            none: "none",
            /** Sole exception: floating UI detached from the canvas (modals, toasts). */
            float: "0 8px 24px -8px rgb(0 7 16 / 0.16)",
        },
    },
    plugins: [],
};

export default config;
