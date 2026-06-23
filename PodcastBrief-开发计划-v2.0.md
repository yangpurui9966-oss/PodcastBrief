# PodcastBrief 开发计划（v2.0 — 行业对标版）

> **项目概述**：PodcastBrief 是一个中文播客内容提取与分析系统。用户输入播客链接或上传音频文件，系统自动获取节目资料与文字稿，通过 AI 生成结构化摘要、时间轴、内容提取等分析结果，实现「粘贴一期播客，几分钟读完一小时内容」的目标。
>
> **核心原则**：100% macOS 本地部署，零云服务依赖，音频永不离开本机。
>
> **文档版本**：v2.0（2026-06-23）
> **更新说明**：基于行业最新技术趋势（MLX-Whisper 量化、Ollama 本地 LLM、SenseVoice 中文优化）和标杆产品（Snipd、Podcast Transcriber、Podsqueeze）深度调研后重构。

---

## 1. 行业调研与对标分析

### 1.1 标杆产品功能矩阵

| 产品 | 转写引擎 | 摘要质量 | 时间轴 | 内容提取 | 平台支持 | 导出能力 | 价格 | 隐私 |
|------|----------|----------|--------|----------|----------|----------|------|------|
| **Snipd** | Whisper（云端） | ⭐⭐⭐⭐⭐ | 自动章节 | 金句/推荐 | 全平台 | Notion/Readwise/Obsidian | 付费 $9.99/月 | ❌ 云端 |
| **Podcast Transcriber** | Faster-Whisper（本地） | ⭐⭐⭐⭐ | 时间码 | 关键点 | Apple/小宇宙/RSS | SRT/VTT/TXT/JSON | 开源免费 | ✅ 本地 |
| **Podsqueeze** | Whisper（云端） | ⭐⭐⭐⭐ | 章节标记 | Show Notes | 通用 | 博客/社交媒体 | 付费 SaaS | ❌ 云端 |
| **Descript** | 自研 ASR | ⭐⭐⭐⭐⭐ | 文本编辑音频 | 多轨编辑 | 通用 | 全格式 | 付费 $12/月 | ❌ 云端 |
| **PodcastBrief（目标）** | MLX-Whisper（本地 GPU） | DeepSeek/Ollama | 话题分段 | 书/工具/金句 | 小宇宙/Apple/RSS/上传 | Markdown/图片/JSON | 开源免费 | ✅ 纯本地 |

### 1.2 关键行业洞察（2025-2026）

#### 语音转写技术趋势
- **MLX-Whisper 4-bit 量化**：M2 Ultra 上 10 分钟音频仅需 10-20 秒，内存从 3GB 降至 800MB（`mlx-community/whisper-large-v3-mlx`）
- **SenseVoice（MLX 版）**：非自回归架构 + MLX GPU 加速，27 分钟中文播客 13.83 秒，专为中日韩语优化
- **Parakeet V3**：NVIDIA 出品，英语 5 分钟 2.91 秒（103× 实时），但仅支持欧洲语言
- **行业共识**：中文场景优先 SenseVoice Small，多语言场景用 Whisper large-v3，量化是必须的

#### 本地 LLM 部署趋势
- **Ollama 成为事实标准**：macOS 上一键运行 DeepSeek-R1（1.5B/7B/14B/32B），OpenAI 兼容 API 格式
- **M2 Max 32GB 可跑 32B 模型**：本地推理质量接近云端 API，成本为零
- **AnythingLLM + Ollama**：RAG 知识库成为本地 AI 标配
- **行业趋势**：模型从「云端 API 调用」转向「本地 Ollama 服务 + 云端 fallback」

#### 播客 AI 分析标杆
- **Snipd 的 5 分钟摘要**：不是简单压缩，而是提取「核心观点 + 嘉宾介绍 + 书籍推荐 + 行动建议」
- **动态同步算法**：解决广告插入导致时间戳错位，这是播客特有的技术挑战
- **耳机快捷保存**：三击耳机自动保存片段并生成摘要，这是移动端杀手功能
- **多平台导出**：Notion、Readwise、Obsidian、LogSeq 的集成是用户留存关键

---

## 2. 架构设计（预留双拓展）

