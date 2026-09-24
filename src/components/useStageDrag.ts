import { useRef, useState, type PointerEvent } from 'react';
import { STAGE_W } from './Stage';

/** Сахнаның логикалық координаттарындағы (1920×1080) тіктөртбұрыш */
export interface StageRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

function toStageRect(el: Element): StageRect {
  const r = el.getBoundingClientRect();
  const stage = document.querySelector('[data-stage]')?.getBoundingClientRect();
  const scale = stage ? stage.width / STAGE_W : 1;
  const ox = stage?.left ?? 0;
  const oy = stage?.top ?? 0;
  return { x: (r.left - ox) / scale, y: (r.top - oy) / scale, w: r.width / scale, h: r.height / scale };
}

interface Options {
  /** Сүйреп апарып, data-drop="<id>" элементінің үстіне тастағанда. from — тасталған сәттегі орны */
  onDrop: (targetId: string, from: StageRect) => void;
  /** Жай басқанда (сүйремей). from — элементтің орны */
  onTap?: (from: StageRect) => void;
  /** Сүйреп келе жатқанда астындағы нысана (жарықтандыру үшін) */
  onOver?: (targetId: string | null) => void;
  disabled?: boolean;
  /** Тек басуға болады, сүйреуге болмайды */
  noDrag?: boolean;
}

const THRESHOLD = 10;

function dropTargetAt(x: number, y: number): string | null {
  for (const el of document.elementsFromPoint(x, y)) {
    if (el instanceof HTMLElement && el.dataset.drop) return el.dataset.drop;
  }
  return null;
}

/**
 * Масштабталған 16:9 сахна ішінде дұрыс жұмыс істейтін drag-and-drop.
 * Тышқан, сенсорлы экран және стилус (pointer events) бірдей қолдау табады.
 * Жылжу 10px-тен аз болса — бұл «басу» (onTap), көп болса — «сүйреу».
 */
export function useStageDrag({ onDrop, onTap, onOver, disabled, noDrag }: Options) {
  const [offset, setOffset] = useState<{ x: number; y: number } | null>(null);
  const start = useRef<{ x: number; y: number; scale: number; moved: boolean; over: string | null } | null>(null);

  const reset = () => {
    start.current = null;
    setOffset(null);
    onOver?.(null);
  };

  const handlers = {
    onPointerDown(e: PointerEvent<HTMLElement>) {
      if (disabled || e.button > 0) return;
      const stage = document.querySelector('[data-stage]')?.getBoundingClientRect();
      const scale = stage ? stage.width / STAGE_W : 1;
      start.current = { x: e.clientX, y: e.clientY, scale, moved: false, over: null };
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    onPointerMove(e: PointerEvent<HTMLElement>) {
      const s = start.current;
      if (!s) return;
      const dx = e.clientX - s.x;
      const dy = e.clientY - s.y;
      if (noDrag || (!s.moved && Math.hypot(dx, dy) < THRESHOLD)) return;
      s.moved = true;
      setOffset({ x: dx / s.scale, y: dy / s.scale });
      const over = dropTargetAt(e.clientX, e.clientY);
      if (over !== s.over) {
        s.over = over;
        onOver?.(over);
      }
    },
    onPointerUp(e: PointerEvent<HTMLElement>) {
      const s = start.current;
      const from = toStageRect(e.currentTarget);
      reset();
      if (!s) return;
      if (!s.moved) return onTap?.(from);
      const target = dropTargetAt(e.clientX, e.clientY);
      if (target) onDrop(target, from);
    },
    onPointerCancel: reset,
    /** Пернетақта (Enter/Space) — басумен бірдей */
    onClick(e: { detail: number; preventDefault: () => void; currentTarget: Element }) {
      e.preventDefault();
      if (e.detail === 0 && !disabled) onTap?.(toStageRect(e.currentTarget));
    },
  };

  return {
    handlers,
    dragging: offset !== null,
    style: offset
      ? { transform: `translate(${offset.x}px, ${offset.y}px) scale(1.08)`, zIndex: 60, transition: 'none', cursor: 'grabbing' }
      : undefined,
  };
}
