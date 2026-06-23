# PodcastBrief

> 粘贴一期播客，几分钟读完一小时内容。

**PodcastBrief** 是一个**纯本地运行**的中文播客内容提取与分析系统。所有数据（音频、文字稿、分析结果）存储在本地，不依赖任何云服务。

---

## 核心特性

- **🎙️ 本地语音转写**：基于 MLX-Whisper，利用 Apple Silicon GPU 加速，音频无需上传云端
- **🤖 AI 结构化摘要**：DeepSeek 分析文字稿，生成节目概述、时间轴、推荐资源
- **🔒 隐私优先**：全部数据本地存储，播客内容不离开你的设备
- **📦 一键部署**：所有服务运行在 macOS 本地，无需云服务器

---

## 技术栈（全本地）

| 组件 | 技术 | 运行方式 |
|------|------|----------|
| 前端 | Next.js 14 + TypeScript + Tailwind CSS | 本地 `pnpm dev` |
| 后端 | Next.js API Routes + Prisma | 本地 Node.js |
| 数据库 | PostgreSQL 16 | Docker 本地 |
| 缓存/队列 | Redis 7 | Docker 本地 |
| 语音转写 | MLX-Whisper (large-v3) | 本地 Python + Apple GPU |
| AI 分析 | DeepSeek-V3 | API 调用（仅文字分析） |
| 文件存储 | 本地文件系统 | `./uploads` 目录 |

---

## 环境要求

- **macOS 14+**（Apple Silicon M1/M2/M3/M4）
- **Node.js 20+**
- **pnpm 9+**
- **Python 3.11+**
- **Docker Desktop**（用于 PostgreSQL + Redis）
- **至少 16GB 统一内存**（推荐 24GB+，用于 Whisper large-v3）

---

## 快速开始

### 1. 克隆仓库

```bash
git clone https://github.com/yangpurui9966-oss/PodcastBrief.git
cd PodcastBrief
```

### 2. 安装依赖

```bash
# Node.js 依赖
pnpm install

# Python 依赖（MLX-Whisper 服务）
cd services/whisper
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cd ../..
```

### 3. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env，填入 DeepSeek API Key（仅 AI 分析需要）
```

### 4. 启动基础设施（PostgreSQL + Redis）

```bash
pnpm infra
# 首次运行会自动创建数据库和表
```

### 5. 初始化数据库

```bash
pnpm db:migrate
# 输入迁移名称: init
```

### 6. 启动所有服务

需要 **4 个终端窗口**同时运行：

```bash
# 终端 1: MLX-Whisper 语音转写服务（首次启动会自动下载模型，约 3GB）
pnpm whisper

# 终端 2: 异步任务 Worker（处理音频转写和 AI 分析）
pnpm worker

# 终端 3: Next.js 开发服务器
pnpm dev

# 终端 4: （可选）Prisma Studio 查看数据库
pnpm db:studio
```

### 7. 访问应用

打开浏览器访问 **http://localhost:3000**

---

## 环境变量

```bash
# 数据库（Docker 本地）
DATABASE_URL="postgresql://podcastbrief:podcastbrief@localhost:5432/podcastbrief"

# Redis（Docker 本地）
REDIS_URL="redis://localhost:6379"

# 本地文件存储
UPLOAD_DIR="./uploads"

# MLX-Whisper 本地服务
WHISPER_API_URL="http://localhost:8000"
WHISPER_MODEL="large-v3"

# DeepSeek（仅文字分析，不传输音频）
DEEPSEEK_API_KEY="sk-xxxxxxxx"
DEEPSEEK_BASE_URL="https://api.deepseek.com/v1"

