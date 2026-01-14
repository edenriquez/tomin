import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "Tomin - Tu brújula financiera",
    description: "Análisis financiero con IA para usuarios mexicanos",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="es" className="light">
            <body className={cn(inter.className, "antialiased")}>
                <Providers>
                    {children}
                </Providers>
            </body>
        </html>
    );
}