### 2.1 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                        macOS 本地部署                        │
│                                                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌────────────┐ │
│  │   Next.js App   │  │  BullMQ Worker  │  │  MLX-Whisper│ │
│  │    (Port 3000)  │  │  (Node.js)      │  │  (Port 8000)│ │
│  │                 │  │                 │  │  Python     │ │
│  │  • 前端页面      │  │  • 任务调度      │  │  • 语音转写  │ │
│  │  • API Routes   │  │  • 状态管理      │  │  • 量化模型  │ │
│  │  • 文件上传      │  │  • 重试/容错     │  │  • 时间戳    │ │
│  └────────┬────────┘  └────────┬────────┘  └──────┬───────┘ │
│           │                    │                   │         │
│  ┌────────┴────────────────────┴───────────────────┴────────┐│
│  │                    抽象层（可插拔）                        ││
│  │  ┌──────────────┐  ┌──────────────┐  ┌────────────────┐  ││
│  │  │  ModelProvider│  │PlatformParser│  │  StorageAdapter │  ││
│  │  │  模型接入层   │  │ 平台解析层    │  │  存储适配层     │  ││
│  │  │              │  │              │  │                │  ││
│  │  │  • DeepSeek  │  │  • 小宇宙     │  │  • 本地文件     │  ││
│  │  │  • Ollama    │  │  • Apple     │  │  • 本地数据库   │  ││
│  │  │  • OpenAI    │  │  • RSS通用   │  │  • (预留云存储) │  ││
│  │  │  • (预留更多)│  │  • (预留更多)│  │  • (预留更多)  │  ││
│  │  └──────────────┘  └──────────────┘  └────────────────┘  ││
│  └──────────────────────────────────────────────────────────┘│
│                              │                               │
│  ┌───────────────────────────┴───────────────────────────┐ │
│  │              Docker 基础设施（本地）                        │ │
│  │  ┌────────────────┐  ┌────────────────┐                │ │
│  │  │  PostgreSQL 16 │  │  Redis 7       │                │ │
│  │  │  Port 5432     │  │  Port 6379     │                │ │
│  │  └────────────────┘  └────────────────┘                │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 预留拓展一：模型接入抽象层（ModelProvider）

```typescript
// src/lib/models/provider.ts
export interface ModelProvider {
  name: string;
  type: 'cloud' | 'local';
  
  // 分析文字稿，返回结构化结果
  analyze(transcript: string, options?: AnalyzeOptions): Promise<AnalysisResult>;
  
  // 健康检查
  health(): Promise<{ ok: boolean; model: string; latency: number }>;
  
  // 支持的模型列表
  listModels(): Promise<ModelInfo[]>;
}

// 已实现的 Provider
export class DeepSeekProvider implements ModelProvider { ... }
export class OllamaProvider implements ModelProvider { ... }
export class OpenAIProvider implements ModelProvider { ... }

// 工厂模式：根据配置自动切换
export function createModelProvider(config: ModelConfig): ModelProvider {
  switch (config.provider) {
    case 'deepseek': return new DeepSeekProvider(config);
    case 'ollama': return new OllamaProvider(config);
    case 'openai': return new OpenAIProvider(config);
    default: throw new Error(`Unknown provider: ${config.provider}`);
  }
}
```

**支持的模型矩阵**：

| Provider | 类型 | 代表模型 | 适用场景 | 配置方式 |
|----------|------|----------|----------|----------|
| **DeepSeek** | 云端 API | DeepSeek-V3 / R1 | 默认主力，效果最佳 | `DEEPSEEK_API_KEY` |
| **Ollama** | 本地 GPU | deepseek-r1:32b / qwen2.5 | 隐私优先，离线可用 | `OLLAMA_HOST` |
| **OpenAI** | 云端 API | GPT-4o / GPT-4o-mini | 备用 fallback | `OPENAI_API_KEY` |
| **(预留)** | 本地 | LM Studio / llama.cpp | 扩展本地生态 | 统一接口 |

### 2.3 预留拓展二：播客平台解析层（PlatformParser）

