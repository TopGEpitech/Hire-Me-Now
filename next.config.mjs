/** @type {import('next').NextConfig} */

// basic hardening for every response. no CSP yet bcs framer-motion + next inline styles
// would need nonces, that's on the todo list
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig = {
  // small self contained server for the docker image (Cloud Run, anything that runs a container)
  output: "standalone",
  poweredByHeader: false,
  // next 14 needs this for src/instrumentation.ts (opentelemetry)
  experimental: { instrumentationHook: true },
  images: {
    // every image is a tiny png/sprite. no optimizer = no sharp needed in the standalone/docker build
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "raw.githubusercontent.com",
        pathname: "/PokeAPI/sprites/**",
      },
    ],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  // the old routes, so links from before the rename still work
  async redirects() {
    return [
      { source: "/pokemon", destination: "/pokedex", permanent: true },
      { source: "/pokemon/:name", destination: "/pokedex/:name", permanent: true },
      { source: "/fight", destination: "/battle", permanent: true },
      { source: "/fight/ia", destination: "/battle/arena", permanent: true },
    ];
  },
};

export default nextConfig;
