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
        ];
    },
};

export default nextConfig;
