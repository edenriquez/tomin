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
import { dark } from "./src/design/dark";

/**
 * Same shape as frontend/tailwind.config.ts. `tokens.ts` is a verbatim copy
 * (npm run tokens:sync); the dark-surface additions the landing needs live in
 * `dark.ts` so the sync stays a plain overwrite.
 */
const config: Config = {
    content: ["./src/**/*.{ts,tsx}"],
    theme: {
        extend: {
            colors: { ...colors, ...dark.colors },
            fontFamily: { ...fontFamily },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            fontSize: fontSize as any,
            borderRadius: { ...borderRadius },
            maxWidth: { ...maxWidth },
            zIndex: Object.fromEntries(
                Object.entries(zIndex).map(([k, v]) => [k, String(v)])
            ),
        },
        boxShadow: { ...boxShadow, ...dark.boxShadow },
    },
    plugins: [],
};

export default config;
