/** @type {import('next').NextConfig} */
const nextConfig = {
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
    config.resolve.alias = {
      ...config.resolve.alias,
      "@base-org/account": false,
      "@metamask/connect-evm": false,
      "@safe-global/safe-apps-sdk": false,
      "@safe-global/safe-apps-provider": false,
      "@walletconnect/ethereum-provider": false,
      "@walletconnect/modal": false,
      "porto": false,
      "porto/internal": false,
      "@coinbase/wallet-sdk": false,
      "@farcaster/mini-app-solana": false,
      "@farcaster/mini-app": false,
      "@solana/web3.js": false,
    };
    return config;
  },
};

export default nextConfig;
