import type {NextConfig} from 'next';

const isGithubPages = process.env.GITHUB_PAGES === 'true';

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true,
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
  env: {
    IS_STATIC_EXPORT: isGithubPages ? 'true' : 'false',
  },
  
  // Apply GitHub Pages configuration only when the GITHUB_PAGES environment variable is set.
  ...(isGithubPages && {
    output: 'export',
    basePath: '/studio',
    assetPrefix: '/studio',
  }),
};

export default nextConfig;