```typescript
// src/lib/platforms/parser.ts
export interface PlatformParser {
  name: string;
  
  // 判断是否支持该 URL
  supports(url: string): boolean;
  
  // 解析节目元数据 + 音频 URL
  parse(url: string): Promise<PodcastMetadata>;
  
  // 获取平台已有文字稿（如果有）
  fetchTranscript?(url: string): Promise<string | null>;
}

// 已实现的 Parser
export class XiaoyuzhouParser implements PlatformParser { ... }
export class ApplePodcastsParser implements PlatformParser { ... }
export class RSSParser implements PlatformParser { ... }
export class DirectAudioParser implements PlatformParser { ... }

// 工厂模式：自动路由到对应解析器
export function createPlatformParser(url: string): PlatformParser {
  const parsers = [
    new XiaoyuzhouParser(),
    new ApplePodcastsParser(),
    new RSSParser(),
    new DirectAudioParser(),
  ];
  return parsers.find(p => p.supports(url)) || new RSSParser();
}
```

**支持的平台矩阵**：

| 平台 | 解析方式 | 文字稿获取 | 优先级 | 备注 |
|------|----------|------------|--------|------|
| **小宇宙** | 网页解析 / 分享 API | 平台已有（优先） | P0 | 中文播客主阵地 |
| **Apple Podcasts** | iTunes API / RSS | RSS 中可能包含 | P0 | 国际通用标准 |
| **通用 RSS** | XML 解析 | `<transcript>` 或 `<content:encoded>` | P1 | 所有播客的标准格式 |
| **喜马拉雅** | 网页解析 | 平台已有（部分） | P2 | 需后续实现 |
| **网易云音乐** | 网页解析 | 极少 | P3 | 需后续实现 |
| **直接音频 URL** | 直链下载 | 无 | P0 | 用户上传/粘贴直链 |

---

## 3. 数据模型（v2.0）

```prisma
// 播客节目（核心实体）
model Podcast {
  id          String   @id @default(cuid())
  title       String
  description String?  @db.Text
  coverUrl    String?  // 本地路径或 URL
  audioUrl    String   // 本地路径或远程 URL
  sourceType  SourceType
  sourceUrl   String?  // 原始链接
  platform    Platform?
  duration    Int?     // 秒
  status      PodcastStatus @default(PENDING)
  error       String?  @db.Text
  
  // 预留：模型配置快照（用于追溯）
  whisperModel String?  @default("large-v3")
  aiProvider   String?  @default("deepseek")
  aiModel      String?  @default("deepseek-chat")
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  transcripts Transcript[]
  analyses    Analysis[]
  tasks       Task[]

  @@index([status])
  @@index([createdAt])
  @@index([platform])
}

model Transcript {
  id        String   @id @default(cuid())
  podcastId String
  podcast   Podcast  @relation(fields: [podcastId], references: [id], onDelete: Cascade)
  language  String   @default("zh-CN")
  segments  Json     // [{start, end, text, speaker?, confidence?}]
  rawText   String   @db.Text
  
  // 预留：多引擎支持
  engine    String   @default("mlx-whisper") // mlx-whisper | sensevoice | faster-whisper
  model     String   @default("large-v3")
  
  createdAt DateTime @default(now())

  @@index([podcastId])
}

model Analysis {
  id        String       @id @default(cuid())
  podcastId String
  podcast   Podcast      @relation(fields: [podcastId], references: [id], onDelete: Cascade)
  type      AnalysisType
  content   Json
  
  // 预留：模型溯源
  aiProvider String   @default("deepseek")
  aiModel    String   @default("deepseek-chat")
  
  createdAt DateTime @default(now())

  @@index([podcastId])
  @@index([type])
}

model Task {
  id        String    @id @default(cuid())
  podcastId String
  podcast   Podcast   @relation(fields: [podcastId], references: [id], onDelete: Cascade)
  type      TaskType
  status    TaskStatus @default(PENDING)
  progress  Int       @default(0)
  error     String?   @db.Text
  result    Json?
  
  // 预留：重试策略
  attempts  Int       @default(0)
  maxAttempts Int     @default(3)
  
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  @@index([podcastId])
  @@index([status])
}

enum SourceType { LINK; UPLOAD }
enum Platform { XIAOYUZHOU; APPLE; XIMALAYA; NETEASE; RSS; CUSTOM }
enum PodcastStatus { PENDING; FETCHING; TRANSCRIBING; ANALYZING; DONE; ERROR }
enum AnalysisType { SUMMARY; TIMELINE; KEY_TOPICS; RESOURCES; QUOTES; SHOW_NOTES }
enum TaskType { FETCH_METADATA; TRANSCRIBE; ANALYZE }
enum TaskStatus { PENDING; RUNNING; DONE; ERROR }
```

