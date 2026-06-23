import { NextResponse } from 'next/server';
import { checkWhisperHealth } from '@/lib/transcribe';
import { redis } from '@/lib/queue';

/**
 * GET /api/health
 * 系统健康检查
 */
export async function GET() {
  const checks: Record<string, { ok: boolean; message?: string }> = {};

  // 1. 数据库检查
  try {
    const { db } = await import('@/lib/db');
    await db.$queryRaw`SELECT 1`;
    checks.database = { ok: true };
  } catch (error) {
    checks.database = { ok: false, message: String(error) };
  }

  // 2. Redis 检查
  try {
    await redis.ping();
    checks.redis = { ok: true };
  } catch (error) {
    checks.redis = { ok: false, message: String(error) };
  }

  // 3. MLX-Whisper 检查
  try {
    const whisperHealth = await checkWhisperHealth();
    checks.whisper = { ok: whisperHealth.ok, message: whisperHealth.model || undefined };
  } catch (error) {
    checks.whisper = { ok: false, message: String(error) };
  }

  const allOk = Object.values(checks).every((c) => c.ok);

  return NextResponse.json(
    {
      status: allOk ? 'ok' : 'degraded',
      checks,
    },
    { status: allOk ? 200 : 503 }
  );
}
