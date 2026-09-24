import { useLayoutEffect, useState, type ReactNode } from 'react';

export const STAGE_W = 1920;
export const STAGE_H = 1080;

/**
 * 16:9 сахна. Барлық экран 1920×1080 логикалық пиксельде жасалады және терезеге
 * пропорционалды масштабталады — проектор, ноутбук, планшетте композиция бірдей,
 * ешқандай overflow/scroll жоқ.
 */
export function Stage({ children }: { children: ReactNode }) {
  const [scale, setScale] = useState(1);
  useLayoutEffect(() => {
    const fit = () => setScale(Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H));
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);
  return (
    <div className="bg-journey flex h-full w-full items-center justify-center overflow-hidden">
      <div style={{ width: STAGE_W * scale, height: STAGE_H * scale }} className="relative">
        <div
          data-stage
          className="bg-journey absolute left-0 top-0 overflow-hidden"
          style={{ width: STAGE_W, height: STAGE_H, transform: `scale(${scale})`, transformOrigin: '0 0' }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
