/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // Wagmi optional connector dependencies — stub them out
    config.resolve.fallback = {
      ...config.resolve.fallback,
    };
    config.externals = [
      ...(Array.isArray(config.externals) ? config.externals : []),
    ];
    // Ignore optional wagmi connector packages
    config.resolve.alias = {
      ...config.resolve.alias,
      "@base-org/account": false,
      "@metamask/connect-evm": false,
      "@safe-global/safe-apps-sdk": false,
      "@safe-global/safe-apps-provider": false,
      "@walletconnect/ethereum-provider": false,
      "@walletconnect/modal": false,
    };
    return config;
  },
};

export default nextConfig;
