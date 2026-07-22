import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "Tomin - Toma el control de tu peso",
    description: "Analiza, proyecta y crece con IA. Finanzas personales para México.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="es">
            <body>{children}</body>
        </html>
    );
}
