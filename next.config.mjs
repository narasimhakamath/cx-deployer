/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: '/cx-deployer',
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
