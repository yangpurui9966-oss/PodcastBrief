import { db } from './db';

interface TranscriptionResult {
  text: string;
  segments: Array<{
    start: number;
    end: number;
    text: string;
    speaker?: string;
  }>;
  duration: number;
  model: string;
  processingTime: number;
}

const WHISPER_API_URL = process.env.WHISPER_API_URL || 'http://localhost:8000';

/**
 * 通过 MLX-Whisper 本地服务转写音频
 *
 * @param audioUrl - 音频文件 URL（OSS 直链）
 * @param podcastId - 播客 ID（用于日志）
 * @returns 转写结果
 */
export async function transcribeAudio(
  audioUrl: string,
  podcastId: string
): Promise<TranscriptionResult> {
  const url = `${WHISPER_API_URL}/transcribe/url`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: audioUrl,
      language: 'zh',
      model: 'large-v3',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Whisper service error: ${response.status} ${error}`);
  }

  const data = (await response.json()) as TranscriptionResult;

  // 保存到数据库
  await db.transcript.create({
    data: {
      podcastId,
      language: 'zh-CN',
      segments: data.segments,
      rawText: data.text,
    },
  });

  return data;
}

/**
 * 检查 Whisper 服务健康状态
 */
export async function checkWhisperHealth(): Promise<{ ok: boolean; model: string }> {
  try {
    const response = await fetch(`${WHISPER_API_URL}/health`, { method: 'GET' });
    if (!response.ok) return { ok: false, model: '' };
    const data = await response.json();
    return { ok: data.status === 'ok', model: data.default_model || '' };
  } catch {
    return { ok: false, model: '' };
  }
}