---

## 4. 技术栈（行业最新方案）

| 层级 | 技术选型 | 行业理由 | 替代方案 |
|------|----------|----------|----------|
| **前端** | Next.js 14 App Router + TypeScript + Tailwind + shadcn/ui | 全栈一体化，App Router 已成为 Next.js 主流（2025） | Remix / Nuxt（不推荐） |
| **后端** | Next.js API Routes + tRPC（预留） | 类型安全端到端，tRPC 是 2025 全栈类型安全标配 | REST（当前使用） |
| **数据库** | PostgreSQL 16 + Prisma | 全文搜索（tsvector）、JSON 支持、迁移自动化 | SQLite（轻量备选） |
| **缓存/队列** | Redis 7 + BullMQ | BullMQ 是 Node.js 生态最成熟的队列方案，支持延迟/重试/进度 | RabbitMQ（过重） |
| **语音转写** | **MLX-Whisper large-v3（4-bit 量化）** | 行业最优：M2 Ultra 10 分钟音频 10-20 秒，内存 800MB | SenseVoice（中文极速）/ faster-whisper |
| **中文优化** | **SenseVoice Small（MLX 版）** | 非自回归 + MLX GPU，27 分钟中文 13.83 秒，专为 CJK 优化 | Whisper large-v3（通用但慢） |
| **AI 分析** | **DeepSeek-V3（默认）+ Ollama（预留）** | DeepSeek 成本极低 + 中文优秀；Ollama 是 2025 本地 LLM 事实标准 | GPT-4o / Claude / 本地 Qwen |
| **本地 LLM** | Ollama + deepseek-r1:32b | M2 Max 32GB 可流畅运行，OpenAI 兼容 API | LM Studio / llama.cpp |
| **文件存储** | 本地文件系统 (`./uploads`) | 零依赖，配合 Next.js 静态文件服务 | (预留：MinIO 本地 S3) |
| **部署** | macOS 本地直接运行 | Docker 仅用于 PG + Redis，核心服务本地进程 | (预留：Docker Compose 全量) |
| **日志** | Pino（结构化 JSON） | 性能最优，适合生产环境日志聚合 | Winston |
| **监控** | Sentry（前端错误） | 免费额度够用，自动 source map | (预留：本地 Prometheus) |

---

## 5. 开发阶段（8 周，对标行业标杆）

### 阶段一：基础设施 + 核心链路（第 1-2 周）
**目标**：可运行骨架，支持文件上传 + 本地存储 + 健康检查

| 任务 | 工时 | 对标理由 |
|------|------|----------|
| 项目初始化（Next.js 14 + TypeScript + Tailwind + Prisma） | 1d | 业界标准初始化流程 |
| 数据库设计（Schema + 迁移 + 种子数据） | 1d | Prisma 迁移是生产级必备 |
| **本地文件存储模块** (`storage.ts`) | 1d | 替代阿里云 OSS，零依赖 |
| **文件上传 API**（支持 500MB，类型校验） | 1d | Podcast Transcriber 同款限制 |
| **播客 CRUD API**（创建/获取/列表/删除/状态） | 1.5d | RESTful 标准，支持前端轮询 |
| **健康检查 API**（DB + Redis + Whisper 状态） | 0.5d | Snipd 级别的服务可观测性 |
| **前端首页**（交互式上传 + 进度显示） | 1.5d | 参考 Snipd 的简洁上传体验 |
| Docker Compose（PostgreSQL 16 + Redis 7） | 0.5d | 基础设施即代码 |

**阶段一交付**：`pnpm infra` 一键启动，前端可上传文件，API 返回任务 ID，健康检查全绿。

---

### 阶段二：语音转写 + AI 分析 Pipeline（第 3-4 周）
**目标**：完整的本地 AI 分析链路，对标 Snipd 核心体验

