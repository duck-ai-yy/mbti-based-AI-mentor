import Link from 'next/link';
import { MBTI_GROUPS, type MBTIGroup, type MBTIType } from '@/lib/types';
import { cn } from '@/lib/utils';

interface Props {
  mbti: MBTIType;
  remaining: number | null;
  limit: number | null;
}

const GROUP_BG: Record<MBTIGroup, string> = {
  NT: 'bg-mbti-nt',
  NF: 'bg-mbti-nf',
  SJ: 'bg-mbti-sj',
  SP: 'bg-mbti-sp',
};

function groupOfType(t: MBTIType): MBTIGroup {
  for (const [g, members] of Object.entries(MBTI_GROUPS) as [
    MBTIGroup,
    readonly MBTIType[],
  ][]) {
    if (members.includes(t)) return g;
  }
  return 'NT';
}

export function ChatHeader({ mbti, remaining, limit }: Props) {
  const group = groupOfType(mbti);
  const quotaText =
    remaining !== null && limit !== null
      ? `剩余 ${remaining}/${limit} 次`
      : '剩余 -/- 次';
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-neutral-200 bg-neutral-50/90 px-4 py-3 backdrop-blur sm:px-6">
      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="text-sm text-neutral-500 hover:text-neutral-900"
          aria-label="返回首页"
        >
          ← 返回
        </Link>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'inline-flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-xs font-semibold tracking-wide text-white',
              GROUP_BG[group],
            )}
            aria-label={`MBTI ${mbti}`}
          >
            {mbti}
          </span>
          <span className="hidden text-sm text-neutral-600 sm:inline">
            按 {mbti} 思维方式回答
          </span>
        </div>
      </div>
      <div
        className="rounded-full bg-white px-3 py-1 text-xs font-medium text-neutral-700 ring-1 ring-neutral-200"
        aria-live="polite"
      >
        {quotaText}
      </div>
    </header>
  );
}
