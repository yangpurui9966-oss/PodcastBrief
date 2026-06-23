#!/usr/bin/env python3
"""
PodcastBrief MLX-Whisper 本地语音转写服务

基于 Apple MLX 框架的本地 Whisper 部署，利用 Apple Silicon GPU 加速。
提供 FastAPI HTTP 接口，供 Node.js Worker 调用。

运行方式：
    python main.py
    # 或
    uvicorn main:app --host 0.0.0.0 --port 8000
"""

import os
import tempfile
import time
import traceback
from pathlib import Path
from typing import Optional

import mlx_whisper
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

app = FastAPI(
    title="PodcastBrief Whisper Service",
    description="基于 MLX-Whisper 的本地语音转写服务",
    version="0.1.0",
)

# 配置
DEFAULT_MODEL = os.getenv("WHISPER_MODEL", "large-v3")
WHISPER_API_URL = os.getenv("WHISPER_API_URL", "http://localhost:8000")

# 全局模型缓存（热启动）
_model_cache: dict[str, any] = {}


def get_model(model_name: str):
    """获取或加载 Whisper 模型（带缓存）"""
    if model_name not in _model_cache:
        print(f"[Whisper] Loading model: {model_name} ...")
        _model_cache[model_name] = mlx_whisper.load_models.load_model(model_name)
        print(f"[Whisper] Model {model_name} loaded.")
    return _model_cache[model_name]


class TranscriptionResponse(BaseModel):
    text: str = Field(description="完整转写文字稿")
    segments: list[dict] = Field(description="分段结果，包含时间戳和文字")
    duration: float = Field(description="音频时长（秒）")
    model: str = Field(description="使用的模型名称")
    processing_time: float = Field(description="处理耗时（秒）")


class TranscriptionRequest(BaseModel):
    url: Optional[str] = Field(None, description="音频文件 URL（与 file 二选一）")
    language: str = Field("zh", description="音频语言，默认中文")
    model: str = Field(DEFAULT_MODEL, description="Whisper 模型名称")
    speaker_diarization: bool = Field(False, description="是否启用说话人分离（实验性）")


@app.get("/health")
async def health_check():
    """健康检查接口"""
    return {
        "status": "ok",
        "service": "mlx-whisper",
        "default_model": DEFAULT_MODEL,
    }


@app.post("/transcribe", response_model=TranscriptionResponse)
async def transcribe(
    file: Optional[UploadFile] = File(None, description="上传的音频文件"),
    url: Optional[str] = Form(None, description="音频文件 URL"),
    language: str = Form("zh", description="音频语言"),
    model: str = Form(DEFAULT_MODEL, description="Whisper 模型"),
    speaker_diarization: bool = Form(False, description="说话人分离"),
):
    """
    转写音频文件

    支持两种方式：
    1. 直接上传文件（multipart/form-data）
    2. 提供 URL（Worker 常用方式）
    """
    start_time = time.time()

    # 校验输入
    if not file and not url:
        raise HTTPException(status_code=400, detail="请提供 file 或 url 参数")

    # 准备音频文件路径
    temp_path: Optional[Path] = None
    try:
        if file:
            # 保存上传文件到临时目录
            suffix = Path(file.filename).suffix if file.filename else ".mp3"
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
                content = await file.read()
                tmp.write(content)
                temp_path = Path(tmp.name)
            audio_path = str(temp_path)
        else:
            # 从 URL 下载
            import urllib.request
            suffix = Path(url).suffix or ".mp3"
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
                urllib.request.urlretrieve(url, tmp.name)
                temp_path = Path(tmp.name)
            audio_path = str(temp_path)

        print(f"[Whisper] Transcribing: {audio_path}, model={model}, lang={language}")

        # 执行转写
        result = mlx_whisper.transcribe(
            audio_path,
            path_or_hf_repo=model,
            language=language,
            verbose=None,  # 关闭进度输出
        )

        # 解析结果
        text = result.get("text", "").strip()
        segments = [
            {
                "start": seg["start"],
                "end": seg["end"],
                "text": seg["text"].strip(),
                "speaker": seg.get("speaker", "SPEAKER_00"),
            }
            for seg in result.get("segments", [])
        ]
        duration = segments[-1]["end"] if segments else 0.0
        processing_time = time.time() - start_time

        print(f"[Whisper] Done. Duration: {duration:.1f}s, "
              f"Segments: {len(segments)}, Time: {processing_time:.1f}s")

        return TranscriptionResponse(
            text=text,
            segments=segments,
            duration=duration,
            model=f"mlx-whisper-{model}",
            processing_time=processing_time,
        )

    except Exception as e:
        print(f"[Whisper] Error: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"转写失败: {str(e)}")

    finally:
        # 清理临时文件
        if temp_path and temp_path.exists():
            try:
                temp_path.unlink()
            except Exception:
                pass


@app.post("/transcribe/url")
async def transcribe_url(request: TranscriptionRequest):
    """通过 URL 转写（JSON 请求体）"""
    if not request.url:
        raise HTTPException(status_code=400, detail="url 参数必填")
    return await transcribe(
        file=None,
        url=request.url,
        language=request.language,
        model=request.model,
        speaker_diarization=request.speaker_diarization,
    )


@app.get("/models")
async def list_models():
    """列出支持的模型"""
    return {
        "models": [
            {"id": "tiny", "name": "Tiny", "speed": "最快", "accuracy": "一般"},
            {"id": "base", "name": "Base", "speed": "快", "accuracy": "良好"},
            {"id": "small", "name": "Small", "speed": "中等", "accuracy": "较好"},
            {"id": "medium", "name": "Medium", "speed": "较慢", "accuracy": "好"},
            {"id": "large-v3", "name": "Large v3", "speed": "慢", "accuracy": "最佳"},
        ],
        "default": DEFAULT_MODEL,
    }


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("WHISPER_PORT", "8000"))
    host = os.getenv("WHISPER_HOST", "0.0.0.0")
    print(f"[Whisper] Starting MLX-Whisper service on http://{host}:{port}")
    print(f"[Whisper] Default model: {DEFAULT_MODEL}")
    uvicorn.run(app, host=host, port=port)
