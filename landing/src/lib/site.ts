/** Public URL of this landing — metadataBase and absolute OG links. */
export const SITE_URL =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : "http://localhost:3001");

/** Where every "Comenzar" sends people: the deployed Tomin app. */
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const SITE = {
    name: "Tomin",
    title: "Tomin — Tu dinero, claro en minutos",
    description:
        "Sube el PDF de tu banco. Tomin lo lee, lo desecha y te devuelve tus números: cada movimiento, cada categoría, cada cobro recurrente.",
    tagline: "Toma el control de tu peso.",
} as const;
