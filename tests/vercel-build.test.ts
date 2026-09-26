import { describe, expect, it } from 'vitest';
import { buildSteps, runBuild } from '../scripts/vercel-build.mjs';

type Step = { name: string };
const names = (env: Record<string, string | undefined>) => (buildSteps(env) as Step[]).map((s) => s.name);
const DB = { DATABASE_URL_UNPOOLED: 'postgresql://isolated/test' };

describe('F1: Vercel build — миграция тек production-да', () => {
  it('production: алдымен next build, содан кейін migrate, содан кейін seed', () => {
    expect(names({ VERCEL_ENV: 'production', ...DB })).toEqual(['prisma generate', 'next build', 'prisma migrate deploy', 'seed']);
  });

  it('preview / development / жергілікті: миграция мен seed жоқ', () => {
    for (const env of [{ VERCEL_ENV: 'preview' }, { VERCEL_ENV: 'development' }, {}]) {
      expect(names({ ...env, ...DB })).toEqual(['prisma generate', 'next build']);
    }
  });

  it('next build құласа — миграция мен seed орындалмайды', () => {
    const ran: string[] = [];
    const code = runBuild({ VERCEL_ENV: 'production', ...DB }, (s: Step) => (ran.push(s.name), s.name === 'next build' ? 1 : 0), () => {});
    expect(code).toBe(1);
    expect(ran).toEqual(['prisma generate', 'next build']);
  });

  it('миграция құласа — seed орындалмайды', () => {
    const ran: string[] = [];
    const code = runBuild({ VERCEL_ENV: 'production', ...DB }, (s: Step) => (ran.push(s.name), s.name === 'prisma migrate deploy' ? 1 : 0), () => {});
    expect(code).toBe(1);
    expect(ran).toEqual(['prisma generate', 'next build', 'prisma migrate deploy']);
  });

  it('production-да DATABASE_URL_UNPOOLED жоқ болса — ештеңе орындалмайды', () => {
    const ran: string[] = [];
    expect(runBuild({ VERCEL_ENV: 'production' }, (s: Step) => (ran.push(s.name), 0), () => {})).toBe(1);
    expect(ran).toEqual([]);
  });

  it('preview: DATABASE_URL_UNPOOLED қажет емес, базаға тимейді', () => {
    const ran: string[] = [];
    expect(runBuild({ VERCEL_ENV: 'preview' }, (s: Step) => (ran.push(s.name), 0), () => {})).toBe(0);
    expect(ran).toEqual(['prisma generate', 'next build']);
  });
});
