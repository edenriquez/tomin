/**
 * Merchant recognition for display: a curated token → logo map.
 *
 * The logos live in /public/logos (fetched once, served locally — no
 * third-party request at render time, no tracking pixel disguised as a
 * favicon). Matching is deliberately conservative: whole-word tokens over
 * the normalized description, longest token first. A row that matches
 * nothing shows its category mark instead — a wrong logo is worse than none.
 *
 * The list is seed data, not a service: extend it by dropping a PNG in
 * /public/logos and adding a row here.
 */

export type Merchant = {
    /** Logo filename under /public/logos, `${slug}.png`. */
    slug: string;
    name: string;
    /** Whole-word tokens (already normalized: lowercase, no accents). */
    tokens: string[];
};

export const MERCHANTS: Merchant[] = [
    { slug: "oxxo", name: "OXXO", tokens: ["oxxo"] },
    { slug: "seven-eleven", name: "7-Eleven", tokens: ["7 eleven", "7eleven", "seven eleven"] },
    { slug: "mercado-pago", name: "Mercado Pago", tokens: ["merpago", "mercado pago", "mercadopago"] },
    { slug: "mercado-libre", name: "Mercado Libre", tokens: ["mercadolibre", "mercado libre", "mercadol"] },
    { slug: "bodega-aurrera", name: "Bodega Aurrera", tokens: ["aurrera"] },
    { slug: "walmart", name: "Walmart", tokens: ["walmart", "wal mart", "supercenter"] },
    { slug: "soriana", name: "Soriana", tokens: ["soriana"] },
    { slug: "chedraui", name: "Chedraui", tokens: ["chedraui"] },
    { slug: "costco", name: "Costco", tokens: ["costco"] },
    { slug: "heb", name: "HEB", tokens: ["heb"] },
    { slug: "coppel", name: "Coppel", tokens: ["coppel"] },
    { slug: "liverpool", name: "Liverpool", tokens: ["liverpool"] },
    { slug: "amazon", name: "Amazon", tokens: ["amazon", "amzn"] },
    { slug: "shein", name: "Shein", tokens: ["shein"] },
    { slug: "temu", name: "Temu", tokens: ["temu"] },
    { slug: "telcel", name: "Telcel", tokens: ["telcel"] },
    { slug: "telmex", name: "Telmex", tokens: ["telmex"] },
    { slug: "izzi", name: "izzi", tokens: ["izzi"] },
    { slug: "totalplay", name: "Totalplay", tokens: ["totalplay", "total play"] },
    { slug: "cfe", name: "CFE", tokens: ["cfe"] },
    { slug: "spotify", name: "Spotify", tokens: ["spotify"] },
    { slug: "netflix", name: "Netflix", tokens: ["netflix"] },
    { slug: "apple", name: "Apple", tokens: ["apple", "itunes"] },
    { slug: "google", name: "Google", tokens: ["google"] },
    { slug: "steam", name: "Steam", tokens: ["steam", "steampowered"] },
    { slug: "paypal", name: "PayPal", tokens: ["paypal"] },
    // "uber eats" must win over "uber": longest-token-first ordering below.
    { slug: "uber", name: "Uber", tokens: ["uber", "uber eats", "ubereats"] },
    { slug: "didi", name: "DiDi", tokens: ["didi"] },
    { slug: "rappi", name: "Rappi", tokens: ["rappi"] },
    { slug: "starbucks", name: "Starbucks", tokens: ["starbucks"] },
    { slug: "mcdonalds", name: "McDonald's", tokens: ["mcdonald", "mcdonalds", "mc donalds"] },
    { slug: "burger-king", name: "Burger King", tokens: ["burger king"] },
    { slug: "dominos", name: "Domino's", tokens: ["dominos", "domino s"] },
    { slug: "cinepolis", name: "Cinépolis", tokens: ["cinepolis"] },
    { slug: "cinemex", name: "Cinemex", tokens: ["cinemex"] },
    { slug: "fahorro", name: "Farmacias del Ahorro", tokens: ["fahorro", "farmacias del ahorro", "farm ahorro"] },
    { slug: "aeromexico", name: "Aeroméxico", tokens: ["aeromexico", "aeromex"] },
    { slug: "volaris", name: "Volaris", tokens: ["volaris"] },
    { slug: "autozone", name: "AutoZone", tokens: ["autozone"] },
    // "b azteca" is how transfers to Banco Azteca cards print on Nu statements.
    { slug: "banco-azteca", name: "Banco Azteca", tokens: ["banco azteca", "b azteca"] },
];

/** (token, slug) pairs, longest token first, so "uber eats" beats "uber". */
const INDEX: [string, string][] = MERCHANTS.flatMap((m) =>
    m.tokens.map((t): [string, string] => [t, m.slug])
).sort((a, b) => b[0].length - a[0].length);

function normalize(text: string): string {
    return text
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9 ]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

/**
 * The logo slug for a description, or null. Whole-word matching: the padded
 * haystack means "cfe" matches "cfe recibo" but never "recfeccion".
 */
export function matchMerchant(description: string): string | null {
    const haystack = ` ${normalize(description)} `;
    for (const [token, slug] of INDEX) {
        if (haystack.includes(` ${token} `)) return slug;
    }
    return null;
}

export function merchantLogoUrl(slug: string): string {
    return `/logos/${slug}.png`;
}
