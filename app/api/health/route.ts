import { NextResponse } from 'next/server';
import { prisma } from '@/server/db';

export const dynamic = 'force-dynamic';

// Сервер мен база тірі ме. Ешқандай құпия немесе жеке дерек қайтармайды.
export async function GET() {
  let db = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    db = true;
  } catch {
    db = false;
  }
  return NextResponse.json({ ok: db, db }, { status: db ? 200 : 503 });
}
