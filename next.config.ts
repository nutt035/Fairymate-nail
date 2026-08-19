import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Standalone output สำหรับ Docker
  output: 'standalone',

  // ปิด TypeScript errors ตอน build
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;