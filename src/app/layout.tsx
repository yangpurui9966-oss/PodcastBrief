import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'PodcastBrief - 几分钟读完一小时播客',
  description: '中文播客内容提取与分析系统，AI 生成结构化摘要、时间轴、内容提取',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}
