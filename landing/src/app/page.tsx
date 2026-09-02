import type { Viewport } from "next";
import { Nav } from "@/components/shared/Nav";
import { LogoMarquee } from "@/components/shared/LogoMarquee";
import { CtaBand } from "@/components/shared/CtaBand";
import { Footer } from "@/components/shared/Footer";
import { HeroB } from "@/components/landing/HeroB";
import { BentoB } from "@/components/landing/BentoB";
import { CustodyB } from "@/components/landing/CustodyB";
import { StepsB } from "@/components/landing/StepsB";
import "./landing.css";

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#141211" };

/**
 * The landing — "Señal oscura". One dark root via data-theme (see
 * globals.css): Night ground, a drifting cyan mesh in the hero, the product
 * as six drawn readings in a bento grid.
 */
export default function Landing() {
    return (
        <main data-theme="dark" className="min-h-dvh bg-night text-dust">
            <Nav tone="dark" />
            <HeroB />
            <LogoMarquee tone="dark" label="Reconoce a quien te cobra" />
            <BentoB />
            <CustodyB />
            <StepsB />
            <CtaBand tone="dark" />
            <Footer tone="dark" />
        </main>
    );
}
