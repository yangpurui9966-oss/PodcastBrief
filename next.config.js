/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  // 静态文件服务：上传的音频文件通过 /uploads/:filename 访问
  async rewrites() {
    return [
      {
        source: '/uploads/:filename*',
        destination: '/api/uploads/:filename*',
      },
    ];
  },
};

module.exports = nextConfig;
