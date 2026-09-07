import type { Metadata, Viewport } from "next";
import { Inter, Instrument_Serif } from "next/font/google";
import { SITE, SITE_URL } from "@/lib/site";
import "./globals.css";

const inter = Inter({
    subsets: ["latin"],
    variable: "--font-inter",
    display: "swap",
});

/** The display face: a text serif, 400 only, words at >=24px. Numbers and
 *  card titles stay in Inter (see design/tokens.ts). */
const instrumentSerif = Instrument_Serif({
    weight: "400",
    subsets: ["latin"],
    variable: "--font-display",
    display: "swap",
});

export const metadata: Metadata = {
    metadataBase: new URL(SITE_URL),
    title: { default: SITE.title, template: `%s · ${SITE.name}` },
    description: SITE.description,
    robots: { index: true, follow: true },
    openGraph: {
        type: "website",
        locale: "es_MX",
        siteName: SITE.name,
        title: SITE.title,
        description: SITE.description,
    },
    twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="es-MX" className={`${inter.variable} ${instrumentSerif.variable}`}>
            <body className="font-sans">{children}</body>
        </html>
    );
}
