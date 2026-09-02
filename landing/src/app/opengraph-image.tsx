import { ImageResponse } from "next/og";
import { SITE } from "@/lib/site";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = SITE.title;

/**
 * The share card. Soot ground, the wordmark, one headline with the highlight
 * pill — the same typographic move as the pages, in the system font Satori
 * ships with (no font fetch at build).
 */
export default function OpenGraphImage() {
    return new ImageResponse(
        (
            <div
                style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    padding: 72,
                    background: "#1c1917",
                    color: "#e7e5e4",
                    fontFamily: "sans-serif",
                }}
            >
                <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 30 }}>
                    <svg width="34" height="34" viewBox="0 0 24 24" fill="none">
                        <path
                            d="M12 3c1.5 2.5 4 4.5 4 8a4 4 0 0 1-8 0c0-1.5.6-2.6 1.4-3.6.3 1.1 1 1.9 2 2.2C11 7.5 11.5 5 12 3z"
                            fill="#3ba6f1"
                        />
                    </svg>
                    Tomin
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                    <div style={{ display: "flex", flexWrap: "wrap", fontSize: 88, lineHeight: 1.05, letterSpacing: -3 }}>
                        <span>Tu dinero,&nbsp;</span>
                        <span
                            style={{
                                background: "rgba(51,152,225,0.22)",
                                color: "#c1e1f7",
                                borderRadius: 10,
                                padding: "0 18px",
                            }}
                        >
                            claro en minutos
                        </span>
                        <span>.</span>
                    </div>
                    <div style={{ fontSize: 30, color: "#a8a29e", maxWidth: 900 }}>
                        Sube el PDF de tu banco. Lo leemos, lo desechamos y te devolvemos tus números.
                    </div>
                </div>
            </div>
        ),
        size
    );
}
