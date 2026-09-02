import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

/** Favicon: the flame from the hero scene on a Soot tile. */
export default function Icon() {
    return new ImageResponse(
        (
            <div
                style={{
                    width: 32,
                    height: 32,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "#1c1917",
                    borderRadius: 8,
                }}
            >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path
                        d="M12 3c1.5 2.5 4 4.5 4 8a4 4 0 0 1-8 0c0-1.5.6-2.6 1.4-3.6.3 1.1 1 1.9 2 2.2C11 7.5 11.5 5 12 3z"
                        fill="#3ba6f1"
                    />
                </svg>
            </div>
        ),
        size
    );
}
