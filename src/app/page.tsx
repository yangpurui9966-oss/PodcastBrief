import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-primary-50 to-white py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            PodcastBrief
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 mb-4">
            粘贴一期播客，几分钟读完一小时内容
          </p>
          <p className="text-gray-500 mb-10">
            支持小宇宙、Apple Podcasts 等主流平台 · AI 生成结构化摘要与时间轴
          </p>
          
          <div className="max-w-2xl mx-auto">
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                placeholder="粘贴播客链接..."
                className="flex-1 px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <button className="px-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors">
                开始分析
              </button>
            </div>
            <p className="text-sm text-gray-400">
              或 <button className="text-primary-600 hover:underline">上传音频文件</button>
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-12">核心功能</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              title="结构化摘要"
              description="AI 自动提取节目核心观点、关键话题、嘉宾见解，几分钟掌握全文精华"
            />
            <FeatureCard
              title="时间轴导航"
              description="按话题章节自动分段，点击时间戳直接跳转感兴趣的内容"
            />
            <FeatureCard
              title="内容提取"
              description="自动提取推荐书籍、工具、文章、金句等结构化信息"
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 px-4 text-center text-gray-500 text-sm">
        <p>
          Built with Next.js + DeepSeek ·{' '}
          <Link
            href="https://github.com/yangpurui9966-oss/PodcastBrief"
            className="text-primary-600 hover:underline"
            target="_blank"
          >
            GitHub
          </Link>
        </p>
      </footer>
    </main>
  );
}

function FeatureCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <h3 className="text-lg font-semibold mb-3 text-gray-900">{title}</h3>
      <p className="text-gray-600 leading-relaxed">{description}</p>
    </div>
  );
}
