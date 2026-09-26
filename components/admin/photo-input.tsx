'use client';

import { useRef, useState } from 'react';
import { inputClass } from '@/components/ui';

// Фото: файл таңдалса — браузерде 1600px-ге дейін кішірейтіп, JPEG етіп жібереміз
// (телефон фотолары 5–10 МБ, ал Vercel 4.5 МБ-тан үлкенін қабылдамайды; WhatsApp-қа да жеңіл).
const MAX_SIDE = 1600;

async function shrink(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) return file;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
  if (!blob) return file;
  return new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' });
}

export function PhotoInput({ defaultUrl, blobReady, error }: { defaultUrl: string | null; blobReady: boolean; error?: string }) {
  const [preview, setPreview] = useState<string | null>(defaultUrl);
  const [url, setUrl] = useState(defaultUrl ?? '');
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const small = await shrink(file);
      const dt = new DataTransfer();
      dt.items.add(small);
      input.files = dt.files;
      setPreview(URL.createObjectURL(small));
    } catch {
      setPreview(URL.createObjectURL(file));
    } finally {
      setBusy(false);
    }
  }

  function clear() {
    setPreview(null);
    setUrl('');
    if (fileRef.current) fileRef.current.value = '';
  }

  return (
    <div className="space-y-2">
      <span className="text-sm font-medium">Фото</span>
      <div className="flex items-start gap-3">
        <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted text-2xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {preview ? <img src={preview} alt="" className="h-full w-full object-cover" /> : '🌷'}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          {blobReady ? (
            <input
              ref={fileRef}
              type="file"
              name="photo"
              accept="image/jpeg,image/png"
              onChange={onFile}
              className="block w-full text-sm file:mr-3 file:rounded-md file:border file:bg-card file:px-3 file:py-1.5 file:text-sm"
            />
          ) : (
            <p className="text-xs text-muted-foreground">
              Загрузка файлов появится после подключения Vercel Blob (см. инструкцию). Пока можно вставить ссылку.
            </p>
          )}
          <input
            name="photoUrl"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setPreview(e.target.value || null);
            }}
            placeholder="или ссылка https://…"
            className={inputClass}
          />
          {busy && <p className="text-xs text-muted-foreground">Уменьшаем фото…</p>}
          {preview && (
            <button type="button" onClick={clear} className="text-xs text-muted-foreground underline">
              Убрать фото
            </button>
          )}
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      </div>
    </div>
  );
}
