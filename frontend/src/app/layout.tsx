import type { Metadata } from "next";
import { Inter, Instrument_Serif } from "next/font/google";
import "./globals.css";

const inter = Inter({
    subsets: ["latin"],
    variable: "--font-inter",
    display: "swap",
});

/** Flecha is not freely available; Instrument Serif is the substitute.
 *  Landing page and empty-state heroes only. */
const instrumentSerif = Instrument_Serif({
    weight: "400",
    subsets: ["latin"],
    variable: "--font-display",
    display: "swap",
});

export const metadata: Metadata = {
    title: "Tomin - Toma el control de tu peso",
    description: "Analiza, proyecta y crece con IA. Finanzas personales para México.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="es" className={`${inter.variable} ${instrumentSerif.variable}`}>
            <body className="font-sans">{children}</body>
        </html>
    );
}
