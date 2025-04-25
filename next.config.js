/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  images: {
    domains: [
      'image.tmdb.org',
      'via.placeholder.com',
      'storage.googleapis.com',
      'example.com',
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'image.tmdb.org',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
        pathname: '/**',
      }
    ],
  },
  // Menonaktifkan Turbopack untuk development
  experimental: {
    turbo: false
  }
};

module.exports = nextConfig;
