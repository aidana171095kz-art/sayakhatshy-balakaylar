import type { CSSProperties } from 'react';
import { ASSETS, assetUrl, type AssetId } from '../assets/manifest';

interface Props {
  id: AssetId;
  className?: string;
  style?: CSSProperties;
  /** Фон ретінде (object-cover) немесе объект ретінде (object-contain) */
  fit?: 'cover' | 'contain';
  alt?: string;
}

/**
 * Жобадағы барлық сурет осы компонент арқылы шығады.
 * Файл жоқ болса — emoji/stock емес, таза уақытша карточка көрсетіледі.
 */
export function Asset({ id, className = '', style, fit = 'contain', alt }: Props) {
  const url = assetUrl(id);
  const entry = ASSETS[id];
  if (!url) {
    return (
      <div
        data-asset={id}
        data-placeholder="true"
        className={`flex items-center justify-center rounded-card border-4 border-dashed border-white/80 bg-white/35 text-center text-caption font-bold text-ink-soft backdrop-blur-sm ${className}`}
        style={style}
      >
        {entry.label}
      </div>
    );
  }
  return (
    <img
      data-asset={id}
      src={url}
      alt={alt ?? entry.label}
      draggable={false}
      className={`select-none ${fit === 'cover' ? 'object-cover' : 'object-contain'} ${className}`}
      style={style}
    />
  );
}
