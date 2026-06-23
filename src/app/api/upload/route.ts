import { NextRequest, NextResponse } from 'next/server';
import { saveFile } from '@/lib/storage';

/**
 * POST /api/upload
 * 上传音频文件到本地存储
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: '请上传文件' }, { status: 400 });
    }

    // 校验文件类型
    const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/x-m4a', 'audio/mp4', 'audio/mp3'];
    const allowedExts = ['.mp3', '.wav', '.m4a', '.aac', '.ogg'];
    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();

    if (!allowedTypes.includes(file.type) && !allowedExts.includes(ext)) {
      return NextResponse.json(
        { error: '不支持的文件类型，请上传 MP3/WAV/M4A 格式' },
        { status: 400 }
      );
    }

    // 校验文件大小（500MB）
    const maxSize = 500 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: '文件过大，请上传小于 500MB 的文件' },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filename = await saveFile(buffer, file.name);

    return NextResponse.json({
      filename,
      originalName: file.name,
      size: file.size,
      url: `/uploads/${filename}`,
    });
  } catch (error) {
    console.error('上传文件失败:', error);
    return NextResponse.json(
      { error: '上传失败', message: String(error) },
      { status: 500 }
    );
  }
}
