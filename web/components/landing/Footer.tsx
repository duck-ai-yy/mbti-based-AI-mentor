import { LeadCaptureForm } from './LeadCaptureForm';

const GITHUB_URL = 'https://github.com/duck-ai-yy/mbti-based-AI-mentor';

export function Footer() {
  return (
    <footer className="mt-8 border-t border-neutral-200 bg-white">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-5 py-12 sm:py-16 lg:flex-row lg:gap-16">
        <div className="flex-1 space-y-4">
          <h2 className="text-xl font-bold text-neutral-900 sm:text-2xl">
            想看后续？留个联系方式
          </h2>
          <p className="text-sm text-neutral-600">
            正在做：自动画像、知识库检索、学习卡片、复习算法。
            上线时第一时间告诉你，绝不发垃圾邮件。
          </p>
          <LeadCaptureForm />
          <p className="text-xs text-neutral-500">
            或者扫码加微信，发"MBTI 学习"领 16 型 Prompt PDF：
          </p>
          <div
            role="img"
            aria-label="微信二维码占位图（部署时替换为真实二维码）"
            className="flex h-32 w-32 items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-neutral-50 text-center text-[11px] leading-tight text-neutral-400"
          >
            微信二维码
            <br />
            （占位）
          </div>
        </div>
        <div className="flex-1 space-y-4 lg:border-l lg:border-neutral-200 lg:pl-16">
          <h2 className="text-xl font-bold text-neutral-900 sm:text-2xl">
            开源 · 自由使用
          </h2>
          <p className="text-sm text-neutral-600">
            所有 16 型 Prompt 已在 GitHub 开源。
            随便复制粘贴到任意 LLM，也欢迎 PR 优化。
          </p>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-neutral-900 px-4 py-2 text-sm font-medium text-neutral-900 transition hover:bg-neutral-900 hover:text-white"
          >
            <span aria-hidden>★</span>
            在 GitHub 上查看
          </a>
          <ul className="space-y-1 pt-2 text-xs text-neutral-500">
            <li>MIT License — 随便用、随便改、可商用</li>
            <li>不存储对话内容；不卖数据</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-neutral-100 py-4 text-center text-xs text-neutral-400">
        © {new Date().getFullYear()} MBTI Learning Mentor · MIT Licensed
      </div>
    </footer>
  );
}
