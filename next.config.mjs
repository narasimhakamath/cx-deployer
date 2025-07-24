/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: '/cxdeployer',
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
