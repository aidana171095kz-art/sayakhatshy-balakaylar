import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/server/db';
import { createMonobouquetRequest, updateMonobouquet } from '@/server/services/monobouquets';
import { makeAdmin, resetDb } from './helpers';

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

describe('F3: клиент комментарийі мен менеджер жазбасы бөлек', () => {
  it('менеджер жазбасы клиент комментарийін өзгертпейді', async () => {
    const admin = await makeAdmin();
    const req = await createMonobouquetRequest({
      customer: { phone: '+77010000001', name: 'Айдана', companyName: '' },
      flowerNote: 'раушан',
      comment: 'Ақ раушан керек',
    });

    await updateMonobouquet(req.id, { status: 'CONTACTED', quotedPrice: '', managerNote: 'Клиентке хабарластым' }, admin.id);
    let row = await prisma.monobouquetRequest.findUniqueOrThrow({ where: { id: req.id } });
    expect(row.comment).toBe('Ақ раушан керек');
    expect(row.managerNote).toBe('Клиентке хабарластым');

    // Update-ке `comment` жіберілсе де — еленбейді (схемада жоқ)
    await updateMonobouquet(
      req.id,
      { status: 'CONTACTED', quotedPrice: '30000', managerNote: 'Бағасын айттым', comment: 'ҮСТІНЕН ЖАЗУ ӘРЕКЕТІ' },
      admin.id,
    );
    row = await prisma.monobouquetRequest.findUniqueOrThrow({ where: { id: req.id } });
    expect(row.comment).toBe('Ақ раушан керек');
    expect(row.managerNote).toBe('Бағасын айттым');

    // Жазбаны өшіру клиент комментарийіне әсер етпейді
    await updateMonobouquet(req.id, { status: 'CONTACTED', quotedPrice: '30000', managerNote: '' }, admin.id);
    row = await prisma.monobouquetRequest.findUniqueOrThrow({ where: { id: req.id } });
    expect(row.comment).toBe('Ақ раушан керек');
    expect(row.managerNote).toBeNull();
  });
});
