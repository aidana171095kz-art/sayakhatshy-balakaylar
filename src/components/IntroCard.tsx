import { motion } from 'framer-motion';

const spring = { type: 'spring', stiffness: 200, damping: 18 } as const;

/** Қала/өңір экрандарының тақырып карточкасы: үлкен атау + Word-тағы мұғалім сөзінен сөйлемдер */
export function IntroCard({ title, lines, className = '' }: { title: string; lines: readonly string[]; className?: string }) {
  return (
    <motion.section
      className={`glass absolute flex items-center gap-10 px-12 py-8 ${className}`}
      initial={{ opacity: 0, x: -60 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ ...spring, delay: 0.1 }}
      data-testid="intro"
    >
      <h1 className="text-[104px] font-black leading-none tracking-tight text-sea" style={{ textShadow: '0 6px 0 #BFF1F8' }}>
        {title}
      </h1>
      <div className="space-y-2">
        {lines.map((l) => (
          <p key={l} className="text-[34px] font-bold leading-snug text-ink">
            {l}
          </p>
        ))}
      </div>
    </motion.section>
  );
}