| 任务 | 工时 | 对标理由 |
|------|------|----------|
| **MLX-Whisper 服务优化**（4-bit 量化 + 模型缓存） | 1.5d | 行业最新：量化后 800MB 内存即可运行 large-v3 |
| **SenseVoice 预留接口**（中文极速转写） | 1d | 2025 中文播客最佳实践：SenseVoice 比 Whisper 快 16 倍 |
| **转写模块** (`transcribe.ts`)：调用本地 Whisper + 保存结果 | 1d | 支持 URL 和文件路径两种输入 |
| **模型抽象层** (`ModelProvider`)：DeepSeek + Ollama 接口 | 2d | 预留拓展核心：统一接口，一键切换 |
| **AI 分析 Pipeline**：摘要/时间轴/资源/金句 | 2d | 对标 Snipd 的 5 分钟摘要质量 |
| **Worker 任务处理**：转写 → 分析 → 状态更新 | 1.5d | BullMQ 标准模式：重试、进度、死信队列 |
| **前端详情页**：文字稿 + 时间轴 + 分析结果 | 2d | 参考 Snipd 的章节导航 + 高亮金句 |

**阶段二交付**：上传 60 分钟播客 → 本地 GPU 转写 → DeepSeek 分析 → 前端展示结构化摘要 + 时间轴。

---

### 阶段三：平台拓展 + 体验优化（第 5-6 周）
**目标**：支持链接解析，移动端可用，可分享

| 任务 | 工时 | 对标理由 |
|------|------|----------|
| **平台抽象层** (`PlatformParser`)：通用接口 | 1d | 预留拓展核心：新增平台只需实现一个 Parser |
| **小宇宙解析器**：网页抓取 + 分享 API | 2d | 中文播客主阵地，参考 Podcast Transcriber 实现 |
| **Apple Podcasts 解析器**：iTunes API + RSS | 1.5d | 国际通用标准，RSS 是最可靠的解析方式 |
| **通用 RSS 解析器**：标准 RSS 2.0 + 文字稿提取 | 1d | 所有播客平台的通用后备方案 |
| **前端链接输入**：粘贴链接自动识别平台 | 1d | 参考 Snipd 的「粘贴即用」体验 |
| **响应式适配 + 暗黑模式** | 1.5d | 2025 前端标配 |
| **分享卡片**：生成 Markdown / 图片 / 链接 | 1.5d | 对标 Snipd 的 Notion/Readwise 导出 |

**阶段三交付**：支持粘贴小宇宙/Apple/RSS 链接，自动解析 → 下载音频 → 本地分析 → 分享。

---

### 阶段四：Ollama 本地模型 + 质量优化（第 7-8 周）
**目标**：100% 离线可用，生产级稳定

| 任务 | 工时 | 对标理由 |
|------|------|----------|
| **Ollama Provider 实现**：OpenAI 兼容 API | 2d | 2025 本地 LLM 事实标准，M2 Max 32GB 跑 32B |
| **模型切换 UI**：用户选择 DeepSeek / Ollama / OpenAI | 1d | 用户自主控制隐私 vs 质量的平衡 |
| **Ollama 自动检测**：系统启动时检查本地模型 | 0.5d | 优雅降级：有 Ollama 用本地，没有 fallback |
| **端到端测试**（Playwright） | 2d | 覆盖上传 → 转写 → 分析 → 展示全链路 |
| **性能优化**：大文件上传分片、长音频分段处理 | 1.5d | 60 分钟播客必须稳定处理，不 OOM |
| **错误处理与重试**：转写失败自动重试、AI 失败 fallback | 1d | 生产级容错 |
| **日志与监控**：结构化日志 + 关键指标追踪 | 1d | 生产问题可回溯 |
| **文档**：部署指南、API 文档、故障排查 | 1d | 开源项目必备 |

**阶段四交付**：
- 无网络时可使用 Ollama 本地模型完成全链路分析
- 有网络时默认 DeepSeek，用户可一键切换
- 测试覆盖 > 70%，所有组件健康可监控

---

## 6. 核心功能设计（对标 Snipd）

### 6.1 结构化摘要（对标 Snipd 5 分钟摘要）

**Prompt 模板（DeepSeek / Ollama 通用）**：

