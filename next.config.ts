import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  output: 'standalone', // Enable for Docker/self-hosted deployment
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    // Exclude better-sqlite3 and other Node.js-only modules from client bundle
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        'better-sqlite3': false,
        fs: false,
        path: false,
      };
    }
    return config;
  },
};

export default nextConfig;
