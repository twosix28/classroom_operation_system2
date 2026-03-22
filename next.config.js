/** @type {import('next').NextConfig} */
const nextConfig = {
  // Vercel 배포 시 crypto JS 파일들이 번들에 포함되도록 설정
  outputFileTracingIncludes: {
    '/api/ktbiz/schedule': ['./app/api/ktbiz/crypto/**'],
  },
}

export default nextConfig