```markdown
你是一位专业的播客内容分析师。请根据以下播客文字稿，生成结构化分析结果。

要求输出格式（JSON）：
{
  "summary": "300字以内的节目概述，包含节目主题、核心论点",
  "keyTopics": [
    { "topic": "话题名称", "startTime": "MM:SS", "description": "50字简要说明" }
  ],
  "insights": ["核心观点1", "核心观点2", "核心观点3"],
  "resources": [
    { "type": "book|tool|article|podcast|person", "name": "名称", "context": "提到的上下文" }
  ],
  "quotes": [
    { "text": "金句内容", "speaker": "说话人", "time": "MM:SS" }
  ],
  "actionItems": ["听众可以做的行动建议"],
  "guests": ["嘉宾姓名及身份"]
}

规则：
- 所有内容使用中文输出
- 时间轴必须精确到分钟级别
- 推荐资源必须明确标注类型和名称
- 不要编造文字稿中没有的内容
- 参考 Snipd 的质量标准：简洁、准确、结构化
```

### 6.2 时间轴导航（对标 Snipd 章节切分）

```typescript
// 前端组件：话题时间轴
interface TimelineSegment {
  topic: string;
  startTime: number; // 秒
  endTime: number;
  description: string;
  keyPoints: string[];
}

// 点击时间戳 → 跳转到音频对应位置
// 支持：点击播放、高亮当前话题、自动滚动
```

### 6.3 内容提取（对标 Snipd 的资源推荐）

| 类型 | 提取规则 | 展示方式 |
|------|----------|----------|
| **书籍** | 「《书名》」或「推荐一本书叫...」 | 卡片：书名 + 作者 + 上下文 |
| **工具/产品** | 「我用的工具是...」「推荐一个 App」 | 卡片：名称 + 用途 + 链接（预留） |
| **文章/播客** | 「有一篇文章...」「某期播客提到」 | 卡片：标题 + 来源 + 上下文 |
| **金句** | 高信息密度、有洞察力的句子 | 引用卡片：文字 + 说话人 + 时间戳 |
| **嘉宾** | 介绍语中出现的姓名 + 身份 | 头像卡片（预留）+ 身份 + 相关话题 |

### 6.4 分享导出（对标 Snipd 多平台导出）

| 格式 | 用途 | 实现方式 |
|------|------|----------|
| **Markdown** | 导入 Notion / Obsidian / LogSeq | 纯文本生成 |
| **图片卡片** | 社交媒体分享 | HTML → Canvas / Puppeteer |
| **JSON** | 二次开发 / API 调用 | 结构化数据导出 |
| **SRT** | 字幕文件 | 时间轴分段导出（预留） |
| **(预留) Readwise** | 阅读笔记同步 | Readwise API（需用户授权） |
| **(预留) Notion** | 知识库归档 | Notion API（需用户授权） |

---

## 7. 关键接口设计（v2.0）

```typescript
// POST /api/podcasts
// 创建分析任务（支持文件上传或链接）
Body: 
  | { file: File }                                    // 文件上传
  | { url: string, platform?: Platform }              // 链接解析
Response: { id: string; status: PodcastStatus; message: string }

// GET /api/podcasts/:id
// 获取完整详情（播客 + 最新文字稿 + 所有分析）
Response: { podcast: Podcast; transcript: Transcript; analyses: Analysis[] }

// GET /api/podcasts/:id/status
// 轮询任务状态
Response: { id: string; status: string; progress: number; error?: string }

// POST /api/podcasts/:id/reanalyze
// 重新触发分析（换模型 / 重新生成）
Body: { provider?: string; model?: string; types?: AnalysisType[] }
Response: { id: string; status: string }

// GET /api/health
// 系统健康检查（对标 Snipd 服务稳定性）
Response: { 
  status: 'ok' | 'degraded'; 
  checks: { 
    database: { ok: boolean }; 
    redis: { ok: boolean }; 
    whisper: { ok: boolean; model: string }; 
    ai: { ok: boolean; provider: string; model: string } 
  } 
}

// GET /api/models
// 列出可用的 AI 模型（含本地 Ollama 自动检测）
Response: { 
  providers: [
    { name: 'deepseek'; models: ['deepseek-chat', 'deepseek-reasoner']; status: 'available' },
    { name: 'ollama'; models: ['deepseek-r1:32b', 'qwen2.5:14b']; status: 'available' },
  ]
}
```

