/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    /**
     * The IA moved to Spanish paths in F3 (docs/redesign-plan.md §4). These are
     * permanent: the English paths were the shipped URLs and bookmarks
     * shouldn't 404.
     */
    async redirects() {
        return [
            { source: "/dashboard", destination: "/inicio", permanent: true },
            { source: "/transactions", destination: "/movimientos", permanent: true },
            { source: "/statements", destination: "/documentos", permanent: true },
            { source: "/settings", destination: "/ajustes", permanent: true },
            // F4/F5: `/spending` and `/forecasts` stopped being pages and
            // became widgets. Each lands on its own detail view, which is the
            // same analysis with a period selector on it.
            { source: "/spending", destination: "/w/spend_by_category", permanent: true },
            { source: "/forecasts", destination: "/w/investment_projection", permanent: true },
        ];
    },
};

export default nextConfig;
