import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
    return new ImageResponse(
        (
            <div
                style={{
                    width: 180,
                    height: 180,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "#1c1917",
                }}
            >
                <svg width="112" height="112" viewBox="0 0 24 24" fill="none">
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
