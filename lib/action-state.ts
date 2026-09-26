import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { logger } from '@/server/logger';

// Server action нәтижесі — формаға қайтарылатын қате/хабарлама.
export interface ActionState {
  error?: string;
  fieldErrors?: Record<string, string>;
  ok?: string;
}

const KNOWN_ERRORS = new Set([
  'ProductError',
  'SupplyError',
  'PreOrderError',
  'MonobouquetError',
  'UploadError',
  'InsufficientStockError',
  'ConcurrentUpdateError',
  'OrderTransitionError',
]);

/** Кез келген қатені админге түсінікті мәтінге айналдырады. Ішкі мәліметтер экранға шықпайды. */
export function toActionState(e: unknown): ActionState {
  if (e instanceof ZodError) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of e.issues) {
      const key = issue.path.join('.') || '_';
      fieldErrors[key] ??= issue.message;
    }
    return { error: 'Проверьте поля формы', fieldErrors };
  }
  if (e instanceof Error && e.name === 'InsufficientStockError') {
    return { error: 'Недостаточно доступного остатка для этой операции' };
  }
  if (e instanceof Error && KNOWN_ERRORS.has(e.name)) return { error: e.message };
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
    return { error: 'Такая запись уже существует' };
  }
  if (e instanceof Error && 'digest' in e && String((e as { digest?: string }).digest).startsWith('NEXT_REDIRECT')) {
    throw e; // redirect() — қате емес
  }
  logger.error('admin action failed', { error: e });
  return { error: 'Не удалось сохранить. Попробуйте ещё раз.' };
}

/** FormData → қарапайым объект (бір атаулы бірнеше мән болмаса). */
export function formToObject(fd: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of fd.entries()) if (typeof v === 'string' && !k.startsWith('$ACTION')) out[k] = v;
  return out;
}
