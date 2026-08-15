/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    /**
     * The UI collapsed to the root plus /documentos in the onboarding-first
     * rebuild. Every other previously shipped path — English (pre-F3) and
     * Spanish (F3–F7) — lands on the root so no bookmark 404s. `/statements`
     * gets its Spanish successor back rather than the root.
     */
    async redirects() {
        return [
            { source: "/statements", destination: "/documentos", permanent: false },
            ...[
            "/dashboard",
            "/transactions",
            "/settings",
            "/spending",
            "/forecasts",
            "/inicio/:path*",
            "/movimientos",
            "/ajustes",
            "/w/:path*",
            "/kitchen-sink",
            ].map((source) => ({ source, destination: "/", permanent: false })),
        ];
    },
};

export default nextConfig;
