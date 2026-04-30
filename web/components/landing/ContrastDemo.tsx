import Link from 'next/link';
import { cn } from '@/lib/utils';
import { DEMO_CARDS, DEMO_TOPIC, type DemoCard } from './demo-content';
import type { MBTIGroup } from '@/lib/types';

const ACCENT: Record<MBTIGroup, { dot: string; ring: string; chip: string }> = {
  NT: {
    dot: 'bg-mbti-nt',
    ring: 'ring-mbti-nt/30',
    chip: 'bg-mbti-nt/10 text-mbti-nt',
  },
  NF: {
    dot: 'bg-mbti-nf',
    ring: 'ring-mbti-nf/30',
    chip: 'bg-mbti-nf/10 text-mbti-nf',
  },
  SJ: {
    dot: 'bg-mbti-sj',
    ring: 'ring-mbti-sj/30',
    chip: 'bg-mbti-sj/10 text-mbti-sj',
  },
  SP: {
    dot: 'bg-mbti-sp',
    ring: 'ring-mbti-sp/30',
    chip: 'bg-mbti-sp/10 text-mbti-sp',
  },
};

function DemoCardView({ card }: { card: DemoCard }) {
  const accent = ACCENT[card.group];
  return (
    <article
      className={cn(
        'flex h-full flex-col gap-3 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-neutral-200/70 transition hover:ring-2',
        accent.ring,
      )}
    >
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={cn('h-2.5 w-2.5 rounded-full', accent.dot)}
            aria-hidden
          />
          <h3 className="text-lg font-bold tracking-wide text-neutral-900">
            {card.mbti}
          </h3>
          <span className="text-xs text-neutral-500">{card.persona}</span>
        </div>
        <span
          className={cn(
            'rounded-full px-2 py-0.5 text-[10px] font-medium sm:text-xs',
            accent.chip,
          )}
        >
          {card.vibe}
        </span>
      </header>
      <ol className="flex flex-1 flex-col gap-2 text-sm leading-relaxed text-neutral-700">
        {card.lines.map((line, idx) => (
          <li key={idx} className="flex gap-2">
            <span className="select-none text-neutral-400">{idx + 1}.</span>
            <span>{line}</span>
          </li>
        ))}
      </ol>
      <Link
        href={`/chat?mbti=${card.mbti}`}
        className="mt-auto inline-flex items-center justify-center text-sm font-medium text-neutral-900 hover:underline"
      >
        用 {card.mbti} 风格继续聊 →
      </Link>
    </article>
  );
}

export function ContrastDemo() {
  return (
    <section className="mx-auto w-full max-w-6xl px-5 py-14 sm:py-20">
      <div className="mb-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500">
          同一个问题，4 种讲法
        </p>
        <h2 className="mt-2 text-2xl font-bold text-neutral-900 sm:text-3xl">
          {DEMO_TOPIC}
        </h2>
        <p className="mt-3 text-sm text-neutral-600 sm:text-base">
          每张卡是真实 Prompt 的开头三句。差别在哪？一眼就能看出来。
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {DEMO_CARDS.map((card) => (
          <DemoCardView key={card.mbti} card={card} />
        ))}
      </div>
    </section>
  );
}
