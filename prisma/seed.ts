// Бастапқы деректер. Қайта-қайта іске қосуға қауіпсіз:
// бар жазбаларды ӨЗГЕРТПЕЙДІ, тек жоғын қосады.
// Тек: категориялар, міндетті баптаулар, бірінші админ.
// Тауар, баға, клиент, тапсырыс ЕШҚАШАН қосылмайды — оларды админ енгізеді.
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { hashPassword, passwordSchema } from '../server/auth/password';
import { SETTINGS } from '../server/services/settings';

const prisma = new PrismaClient();

const CATEGORIES = [
  { slug: 'rose', name: 'Роза', nameKk: 'Раушан', emoji: '🌹', sortOrder: 10, allowMonobouquet: true },
  { slug: 'spray-rose', name: 'Spray rose', nameKk: 'Spray rose', emoji: '🌸', sortOrder: 20, allowMonobouquet: true },
  { slug: 'chrysanthemum', name: 'Хризантема', nameKk: 'Хризантема', emoji: '🌼', sortOrder: 30, allowMonobouquet: true },
  { slug: 'hydrangea', name: 'Гортензия', nameKk: 'Гортензия', emoji: '🌺', sortOrder: 40, allowMonobouquet: true },
  { slug: 'lisianthus', name: 'Лизиантус', nameKk: 'Лизиантус', emoji: '🌿', sortOrder: 50, allowMonobouquet: true },
  { slug: 'other', name: 'Другие цветы', nameKk: 'Басқа гүлдер', emoji: '💐', sortOrder: 90, allowMonobouquet: false },
];

async function main() {
  for (const c of CATEGORIES) {
    await prisma.category.upsert({ where: { slug: c.slug }, create: c, update: {} });
  }

  // Міндетті баптаулар (Admin → Настройки бетінде өзгертіледі). Бар болса — тимейміз.
  const legacyThreshold = await prisma.setting.findUnique({ where: { key: 'low_stock_threshold' } });
  for (const [key, def] of Object.entries(SETTINGS)) {
    let value: object = def.defaults;
    if (key === 'general' && typeof legacyThreshold?.value === 'number') {
      value = { ...def.defaults, lowStockThreshold: legacyThreshold.value };
    }
    await prisma.setting.upsert({ where: { key }, create: { key, value }, update: {} });
  }
  if (legacyThreshold) await prisma.setting.delete({ where: { key: 'low_stock_threshold' } });

  const adminCount = await prisma.admin.count();
  if (adminCount === 0) {
    const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const password = process.env.ADMIN_INITIAL_PASSWORD;
    if (!email || !password) {
      console.warn('⚠️  Бірде-бір админ жоқ. ADMIN_EMAIL және ADMIN_INITIAL_PASSWORD толтырып, қайта deploy жасаңыз.');
    } else {
      const check = passwordSchema.safeParse(password);
      if (!check.success) {
        throw new Error(`ADMIN_INITIAL_PASSWORD талапқа сай емес: ${check.error.issues[0]?.message}`);
      }
      await prisma.admin.create({
        data: {
          email,
          name: 'Владелец',
          role: 'OWNER',
          passwordHash: await hashPassword(password),
          mustChangePassword: true,
        },
      });
      console.log(`✅ OWNER админ жасалды: ${email}. Бірінші кіргенде парольді ауыстыру сұралады.`);
    }
  }

  console.log('✅ Seed аяқталды.');
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
