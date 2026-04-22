/**
 * Landing page — OWNER: Agent A.
 * This stub just renders a placeholder so the app boots. Replace with:
 *  - Hero (value prop + CTA)
 *  - MBTI selector (links to /chat?mbti=XXXX)
 *  - Comparison demo (4 static MBTI preview cards)
 *  - Footer
 */
import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-8 px-6 text-center">
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
        按你的 MBTI 思维方式学任何东西
      </h1>
      <p className="max-w-xl text-neutral-600">
        同一个知识点，16 型有 16 种讲法。
        <br />
        先免费试 3 轮。
      </p>
      <Link
        href="/chat?mbti=INTJ"
        className="rounded-full bg-neutral-900 px-6 py-3 text-white hover:bg-neutral-700"
      >
        试试看 →
      </Link>
      <p className="text-xs text-neutral-400">
        [landing placeholder — Agent A to replace]
      </p>
    </main>
  );
}
