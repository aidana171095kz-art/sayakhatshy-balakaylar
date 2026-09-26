/** Design tokens — the single design system for all 16 screens. */
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: '#12355B', soft: '#4E6E8E' },
        sky: { 100: '#E6FAFD', 200: '#BFF1F8', 300: '#8BE8F2', 500: '#2EC4D6', 700: '#1A9FC4' },
        line: '#D6F1F7',
        sun: { DEFAULT: '#FFC93C', shade: '#E0A100', ink: '#4A3200' },
        sea: { DEFAULT: '#2F80ED', shade: '#1B5DBF' },
        ok: { DEFAULT: '#34C56A', shade: '#23994F' },
        no: { DEFAULT: '#FF6B7A', shade: '#D94A5A' },
        paper: { DEFAULT: '#FFF6E0', gold: '#E3AE3F' },
      },
      fontFamily: {
        sans: ['Nunito', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        // logical px on the 1920×1080 stage
        caption: ['24px', { lineHeight: '1.3' }],
        body: ['32px', { lineHeight: '1.35' }],
        button: ['34px', { lineHeight: '1' }],
        h2: ['44px', { lineHeight: '1.15' }],
        h1: ['64px', { lineHeight: '1.08' }],
        hero: ['96px', { lineHeight: '0.98' }],
      },
      borderRadius: {
        card: '32px',
        chip: '20px',
      },
      boxShadow: {
        card: '0 14px 34px rgba(18,53,91,.16), 0 2px 6px rgba(18,53,91,.08)',
        lift: '0 22px 44px rgba(18,53,91,.22), 0 4px 10px rgba(18,53,91,.10)',
      },
    },
  },
  plugins: [],
};
