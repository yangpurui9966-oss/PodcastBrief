import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

interface Params {
  params: { id: string };
}

/**
 * GET /api/podcasts/:id/status
 * 获取播客处理状态（用于前端轮询）
 */
export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = params;

    const podcast = await db.podcast.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        error: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!podcast) {
      return NextResponse.json({ error: '播客未找到' }, { status: 404 });
    }

    // 计算进度百分比
    const progressMap: Record<string, number> = {
      PENDING: 0,
      FETCHING: 10,
      TRANSCRIBING: 30,
      ANALYZING: 70,
      DONE: 100,
      ERROR: 0,
    };

    return NextResponse.json({
      id: podcast.id,
      status: podcast.status,
      progress: progressMap[podcast.status] || 0,
      error: podcast.error,
      updatedAt: podcast.updatedAt,
    });
  } catch (error) {
    console.error('获取状态失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}
