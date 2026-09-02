import type { Metadata, Viewport } from "next";
import { Inter, Inter_Tight } from "next/font/google";
import { SITE, SITE_URL } from "@/lib/site";
import "./globals.css";

const inter = Inter({
    subsets: ["latin"],
    variable: "--font-inter",
    display: "swap",
});

/** Roobert is a commercial licence; Inter Tight is the named substitute. */
const interTight = Inter_Tight({
    weight: ["400", "500"],
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
        <html lang="es-MX" className={`${inter.variable} ${interTight.variable}`}>
            <body className="font-sans">{children}</body>
        </html>
    );
}