# 应用
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"
```

---

## 项目结构

```
PodcastBrief/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/
│   │   │   ├── podcasts/       # 播客 CRUD API
│   │   │   ├── upload/           # 文件上传 API
│   │   │   ├── health/           # 系统健康检查
│   │   │   └── uploads/          # 静态文件服务
│   │   ├── page.tsx              # 首页（上传入口）
│   │   └── layout.tsx            # 根布局
│   ├── components/             # React 组件
│   ├── lib/                    # 工具函数
│   │   ├── db.ts                 # Prisma 客户端
│   │   ├── ai.ts                 # DeepSeek AI 分析
│   │   ├── transcribe.ts         # MLX-Whisper 调用
│   │   ├── storage.ts            # 本地文件存储
│   │   ├── queue.ts              # BullMQ 队列
│   │   └── logger.ts             # Pino 日志
│   └── workers/
│       └── podcast.ts            # 播客处理 Worker
├── prisma/
│   └── schema.prisma           # 数据库 Schema
├── services/
│   └── whisper/                # MLX-Whisper Python 服务
│       ├── main.py               # FastAPI 服务入口
│       └── requirements.txt
├── docker/
│   └── docker-compose.yml      # PostgreSQL + Redis
├── uploads/                    # 本地音频文件存储（自动创建）
├── .env.example                # 环境变量模板
├── package.json
└── README.md
```

---

## 使用流程

1. **上传音频**：在首页拖拽或点击上传 MP3/WAV/M4A 文件
2. **本地转写**：MLX-Whisper 利用 GPU 将音频转为文字稿
3. **AI 分析**：DeepSeek 分析文字稿，生成结构化摘要
4. **查看结果**：在详情页浏览摘要、时间轴、推荐资源、金句

---

## 性能参考

| 组件 | 60 分钟播客 | 处理时间 | 内存占用 |
|------|------------|----------|----------|
| MLX-Whisper (large-v3) | 60min | ~8-12min | ~12GB |
| MLX-Whisper (medium) | 60min | ~4-6min | ~6GB |
| DeepSeek 分析 | 3万字 | ~30-60s |  negligible |

---

## 隐私说明

| 数据类型 | 处理方式 | 是否离开本地 |
|----------|----------|-------------|
| 音频文件 | 本地 `./uploads` 目录存储 | ❌ 否 |
| 语音转写 | MLX-Whisper 本地 GPU 处理 | ❌ 否 |
| 文字稿 | PostgreSQL 本地数据库存储 | ❌ 否 |
| 分析结果 | PostgreSQL 本地数据库存储 | ❌ 否 |
| AI 分析 | 仅发送文字稿到 DeepSeek API | ⚠️ 仅文字 |

**音频文件永远不会离开你的设备**，只有转写后的文字稿会发送到 DeepSeek 进行摘要分析。

---

## 开发计划

| 阶段 | 周期 | 目标 |
|------|------|------|
| 一 | 1-2 周 | 项目骨架 + 文件上传 + 本地存储 |
| 二 | 3-4 周 | MLX-Whisper 转写 + DeepSeek 分析 + 前端详情页 |
| 三 | 5-6 周 | 小宇宙/Apple 链接解析 + 分享功能 + 移动端优化 |
| 四 | 7-8 周 | 测试覆盖 + 本地模型切换（Ollama）+ 性能优化 |

---

## 故障排查

### MLX-Whisper 服务无法启动

```bash
# 检查 Python 环境
cd services/whisper
source .venv/bin/activate
python -c "import mlx_whisper; print('OK')"

# 手动下载模型
python -c "import mlx_whisper; mlx_whisper.load_models.load_model('large-v3')"
```

### 数据库连接失败

```bash
# 检查 PostgreSQL 是否运行
docker ps | grep postgres

# 查看日志
docker logs podcastbrief-postgres-1
```

### 内存不足（转写时崩溃）

- 使用 `medium` 模型：`WHISPER_MODEL=medium`
- 关闭其他占用内存的应用
- 检查活动监视器

---

## 开源协议

[MIT](LICENSE)

---

*Built with Next.js, MLX-Whisper, DeepSeek, and lots of podcasts. 100% 本地运行。*
