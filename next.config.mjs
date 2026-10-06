/** @type {import('next').NextConfig} */
const nextConfig = {
  // Fully static export: the app is frontend-only (output goes to ./out).
  output: 'export',
  images: { unoptimized: true },
}

export default nextConfig
