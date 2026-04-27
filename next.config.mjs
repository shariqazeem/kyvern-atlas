/** @type {import('next').NextConfig} */
const nextConfig = {
  // Transpile ESM-only deep deps that otherwise trip Next.js's server bundler.
  transpilePackages: ["@coinbase/wallet-sdk"],

  // Path C — Activity tab died; permanent redirect to the new Inbox.
  redirects: async () => [
    {
      source: "/app/payments",
      destination: "/app/inbox",
      permanent: true,
    },
    {
      source: "/app/payments/:path*",
      destination: "/app/inbox",
      permanent: true,
    },
  ],

  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      ],
    },
  ],

  webpack: (config) => {
    config.resolve.fallback = { ...config.resolve.fallback };
    config.externals = [...(Array.isArray(config.externals) ? config.externals : [])];

    // Only alias to `false` the truly-missing optional peers that Privy/wagmi
    // try to probe. Packages that ARE installed must load normally —
    // including @coinbase/wallet-sdk (Privy wallet provider) and
    // @solana/web3.js (our Squads integration).
    config.resolve.alias = {
      ...config.resolve.alias,
      "@metamask/connect-evm": false,
      "@walletconnect/modal": false,
      "@farcaster/mini-app-solana": false,
      "@farcaster/mini-app": false,
    };
    return config;
  },
};

export default nextConfig;
