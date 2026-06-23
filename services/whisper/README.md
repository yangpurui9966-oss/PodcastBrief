# MLX-Whisper 本地语音转写服务

基于 Apple MLX 框架的本地 Whisper 部署，利用 Apple Silicon GPU 加速中文播客语音转写。

---

## 环境要求

- macOS 14+（Sonoma / Sonoma / Sequoia）
- Apple Silicon（M1 / M2 / M3 / M4）
- Python 3.11+
- 至少 8GB 统一内存（推荐 16GB+）

---

## 安装

```bash
# 进入服务目录
cd services/whisper

# 创建虚拟环境
python3 -m venv .venv
source .venv/bin/activate

# 安装依赖
pip install -r requirements.txt
```

---

## 启动服务

```bash
# 确保在虚拟环境中
source .venv/bin/activate

# 启动 FastAPI 服务（默认端口 8000）
python main.py

# 或使用 uvicorn 直接启动
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

服务启动后会自动下载 Whisper 模型（首次运行），后续从缓存加载。

---

## API 接口

### 转写音频文件

```bash
curl -X POST "http://localhost:8000/transcribe" \
  -F "file=@/path/to/audio.mp3" \
  -F "language=zh" \
  -F "model=large-v3"
```

**响应示例**：

```json
{
  "text": "完整文字稿...",
  "segments": [
    {
      "start": 0.0,
      "end": 5.32,
      "text": "大家好，欢迎收听本期节目。",
      "speaker": "SPEAKER_00"
    }
  ],
  "duration": 3600.5,
  "model": "mlx-whisper-large-v3",
  "processing_time": 45.2
}
```

### 健康检查

```bash
curl http://localhost:8000/health
```

---

## 模型选择

| 模型 | 速度 | 准确率 | 内存占用 | 适用场景 |
|------|------|--------|----------|----------|
| `tiny` | 最快 | 一般 | ~1GB | 快速测试 |
| `base` | 快 | 良好 | ~1.5GB | 开发调试 |
| `small` | 中等 | 较好 | ~3GB | 平衡选择 |
| `medium` | 较慢 | 好 | ~5GB | 推荐 |
| `large-v3` | 慢 | 最佳 | ~10GB | 生产环境 |

**建议**：中文播客使用 `large-v3` 或 `medium`，默认 `large-v3`。

---

## 与 Node.js Worker 集成

Node.js Worker 通过环境变量 `WHISPER_API_URL` 连接此服务：

```bash
WHISPER_API_URL=http://localhost:8000
```

Worker 将音频文件 URL 发送给此服务，获取文字稿后存入数据库。

---

## 性能参考

在 M3 Pro（18GB 内存）上的实测数据：

| 模型 | 60分钟播客 | 处理时间 | 内存峰值 |
|------|------------|----------|----------|
| large-v3 | 60min | ~8-12min | ~12GB |
| medium | 60min | ~4-6min | ~6GB |
| small | 60min | ~2-3min | ~3GB |

---

## 故障排查

### 模型下载失败

```bash
# 手动下载模型
python -c "import mlx_whisper; mlx_whisper.load_models.load_model('large-v3')"
```

### 内存不足

- 使用 `medium` 或 `small` 模型
- 关闭其他占用内存的应用
- 检查活动监视器确认内存使用

### GPU 未使用

确保使用 Apple Silicon（M 系列芯片），Intel Mac 不支持 MLX。

---

*服务默认监听 0.0.0.0:8000，仅本地访问。生产环境如需外网暴露，请配置 Nginx 反向代理 + HTTPS。*
