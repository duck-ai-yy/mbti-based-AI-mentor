import Link from 'next/link';
import { MBTI_GROUPS, type MBTIGroup, type MBTIType } from '@/lib/types';
import { cn } from '@/lib/utils';

const GROUP_TILE: Record<MBTIGroup, string> = {
  NT: 'bg-mbti-nt hover:bg-mbti-nt/90 focus-visible:ring-mbti-nt',
  NF: 'bg-mbti-nf hover:bg-mbti-nf/90 focus-visible:ring-mbti-nf',
  SJ: 'bg-mbti-sj hover:bg-mbti-sj/90 focus-visible:ring-mbti-sj',
  SP: 'bg-mbti-sp hover:bg-mbti-sp/90 focus-visible:ring-mbti-sp',
};

const GROUP_LABEL: Record<MBTIGroup, { name: string; tag: string }> = {
  NT: { name: '分析师 NT', tag: '理性系统派' },
  NF: { name: '外交官 NF', tag: '意义驱动派' },
  SJ: { name: '守护者 SJ', tag: '秩序稳健派' },
  SP: { name: '探险家 SP', tag: '体验实战派' },
};

const PERSONA: Record<MBTIType, string> = {
  INTJ: '战略架构师',
  INTP: '逻辑探索者',
  ENTJ: '目标指挥官',
  ENTP: '辩论先锋',
  INFJ: '洞察诠释者',
  INFP: '价值共鸣者',
  ENFJ: '使命引导者',
  ENFP: '灵感激活者',
  ISTJ: '步骤执行者',
  ISFJ: '细致守护者',
  ESTJ: '效率管理者',
  ESFJ: '协作学习者',
  ISTP: '拆解工匠',
  ISFP: '感知艺术家',
  ESTP: '行动实战派',
  ESFP: '沉浸体验派',
};

const GROUP_ORDER: readonly MBTIGroup[] = ['NT', 'NF', 'SJ', 'SP'] as const;

export function MBTIGrid() {
  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="grid grid-cols-4 gap-2 sm:gap-3">
        {GROUP_ORDER.map((group) =>
          MBTI_GROUPS[group].map((mbti) => (
            <Link
              key={mbti}
              href={`/chat?mbti=${mbti}`}
              aria-label={`使用 ${mbti} ${PERSONA[mbti]} 风格开始对话`}
              className={cn(
                'group flex aspect-square min-h-[64px] flex-col items-center justify-center rounded-xl px-1 py-2 text-white shadow-sm transition active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
                GROUP_TILE[group],
              )}
            >
              <span className="text-base font-bold tracking-wide sm:text-xl">
                {mbti}
              </span>
              <span className="mt-0.5 line-clamp-1 px-0.5 text-[10px] font-medium leading-tight text-white/85 sm:text-xs">
                {PERSONA[mbti]}
              </span>
            </Link>
          )),
        )}
      </div>
      <ul className="mt-5 grid grid-cols-2 gap-x-3 gap-y-2 text-xs text-neutral-600 sm:grid-cols-4 sm:text-sm">
        {GROUP_ORDER.map((group) => (
          <li key={group} className="flex items-center gap-2">
            <span
              className={cn('h-3 w-3 shrink-0 rounded-sm', GROUP_TILE[group])}
              aria-hidden
            />
            <span className="truncate">
              <span className="font-semibold text-neutral-800">
                {GROUP_LABEL[group].name}
              </span>
              <span className="ml-1 text-neutral-500">
                · {GROUP_LABEL[group].tag}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
