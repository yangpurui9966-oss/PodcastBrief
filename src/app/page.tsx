'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<{ id: string; status: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setError(null);
      setResult(null);
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!file) return;

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/podcasts', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '上传失败');
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误');
    } finally {
      setIsUploading(false);
    }
  }, [file]);

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
            100% 本地运行 · Apple Silicon GPU 加速 · DeepSeek AI 分析
          </p>

          {/* Upload Area */}
          <div className="max-w-2xl mx-auto">
            <div
              className={`border-2 border-dashed rounded-xl p-8 mb-6 transition-colors ${
                file
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'
              }`}
            >
              <input
                type="file"
                accept=".mp3,.wav,.m4a,.aac,.ogg"
                onChange={handleFileChange}
                className="hidden"
                id="audio-upload"
              />
              <label htmlFor="audio-upload" className="cursor-pointer block">
                {file ? (
                  <div className="text-left">
                    <p className="font-medium text-gray-900">{file.name}</p>
                    <p className="text-sm text-gray-500">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                ) : (
                  <div>
                    <div className="text-4xl mb-3">🎙️</div>
                    <p className="text-gray-600 font-medium">点击上传音频文件</p>
                    <p className="text-sm text-gray-400 mt-1">
                      支持 MP3 / WAV / M4A / AAC / OGG
                    </p>
                  </div>
                )}
              </label>
            </div>

            <button
              onClick={handleSubmit}
              disabled={!file || isUploading}
              className="w-full px-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {isUploading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  正在处理...
                </span>
              ) : (
                '开始分析'
              )}
            </button>

            {error && (
              <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}

            {result && (
              <div className="mt-4 p-4 bg-green-50 text-green-700 rounded-lg text-sm">
                <p className="font-medium">✅ 任务已创建</p>
                <p className="mt-1">任务 ID: {result.id}</p>
                <p className="mt-1">状态: {result.status}</p>
                <Link
                  href={`/podcasts/${result.id}`}
                  className="inline-block mt-3 text-primary-600 hover:underline font-medium"
                >
                  查看详情 →
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-12">核心功能</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              title="🎙️ 本地语音转写"
              description="基于 MLX-Whisper 的 Apple Silicon GPU 加速转写，音频无需上传云端，完全本地处理"
            />
            <FeatureCard
              title="🤖 AI 结构化摘要"
              description="DeepSeek 智能分析文字稿，生成节目概述、核心观点、时间轴、推荐资源"
            />
            <FeatureCard
              title="🔒 隐私优先"
              description="全部数据存储在本地，播客音频、文字稿、分析结果均不离开你的设备"
            />
          </div>
        </div>
      </section>

      {/* Architecture */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">本地架构</h2>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 font-mono text-sm text-gray-600 overflow-x-auto">
            <pre>{`┌────────────────────────────────────────────┐
│              macOS 本地部署                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
│  │ Next.js  │  │  Worker  │  │ Whisper  │ │
│  │  :3000   │  │  (BullMQ)│  │  :8000   │ │
│  └──────────┘  └──────────┘  └──────────┘ │
│       │              │              │      │
│  ┌────┴──────────────┴──────────────┴────┐ │
│  │         PostgreSQL + Redis (Docker)    │ │
│  │     :5432            :6379            │ │
│  └────────────────────────────────────────┘ │
└────────────────────────────────────────────┘`}</pre>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 px-4 text-center text-gray-500 text-sm">
        <p>
          Built with Next.js + MLX-Whisper + DeepSeek · 100% 本地运行 ·{' '}
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
