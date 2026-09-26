// Vercel build: қауіпсіз рет.
//
//   1. prisma generate
//   2. next build                  ← құласа, база ЕШ өзгермейді
//   3. prisma migrate deploy       ← тек VERCEL_ENV=production, DATABASE_URL_UNPOOLED арқылы
//   4. seed                        ← тек production және миграция сәтті болғаннан кейін
//
// Preview / Development / жергілікті build базаға тимейді (миграция да, seed те жоқ).
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

/** Қандай командалар қандай ретпен орындалатынын анықтайды (тесттер осыны тексереді). */
export function buildSteps(env) {
  const steps = [
    { name: 'prisma generate', cmd: 'npx', args: ['prisma', 'generate'] },
    { name: 'next build', cmd: 'npx', args: ['next', 'build'] },
  ];
  if (env.VERCEL_ENV === 'production') {
    steps.push(
      { name: 'prisma migrate deploy', cmd: 'npx', args: ['prisma', 'migrate', 'deploy'], needsDb: true },
      { name: 'seed', cmd: 'npx', args: ['tsx', 'prisma/seed.ts'], needsDb: true },
    );
  }
  return steps;
}

function defaultExec(step) {
  const r = spawnSync(step.cmd, step.args, { stdio: 'inherit', env: process.env });
  return r.status ?? 1;
}

/** Қадамдарды кезекпен орындайды. Біреуі құласа — қалғандары орындалмайды. */
export function runBuild(env, exec = defaultExec, log = console.log) {
  const steps = buildSteps(env);
  if (steps.some((s) => s.needsDb) && !env.DATABASE_URL_UNPOOLED) {
    log('✖ Production build: DATABASE_URL_UNPOOLED берілмеген — миграция тоқтатылды.');
    return 1;
  }
  if (env.VERCEL_ENV !== 'production') {
    log(`ℹ VERCEL_ENV=${env.VERCEL_ENV ?? '(жоқ)'} — миграция мен seed ӨТКІЗІЛІП ЖІБЕРІЛДІ (тек production-да орындалады).`);
  }
  for (const step of steps) {
    log(`▶ ${step.name}`);
    const code = exec(step);
    if (code !== 0) {
      log(`✖ ${step.name} сәтсіз аяқталды (код ${code}). Келесі қадамдар орындалмайды.`);
      return code;
    }
  }
  log('✔ Build аяқталды.');
  return 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  process.exit(runBuild(process.env));
}
