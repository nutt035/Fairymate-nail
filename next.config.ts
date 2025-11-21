/** @type {import('next').NextConfig} */
const nextConfig = {
  // 1. ปิดการตรวจสอบ TypeScript (เส้นแดงๆ) ตอน Deploy
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // 2. ปิดการตรวจสอบ ESLint (กฎระเบียบโค้ด) ตอน Deploy
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;