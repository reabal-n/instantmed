/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // TypeScript errors have been fixed - enable strict type checking
    ignoreBuildErrors: false,
  },
  images: {
    unoptimized: true,
  },
  serverExternalPackages: ['@supabase/ssr'],
}

export default nextConfig
