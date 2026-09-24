import type { AssetId } from '../assets/manifest';
import { Asset } from './Asset';

/**
 * Қала бөлімінің тапсырма экрандарына ортақ фон: қаланың суреті жұмсақ бұлыңғыр,
 * үстінде көгілдір тұман — тапсырма карточкалары анық оқылады, бірақ оқушы қай қалада
 * екенін сезеді.
 */
export function CityBackdrop({ id }: { id: AssetId }) {
  return (
    <>
      <Asset id={id} fit="cover" className="absolute inset-0 h-full w-full scale-110 blur-[10px]" />
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'linear-gradient(180deg, rgba(139,232,242,.72) 0%, rgba(46,196,214,.62) 55%, rgba(26,159,196,.72) 100%)' }}
      />
    </>
  );
}
