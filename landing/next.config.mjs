/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    async redirects() {
        // The two POC routes from the comparison phase.
        return [
            { source: "/b", destination: "/", permanent: true },
            { source: "/d", destination: "/", permanent: true },
        ];
    },
};

export default nextConfig;
