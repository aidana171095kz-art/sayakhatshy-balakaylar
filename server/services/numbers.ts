import type { Tx } from '../db';

// Құжат нөмірлері базалық sequence-тен алынады — қатар жасалса да қайталанбайды.
const SEQUENCES = {
  order: { seq: 'order_number_seq', prefix: 'TF' },
  preorder: { seq: 'preorder_number_seq', prefix: 'PO' },
  monobouquet: { seq: 'monobouquet_number_seq', prefix: 'MB' },
} as const;

export async function nextNumber(tx: Tx, kind: keyof typeof SEQUENCES): Promise<string> {
  const { seq, prefix } = SEQUENCES[kind];
  // seq — осы файлдағы тұрақты мән, пайдаланушы енгізбейді
  const rows = await tx.$queryRawUnsafe<{ n: bigint }[]>(`SELECT nextval('"${seq}"') AS n`);
  return `${prefix}-${String(rows[0].n).padStart(6, '0')}`;
}
