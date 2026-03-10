// Configures Next.js for production runtime.
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  compress: true,
  poweredByHeader: false,
  // Keep Django-style trailing slash API routes from being redirected by Next.
  skipTrailingSlashRedirect: true,
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  images: {
    unoptimized: true,
    minimumCacheTTL: 60,
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      },
    ],
  },
  async rewrites() {
    const apiTarget = process.env.NEXT_INTERNAL_API_BASE_URL || 'http://localhost:8000/api';
    const mediaTarget = process.env.NEXT_INTERNAL_MEDIA_BASE_URL || 'http://localhost:8000/media';
    const adminTarget = process.env.NEXT_INTERNAL_ADMIN_BASE_URL || 'http://localhost:8000/admin';
    const staticTarget = process.env.NEXT_INTERNAL_STATIC_BASE_URL || 'http://localhost:8000/static';
    return {
      beforeFiles: [
        {
          source: '/admin',
          destination: `${adminTarget}/`,
        },
        {
          source: '/admin/:path(.*)',
          destination: `${adminTarget}/:path`,
        },
        {
          source: '/api/:path(.*)',
          destination: `${apiTarget}/:path`,
        },
        {
          source: '/media/:path(.*)',
          destination: `${mediaTarget}/:path`,
        },
        {
          source: '/static/:path(.*)',
          destination: `${staticTarget}/:path`,
        },
      ],
    };
  },
};

export default nextConfig;
