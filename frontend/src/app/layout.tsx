import type { Metadata, Viewport } from "next";
import { Inter, Inter_Tight } from "next/font/google";
import { ToastProvider } from "@/components/ui";
import { Providers } from "./providers";
import "./globals.css";

const inter = Inter({
    subsets: ["latin"],
    variable: "--font-inter",
    display: "swap",
});

/** Roobert is a commercial licence; Inter Tight is the named substitute.
 *  Display sizes, metrics and hero copy only — never body or table text. */
const interTight = Inter_Tight({
    weight: ["400", "500"],
    subsets: ["latin"],
    variable: "--font-display",
    display: "swap",
});

export const metadata: Metadata = {
    title: "Tomin - Toma el control de tu peso",
    description: "Analiza, proyecta y crece con IA. Finanzas personales para México.",
};

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="es" className={`${inter.variable} ${interTight.variable}`}>
            <body className="font-sans">
                <ToastProvider>
                    <Providers>{children}</Providers>
                </ToastProvider>
            </body>
        </html>
    );
}
