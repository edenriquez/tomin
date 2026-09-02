import type { MockPalette } from "./palette";

/** The custody seal: the phone keeps the file; the shield lands on it. */
export function SealMock({ p, className }: { p: MockPalette; className?: string }) {
    return (
        <svg viewBox="0 0 100 80" className={className ?? "h-full w-full"} role="presentation">
            <rect x="34" y="6" width="32" height="68" rx="6" fill={p.surface} stroke={p.line} strokeWidth="1.2" />
            <rect x="45" y="11" width="10" height="1.6" rx="0.8" fill={p.line} />
            <rect x="40" y="20" width="16" height="1.8" rx="0.9" fill={p.line} />
            <rect x="40" y="26" width="20" height="1.8" rx="0.9" fill={p.fog} />
            <rect x="40" y="32" width="18" height="1.8" rx="0.9" fill={p.fog} />
            <rect x="40" y="38" width="20" height="1.8" rx="0.9" fill={p.fog} />
            <circle cx="66" cy="14" r="9" fill={p.surface} stroke={p.accent} strokeWidth="1.2" />
            <path
                d="M 66 8.5 l 4.5 2 v 3.2 c 0 3 -2 5 -4.5 6 c -2.5 -1 -4.5 -3 -4.5 -6 v -3.2 z"
                fill={p.accent}
                opacity="0.18"
                stroke={p.accent}
                strokeWidth="1"
            />
            <path d="M 63.8 14 l 1.6 1.6 l 3.2 -3.6" fill="none" stroke={p.accent} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}
