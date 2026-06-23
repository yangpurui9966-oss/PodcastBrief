# PodcastBrief

> 粘贴一期播客，几分钟读完一小时内容。

**PodcastBrief** 是一个中文播客内容提取与分析系统。输入播客链接或上传音频文件，系统自动获取节目资料与文字稿，通过 AI 生成结构化摘要、时间轴、内容提取等分析结果。

---

## 核心功能

- **链接解析**：粘贴小宇宙、Apple Podcasts 等平台链接，自动抓取节目元数据
- **语音转写**：利用 Apple Silicon GPU 本地运行 MLX-Whisper，快速将语音转为文字稿
- **结构化摘要**：DeepSeek AI 生成节目概述、核心观点、关键话题、行动建议
- **时间轴分段**：按话题/章节生成时间轴，支持一键跳转原文
- **内容提取**：自动提取嘉宾推荐的书、工具、文章、金句等
- **文件上传**：支持直接上传 MP3/WAV/M4A 音频文件

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Next.js 14 + TypeScript + Tailwind CSS + shadcn/ui |
| 后端 | Next.js API Routes + Prisma + PostgreSQL |
| AI 转写 | MLX-Whisper（macOS 本地部署，Apple Silicon GPU） |
| AI 分析 | DeepSeek-V3（内容分析） |
| 队列 | BullMQ + Redis |
| 存储 | 阿里云 OSS |
| 部署 | Vercel（前端/API）+ macOS 本地（MLX-Whisper + Worker） |

---

## 快速开始

### 环境要求

- macOS 14+（Apple Silicon M1/M2/M3/M4）
- Node.js 20+
- pnpm 9+
- Python 3.11+
- PostgreSQL 15+
- Redis 7+

### 安装

```bash
# 克隆仓库
git clone https://github.com/yangpurui9966-oss/PodcastBrief.git
cd PodcastBrief

# 安装 Node.js 依赖
pnpm install

# 安装 Python 依赖（MLX-Whisper 服务）
cd services/whisper
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cd ../..

# 配置环境变量
cp .env.example .env
# 编辑 .env 填入你的配置（DeepSeek API Key、OSS 等）

# 初始化数据库
pnpm prisma migrate dev --name init
```

### 启动服务（本地开发）

需要同时启动 4 个服务：

```bash
# 终端 1: 启动 Redis（Docker）
pnpm redis

# 终端 2: 启动 MLX-Whisper 本地服务
pnpm whisper
# 首次启动会自动下载模型（large-v3 约 3GB）

# 终端 3: 启动 Node.js Worker
pnpm worker

# 终端 4: 启动 Next.js 开发服务器
pnpm dev
```

### 环境变量

```bash
# 数据库
DATABASE_URL="postgresql://user:password@localhost:5432/podcastbrief"

# Redis
REDIS_URL="redis://localhost:6379"

# 阿里云 OSS
OSS_ACCESS_KEY_ID=
OSS_ACCESS_KEY_SECRET=
OSS_BUCKET=
OSS_REGION=

# MLX-Whisper 本地语音转写服务
WHISPER_API_URL="http://localhost:8000"
WHISPER_MODEL="large-v3"

# DeepSeek（内容分析）
DEEPSEEK_API_KEY=

# 应用
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 项目结构

```
PodcastBrief/
├── src/
│   ├── app/              # Next.js App Router
│   │   ├── api/          # API Routes
│   │   ├── podcasts/     # 播客详情页
│   │   └── page.tsx      # 首页
│   ├── components/       # React 组件
│   ├── lib/              # 工具函数
│   │   ├── db.ts         # Prisma 客户端
│   │   ├── ai.ts         # AI 分析封装（DeepSeek）
│   │   ├── transcribe.ts # MLX-Whisper 转写封装
│   │   └── queue.ts      # BullMQ 队列
│   └── workers/          # 异步任务 Worker
│       └── podcast.ts    # 播客处理 Worker
├── prisma/
│   └── schema.prisma     # 数据库 Schema
├── services/
│   └── whisper/          # MLX-Whisper Python 本地服务
│       ├── main.py         # FastAPI 服务入口
│       └── requirements.txt
├── docker/               # Docker 配置
├── .env.example          # 环境变量模板
└── README.md
```

---

## 开发计划

参见 [PodcastBrief-开发计划.md](PodcastBrief-开发计划.md) 和 [PodcastBrief-技术栈确认.md](PodcastBrief-技术栈确认.md)。

| 阶段 | 周期 | 目标 |
|------|------|------|
| 一 | 1-2 周 | 项目骨架 + 小宇宙/Apple Podcasts 链接解析 + 文件上传 |
| 二 | 3-4 周 | 语音转写（MLX-Whisper）+ DeepSeek AI 分析 + 前端详情页 |
| 三 | 5-6 周 | 多平台扩展 + 分享卡片 + 移动端适配 |
| 四 | 7-8 周 | 测试覆盖 + 性能优化 + 监控 + 部署上线 |

---

## 开源协议

[MIT](LICENSE)

---

*Built with Next.js, MLX-Whisper, DeepSeek, and lots of podcasts.*