---

## 8. 风险与对策（行业经验）

| 风险 | 影响 | 行业对策 | 我们的方案 |
|------|------|----------|------------|
| **MLX-Whisper 内存不足** | 高 | 4-bit 量化是行业标准 | 默认 4-bit 量化，自动降级到 medium |
| **小宇宙反爬** | 高 | RSS 是可靠后备方案 | 优先 RSS，网页解析作为 fallback |
| **DeepSeek API 限流** | 中 | 多 Provider 自动切换 | ModelProvider 自动 fallback 到 Ollama |
| **Ollama 模型未安装** | 中 | 自动检测 + 引导安装 | 健康检查自动检测，UI 提示安装命令 |
| **长音频 Worker 超时** | 中 | 分段处理是行业共识 | 60 分钟音频自动分段转写，再合并 |
| **AI 幻觉** | 高 | 结构化 Prompt + 输出校验 | Zod 校验 + 标注「AI 生成仅供参考」 |
| **播客广告干扰时间戳** | 中 | Snipd 的动态同步算法 | 预留：广告检测 + 时间戳校正（P2） |
| **多说话人识别不准** | 中 | 专业工具用 pyannote | 基础版按停顿分段；进阶版预留 pyannote |

---

## 9. 里程碑与验收标准

| 里程碑 | 时间 | 验收标准 | 对标 |
|--------|------|----------|------|
| **MVP 内测** | 第 4 周末 | 文件上传 → 本地转写 → DeepSeek 分析 → 前端展示摘要 + 时间轴 | Podcast Transcriber 功能完备度 |
| **链接版内测** | 第 6 周末 | 支持小宇宙/Apple/RSS 链接解析，可分享 Markdown | Snipd 的「粘贴即用」体验 |
| **离线版公测** | 第 8 周末 | Ollama 本地模型可用，无网络可完成全链路，测试覆盖 > 70% | 100% 本地隐私承诺兑现 |
| **正式版** | 第 10 周末 | 分享卡片、移动端适配、多平台导出（Notion/Readwise 预留接口） | Snipd 的分享生态 |

---

## 10. 技术预研清单（已调研确认）

| 技术点 | 调研结论 | 来源 |
|--------|----------|------|
| MLX-Whisper 4-bit 量化 | 内存从 3GB 降至 800MB，M2 Ultra 10 分钟音频 10-20 秒 | 社区实测（2025-12） |
| SenseVoice MLX 版 | 27 分钟中文 13.83 秒，非自回归 + Apple GPU，代码从 2249 行减至 288 行 | Whisper Notes 博客（2026-05） |
| Ollama DeepSeek-R1 | M2 Max 32GB 可跑 32B 模型，OpenAI 兼容 API，11434 端口 | 多篇 2025 教程验证 |
| 小宇宙解析 | 网页版分享链接可获取单集信息，RSS 是可靠后备 | 豆瓣技术讨论（2023-2025） |
| Apple Podcasts RSS | iTunes API 搜索 + RSS feed 获取音频和元数据，是行业标准 | Podcast Transcriber 实现 |
| Snipd 功能标杆 | 5 分钟摘要、自动章节、耳机快捷保存、多平台导出 | 产品文档（2025-2026） |
| 播客广告时间戳 | 动态同步算法解决广告插入导致的时间戳错位 | Snipd 技术博客 |

---

## 11. 下一步行动

1. ✅ 开发计划 v2.0 确认
2. 🔄 实现 **ModelProvider 抽象层**（DeepSeek + Ollama 双 Provider）
3. 🔄 实现 **PlatformParser 抽象层**（小宇宙 + Apple + RSS 三 Parser）
4. 🔄 优化 MLX-Whisper 服务（4-bit 量化 + 模型缓存）
5. 🔄 前端详情页（摘要 + 时间轴 + 内容提取）

---

*文档版本：v2.0*
*创建时间：2026-06-23*
*调研范围：MLX-Whisper / SenseVoice / Ollama / Snipd / Podcast Transcriber / Podsqueeze / Descript*
