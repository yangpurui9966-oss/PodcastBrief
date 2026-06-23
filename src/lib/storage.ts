import { promises as fs } from 'fs';
import { join } from 'path';

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';

/**
 * 确保上传目录存在
 */
async function ensureUploadDir(): Promise<void> {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
}

/**
 * 保存上传的文件到本地
 *
 * @param file - 上传的文件 (Buffer)
 * @param filename - 原始文件名
 * @returns 保存后的相对路径
 */
export async function saveFile(file: Buffer, filename: string): Promise<string> {
  await ensureUploadDir();

  const ext = filename.split('.').pop() || 'mp3';
  const safeName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const filePath = join(UPLOAD_DIR, safeName);

  await fs.writeFile(filePath, file);

  return safeName;
}

/**
 * 获取文件的本地绝对路径
 *
 * @param filename - 保存时的文件名
 * @returns 绝对路径
 */
export function getFilePath(filename: string): string {
  return join(UPLOAD_DIR, filename);
}

/**
 * 获取文件对外访问 URL
 *
 * @param filename - 保存时的文件名
 * @returns 可访问的 URL
 */
export function getFileUrl(filename: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return `${baseUrl}/uploads/${filename}`;
}

/**
 * 删除本地文件
 *
 * @param filename - 保存时的文件名
 */
export async function deleteFile(filename: string): Promise<void> {
  try {
    const filePath = join(UPLOAD_DIR, filename);
    await fs.unlink(filePath);
  } catch {
    // 文件不存在时忽略
  }
}

/**
 * 检查文件是否存在
 *
 * @param filename - 保存时的文件名
 */
export async function fileExists(filename: string): Promise<boolean> {
  try {
    await fs.access(join(UPLOAD_DIR, filename));
    return true;
  } catch {
    return false;
  }
}
