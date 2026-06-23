import { NextRequest, NextResponse } from 'next/server';
import { saveFile, getFileUrl } from '@/lib/storage';
import { db } from '@/lib/db';
import { podcastQueue } from '@/lib/queue';
import { z } from 'zod';

const createSchema = z.object({
  url: z.string().url().optional(),
  platform: z.enum(['XIAOYUZHOU', 'APPLE', 'XIMALAYA', 'NETEASE', 'CUSTOM']).optional(),
});

/**
 * POST /api/podcasts
 * 创建新的播客分析任务
 * 支持：1) 上传音频文件  2) 提供播客链接
 */
export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';

    let audioUrl: string | undefined;
    let sourceUrl: string | undefined;
    let platform: string | undefined;
    let title: string | undefined;

    if (contentType.includes('multipart/form-data')) {
      // 文件上传模式
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      title = (formData.get('title') as string) || undefined;

      if (!file) {
        return NextResponse.json({ error: '请上传音频文件' }, { status: 400 });
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const filename = await saveFile(buffer, file.name);
      audioUrl = getFileUrl(filename);
      title = title || file.name;
    } else {
      // 链接模式
      const body = await request.json();
      const parsed = createSchema.safeParse(body);

      if (!parsed.success) {
        return NextResponse.json({ error: '参数错误', details: parsed.error.format() }, { status: 400 });
      }

      sourceUrl = parsed.data.url;
      platform = parsed.data.platform;

      // TODO: 实现平台解析器，获取音频 URL 和元数据
      // 目前先返回错误，需要后续实现
      return NextResponse.json(
        { error: '链接解析功能尚未实现，请直接上传音频文件' },
        { status: 501 }
      );
    }

    // 创建播客记录
    const podcast = await db.podcast.create({
      data: {
        title: title || '未命名播客',
        audioUrl: audioUrl!,
        sourceType: sourceUrl ? 'LINK' : 'UPLOAD',
        sourceUrl: sourceUrl || undefined,
        platform: platform ? (platform as any) : 'CUSTOM',
        status: 'PENDING',
      },
    });

    // 提交异步处理任务
    await podcastQueue.add('process-podcast', { podcastId: podcast.id }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    });

    return NextResponse.json({
      id: podcast.id,
      status: podcast.status,
      message: '任务已创建，正在处理中',
    }, { status: 201 });

  } catch (error) {
    console.error('创建播客失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误', message: String(error) },
      { status: 500 }
    );
  }
}

/**
 * GET /api/podcasts
 * 列出最近的播客记录
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    const podcasts = await db.podcast.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      select: {
        id: true,
        title: true,
        description: true,
        coverUrl: true,
        duration: true,
        status: true,
        createdAt: true,
      },
    });

    const total = await db.podcast.count();

    return NextResponse.json({ podcasts, total, limit, offset });
  } catch (error) {
    console.error('获取播客列表失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}
