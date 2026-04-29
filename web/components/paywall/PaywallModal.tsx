'use client';

import { useEffect, useRef } from 'react';
import { trackEvent } from '@/lib/analytics';

type PaywallModalProps = {
  open: boolean;
  onClose: () => void;
};

const QR_SRC = process.env.NEXT_PUBLIC_WECHAT_QR_URL ?? '/wechat-qr.png';
const PAY_LINK = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK ?? '';

export function PaywallModal({ open, onClose }: PaywallModalProps) {
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const firedShown = useRef(false);

  useEffect(() => {
    if (!open) {
      firedShown.current = false;
      return;
    }
    if (!firedShown.current) {
      firedShown.current = true;
      trackEvent('quota_exhausted');
      trackEvent('wechat_shown');
    }
    closeBtnRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        handleClose();
      } else if (e.key === 'Tab') {
        const card = cardRef.current;
        if (!card) return;
        const focusables = card.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (!first || !last) return;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function handleClose() {
    trackEvent('paywall_dismissed');
    onClose();
  }

  if (!open) return null;

  const payDisabled = !PAY_LINK;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="paywall-title"
      className="fixed inset-0 z-[1000] flex items-center justify-center"
    >
      <button
        type="button"
        aria-label="关闭弹窗"
        onClick={handleClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <div
        ref={cardRef}
        className="relative z-[1001] mx-4 w-full max-w-2xl rounded-2xl bg-white shadow-xl"
      >
        <button
          ref={closeBtnRef}
          type="button"
          onClick={handleClose}
          aria-label="关闭"
          className="absolute right-3 top-3 rounded-full p-2 text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-mbti-nt"
        >
          <span aria-hidden="true" className="text-xl leading-none">×</span>
        </button>

        <div className="px-6 pb-6 pt-8 sm:px-8">
          <h2 id="paywall-title" className="text-center text-xl font-semibold text-gray-900">
            今天的免费额度用完啦
          </h2>
          <p className="mt-2 text-center text-sm text-gray-500">
            选一个方式继续学习 ↓
          </p>

          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <section className="flex flex-col items-center rounded-xl border border-gray-200 bg-gray-50 p-5">
              <h3 className="text-base font-semibold text-gray-900">免费领 16 型 Prompt PDF</h3>
              <p className="mt-1 text-xs text-gray-500">扫码加微信领取</p>
              <div className="mt-4 rounded-lg bg-white p-2 ring-1 ring-gray-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={QR_SRC}
                  alt="微信二维码 — 扫码加微信领取 16 型 Prompt PDF"
                  width={192}
                  height={192}
                  className="h-48 w-48 object-contain"
                />
              </div>
              <p className="mt-3 text-center text-xs text-gray-500">
                添加后回复「MBTI」自动领取
              </p>
            </section>

            <section className="flex flex-col items-center justify-between rounded-xl border border-mbti-nt/30 bg-gradient-to-br from-violet-50 to-orange-50 p-5">
              <div className="text-center">
                <h3 className="text-base font-semibold text-gray-900">¥29 解锁 30 天</h3>
                <p className="mt-1 text-xs text-gray-500">不限次数 · 优先模型 · 随时取消</p>
                <ul className="mt-4 space-y-2 text-left text-sm text-gray-700">
                  <li>· 全 16 型深度解锁</li>
                  <li>· 升级到 Sonnet 模型</li>
                  <li>· 免每日 3 次限制</li>
                </ul>
              </div>
              {payDisabled ? (
                <button
                  type="button"
                  disabled
                  className="mt-5 w-full cursor-not-allowed rounded-lg bg-gray-200 px-4 py-2.5 text-sm font-medium text-gray-500"
                >
                  敬请期待
                </button>
              ) : (
                <a
                  href={PAY_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackEvent('payment_clicked')}
                  className="mt-5 inline-flex w-full items-center justify-center rounded-lg bg-mbti-nt px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-mbti-nt focus:ring-offset-2"
                >
                  立即解锁 ¥29
                </a>
              )}
            </section>
          </div>

          <p className="mt-6 text-center text-[11px] text-gray-400">
            支付由 Stripe 安全处理 · 二维码请用微信扫描
          </p>
        </div>
      </div>
    </div>
  );
}

export default PaywallModal;
