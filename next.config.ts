import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Vercel deployment optimizations */
  reactStrictMode: true,
  swcMinify: true,

  /* Webpack config for Vercel compatibility */
  webpack: (config, { isServer }) => {
    // Optimize node modules for Vercel
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }
    return config;
  },

  /* Environment variables */
  env: {
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  },

  /* Image optimization */
  images: {
    unoptimized: false,
  },

  /* Build output analysis (optional) */
  productionBrowserSourceMaps: false,
};

export default nextConfig;
