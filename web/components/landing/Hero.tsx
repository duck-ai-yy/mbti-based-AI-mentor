import { MBTIGrid } from './MBTIGrid';

export function Hero() {
  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col items-center gap-6 px-5 pb-10 pt-16 text-center sm:gap-8 sm:pt-24">
      <span className="rounded-full border border-neutral-300 bg-white/60 px-3 py-1 text-xs text-neutral-600 sm:text-sm">
        16 型专属 AI 学习教练 · 先免费试 3 轮
      </span>
      <h1 className="text-balance text-3xl font-bold leading-tight tracking-tight text-neutral-900 sm:text-5xl">
        按你的 MBTI 思维方式
        <br className="hidden sm:block" />
        学任何东西
      </h1>
      <p className="max-w-xl text-pretty text-base leading-relaxed text-neutral-600 sm:text-lg">
        同一个知识点，16 型有 16 种讲法。
        <br />
        选择你的 MBTI，立刻开始一段为你定制的对话。
      </p>
      <div className="w-full pt-4">
        <p className="mb-4 text-sm font-medium text-neutral-500">
          ↓ 点击你的 MBTI 立即开始
        </p>
        <MBTIGrid />
      </div>
    </section>
  );
}
