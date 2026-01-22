const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: path.join(__dirname, "../.."),
  reactStrictMode: true,
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Type checking is done in a separate step in CI
    ignoreBuildErrors: false,
  },
  // Disable static page generation for pages that use Firebase
  experimental: {
    // Force dynamic rendering for all pages (prevents pre-rendering with Firebase)
  },
  // Add webpack config to handle Firebase properly
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Don't try to polyfill Node.js modules on the client
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;
