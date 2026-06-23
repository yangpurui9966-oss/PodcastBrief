import { NextRequest, NextResponse } from 'next/server';
import { createReadStream } from 'fs';
import { getFilePath } from '@/lib/storage';

interface Params {
  params: { filename: string };
}

/**
 * GET /api/uploads/:filename
 * 提供上传文件的静态访问（音频播放、下载）
 */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { filename } = params;
    const filePath = getFilePath(filename);

    const stream = createReadStream(filePath);

    // 根据扩展名设置 Content-Type
    const ext = filename.split('.').pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
      m4a: 'audio/mp4',
      aac: 'audio/aac',
      ogg: 'audio/ogg',
    };

    const contentType = mimeTypes[ext || ''] || 'application/octet-stream';

    return new NextResponse(stream as any, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (error) {
    console.error('文件读取失败:', error);
    return NextResponse.json({ error: '文件未找到' }, { status: 404 });
  }
}
