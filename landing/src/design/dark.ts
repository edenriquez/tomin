/**
 * Dark-surface additions for POC B ("Señal oscura"). Kept apart from the
 * copied `tokens.ts` so `npm run tokens:sync` never clobbers them.
 *
 * The page sits on Night (one step below Soot) so Soot/Slate cards still read
 * as raised; text is Bone, not white — white on Night is glaring next to the
 * warm stone family. Signal stays the one accent; Ink-on-Signal buttons keep
 * their 5.6:1 label contrast unchanged.
 */
export const dark = {
    colors: {
        /** The page under everything on /b. */
        night: "#141211",
        /** Card surface on Night. */
        slate: "#231f1d",
        /** Hairlines on dark. */
        line: "rgba(255, 255, 255, 0.08)",
        lineStrong: "rgba(255, 255, 255, 0.14)",
        /** Primary text on dark — 14.6:1 on Night. */
        bone: "#e7e5e4",
        /** Secondary text on dark — 5.9:1 on Night. */
        dust: "#a8a29e",
    },
    boxShadow: {
        glow: "0 0 0 1px rgba(59, 166, 241, 0.25), 0 24px 60px -20px rgba(59, 166, 241, 0.35)",
    },
} as const;
