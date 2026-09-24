import { put } from '@vercel/blob';
import { randomUUID } from 'node:crypto';

// Тауар фотосы Vercel Blob-та сақталады (public URL — кейін WhatsApp сол сілтеме арқылы алады).
// Кілт тек BLOB_READ_WRITE_TOKEN айнымалысынан оқылады. Жоқ болса — жүктеу өшірулі, ойдан кілт жасалмайды.

/** WhatsApp Cloud API фото ретінде тек JPEG және PNG қабылдайды, ең көбі 5 МБ. */
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

export class UploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UploadError';
  }
}

export function isBlobConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

/** Файл түрін кеңейтіммен емес, ішіндегі байттармен анықтаймыз. */
export function detectImageType(bytes: Uint8Array): 'image/jpeg' | 'image/png' | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (bytes.length >= 8 && png.every((b, i) => bytes[i] === b)) return 'image/png';
  return null;
}

export function validatePhoto(bytes: Uint8Array): 'image/jpeg' | 'image/png' {
  if (bytes.length === 0) throw new UploadError('Файл пустой');
  if (bytes.length > MAX_PHOTO_BYTES) throw new UploadError('Фото больше 5 МБ — WhatsApp такое не примет');
  const type = detectImageType(bytes);
  if (!type) throw new UploadError('Нужен файл JPG или PNG (WhatsApp не принимает другие форматы)');
  return type;
}

export async function uploadProductPhoto(file: File): Promise<string> {
  if (!isBlobConfigured()) {
    throw new UploadError('Хранилище фото (Vercel Blob) ещё не подключено. Вставьте ссылку на фото вручную или подключите Blob.');
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  const contentType = validatePhoto(bytes);
  const ext = contentType === 'image/png' ? 'png' : 'jpg';
  const blob = await put(`products/${randomUUID()}.${ext}`, Buffer.from(bytes), {
    access: 'public',
    contentType,
    addRandomSuffix: false,
  });
  return blob.url;
}
