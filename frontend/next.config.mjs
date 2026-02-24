// Configures Next.js output for lean production Docker runtime.
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
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
        hostname: 'nginx',
      },
      {
        protocol: 'http',
        hostname: 'backend',
      },
    ],
  },
};

export default nextConfig;
