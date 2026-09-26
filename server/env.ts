import { z } from 'zod';

// Бос жол ("") = мән берілмеген деп есептейміз.
const optional = z.preprocess((v) => (v === '' ? undefined : v), z.string().optional());

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL берілмеген'),
  AUTH_SECRET: z.string().min(32, 'AUTH_SECRET кемінде 32 таңба болуы керек'),
  APP_BASE_URL: optional,
  CRON_SECRET: optional,
  ADMIN_EMAIL: optional,
  ADMIN_INITIAL_PASSWORD: optional,

  // WhatsApp Cloud API — 3-кезеңге дейін бос тұра береді.
  WHATSAPP_ACCESS_TOKEN: optional,
  WHATSAPP_PHONE_NUMBER_ID: optional,
  WHATSAPP_BUSINESS_ACCOUNT_ID: optional,
  WHATSAPP_VERIFY_TOKEN: optional,
  WHATSAPP_APP_SECRET: optional,
  WHATSAPP_API_VERSION: z.preprocess((v) => (v === '' ? undefined : v), z.string().default('v23.0')),

  // Менеджерге хабарлама (Telegram)
  TELEGRAM_BOT_TOKEN: optional,
  TELEGRAM_MANAGER_CHAT_ID: optional,
});

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;

/** .env мәндерін тексеріп қайтарады. Қате болса — нақты қай айнымалы екенін айтады. */
export function env(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const problems = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`.env қате толтырылған:\n${problems}`);
  }
  cached = parsed.data;
  return cached;
}

const WHATSAPP_KEYS = [
  'WHATSAPP_ACCESS_TOKEN',
  'WHATSAPP_PHONE_NUMBER_ID',
  'WHATSAPP_BUSINESS_ACCOUNT_ID',
  'WHATSAPP_VERIFY_TOKEN',
  'WHATSAPP_APP_SECRET',
] as const;

/** WhatsApp баптауы толық па — Admin → Настройки бетінде көрсету үшін (мәндерін емес, тек бар/жоғын). */
export function whatsappConfigStatus(): { key: string; present: boolean }[] {
  const e = env();
  return WHATSAPP_KEYS.map((key) => ({ key, present: Boolean(e[key]) }));
}
