// Қазақстан нөмірін WhatsApp форматына келтіру: "+7 (701) 123-45-67" / "87011234567" → "77011234567".
// Жарамсыз болса null.
export function normalizePhone(input: string | null | undefined): string | null {
  if (!input) return null;
  let digits = input.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('8')) digits = `7${digits.slice(1)}`;
  if (digits.length === 10 && digits.startsWith('7')) digits = `7${digits}`;
  // Халықаралық нөмірлер: E.164 бойынша 8–15 сан
  if (digits.length < 8 || digits.length > 15) return null;
  return digits;
}

/** 77011234567 → +7 701 123 45 67 */
export function formatPhone(waId: string): string {
  if (waId.length === 11 && waId.startsWith('7')) {
    return `+7 ${waId.slice(1, 4)} ${waId.slice(4, 7)} ${waId.slice(7, 9)} ${waId.slice(9)}`;
  }
  return `+${waId}`;
}
