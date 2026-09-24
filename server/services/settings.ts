import { z } from 'zod';
import { prisma } from '../db';

// Баптаулар `Setting` кестесінде кілт → JSON ретінде сақталады.
// Әр бөлімнің схемасы мен әдепкі мәні осында. Базада жоқ немесе бүлінген болса — әдепкі мән.

const optionalText = (max: number) =>
  z.preprocess((v) => (v == null || (typeof v === 'string' && v.trim() === '') ? null : v), z.string().trim().max(max).nullable());

export const businessSchema = z.object({
  name: z.string().trim().min(1, 'Укажите название').max(100),
  phone: optionalText(40),
  whatsappNumber: optionalText(40),
  address: z.string().trim().min(1, 'Укажите адрес').max(200),
  instagram: optionalText(100),
  telegram: optionalText(100),
  workingHours: optionalText(100),
});

export const generalSchema = z.object({
  lowStockThreshold: z.coerce.number().int().min(0).max(10000),
  /** 1-нұсқада тек теңге */
  currency: z.literal('KZT'),
  /** Боттың әдепкі тілі (клиент өзі ауыстыра алады) */
  language: z.enum(['RU', 'KK']),
});

export const ordersSchema = z.object({
  /** Минималды тапсырыс сомасы, ₸. 0 = шектеу жоқ */
  minOrderAmount: z.coerce.number().int().min(0).max(100_000_000),
  /** Тапсырыста компания атауын міндетті түрде сұрау */
  requireCompanyName: z.boolean(),
});

export const preordersSchema = z.object({
  /** Поставкаға N сағат қалғанда предзаказды жабу. 0 = админ өзі жабады */
  closeHoursBeforeArrival: z.coerce.number().int().min(0).max(720),
  /** Бір позицияға бір клиенттің ең көп предзаказы. 0 = шектеу жоқ */
  maxQtyPerItem: z.coerce.number().int().min(0).max(100000),
});

export const monobouquetSchema = z.object({
  sizes: z.array(z.string().trim().min(1).max(40)).max(20),
  wrappings: z.array(z.string().trim().min(1).max(40)).max(20),
});

export const SETTINGS = {
  business: {
    schema: businessSchema,
    defaults: {
      name: 'TALSHYN FLOWERS',
      phone: null,
      whatsappNumber: null,
      address: 'Астана, ул. Күйші Дина, 12',
      instagram: null,
      telegram: null,
      workingHours: null,
    },
  },
  general: {
    schema: generalSchema,
    defaults: { lowStockThreshold: 3, currency: 'KZT' as const, language: 'RU' as const },
  },
  orders: {
    schema: ordersSchema,
    defaults: { minOrderAmount: 0, requireCompanyName: false },
  },
  preorders: {
    schema: preordersSchema,
    defaults: { closeHoursBeforeArrival: 0, maxQtyPerItem: 0 },
  },
  monobouquet: {
    schema: monobouquetSchema,
    defaults: { sizes: [] as string[], wrappings: [] as string[] },
  },
} as const;

export type SettingsKey = keyof typeof SETTINGS;
export type SettingsValue<K extends SettingsKey> = z.infer<(typeof SETTINGS)[K]['schema']>;
export type AllSettings = { [K in SettingsKey]: SettingsValue<K> };

export async function getSettings(): Promise<AllSettings> {
  const rows = await prisma.setting.findMany({ where: { key: { in: Object.keys(SETTINGS) } } });
  const byKey = new Map(rows.map((r) => [r.key, r.value]));
  const out = {} as Record<string, unknown>;
  for (const [key, def] of Object.entries(SETTINGS)) {
    const stored = byKey.get(key);
    const merged = stored && typeof stored === 'object' ? { ...def.defaults, ...(stored as object) } : def.defaults;
    const parsed = def.schema.safeParse(merged);
    out[key] = parsed.success ? parsed.data : def.defaults;
  }
  return out as AllSettings;
}

export async function getSetting<K extends SettingsKey>(key: K): Promise<SettingsValue<K>> {
  return (await getSettings())[key];
}

export async function updateSetting<K extends SettingsKey>(key: K, value: unknown, adminId?: string) {
  const data = SETTINGS[key].schema.parse(value) as object;
  await prisma.$transaction([
    prisma.setting.upsert({ where: { key }, create: { key, value: data }, update: { value: data } }),
    prisma.auditLog.create({ data: { adminId, action: 'SETTINGS_UPDATED', entity: 'Setting', entityId: key, diff: data } }),
  ]);
  return data as SettingsValue<K>;
}

export async function getLowStockThreshold(): Promise<number> {
  return (await getSetting('general')).lowStockThreshold;
}
