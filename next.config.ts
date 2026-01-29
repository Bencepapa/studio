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
  
  webpack: (config, { webpack }) => {
    if (isGithubPages) {
      // When building for static export, completely ignore the server actions file.
      // The component that uses it (`control-panel.tsx`) already has a conditional
      // check to avoid calling it. This webpack rule prevents the module from
      // being bundled at all, which resolves the "Server Actions are not supported
      // with static export" error.
      config.plugins.push(
        new webpack.IgnorePlugin({
          resourceRegExp: /app[\\/]actions\.ts$/,
        })
      );
    }
    return config;
  },
};

export default nextConfig;
