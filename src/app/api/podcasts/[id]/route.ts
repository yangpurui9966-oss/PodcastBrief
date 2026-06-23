import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

interface Params {
  params: { id: string };
}

/**
 * GET /api/podcasts/:id
 * 获取单个播客的完整详情（含文字稿和分析结果）
 */
export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = params;

    const podcast = await db.podcast.findUnique({
      where: { id },
      include: {
        transcripts: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        analyses: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!podcast) {
      return NextResponse.json({ error: '播客未找到' }, { status: 404 });
    }

    return NextResponse.json({
      podcast: {
        id: podcast.id,
        title: podcast.title,
        description: podcast.description,
        coverUrl: podcast.coverUrl,
        audioUrl: podcast.audioUrl,
        sourceType: podcast.sourceType,
        sourceUrl: podcast.sourceUrl,
        platform: podcast.platform,
        duration: podcast.duration,
        status: podcast.status,
        error: podcast.error,
        createdAt: podcast.createdAt,
        updatedAt: podcast.updatedAt,
      },
      transcript: podcast.transcripts[0] || null,
      analyses: podcast.analyses.map((a) => ({
        id: a.id,
        type: a.type,
        content: a.content,
        aiModel: a.aiModel,
        createdAt: a.createdAt,
      })),
    });
  } catch (error) {
    console.error('获取播客详情失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/podcasts/:id
 * 删除播客及其关联数据
 */
export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { id } = params;

    await db.podcast.delete({
      where: { id },
    });

    return NextResponse.json({ message: '已删除' });
  } catch (error) {
    console.error('删除播客失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}
