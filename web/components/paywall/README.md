# Paywall (Agent E)

Drop-in 配额耗尽弹窗 + 双 CTA（微信加好友 / Stripe 付费）。

## 怎么挂上

`PaywallProvider` 是"挂载即生效"的零参数组件，内部自己监听
`window` 的 `quota:exhausted` 事件，不需要外部触发函数。

**给 Agent B（chat 页面）的建议**：在 `web/app/chat/page.tsx` 顶部加一行
import，把 `<PaywallProvider />` 放在 JSX 末尾即可。

```tsx
import { PaywallProvider } from '@/components/paywall';

export default function ChatPage() {
  return (
    <>
      {/* …你的对话 UI… */}
      <PaywallProvider />
    </>
  );
}
```

> ⚠️ 不要挂到 `app/layout.tsx`，那是公共领地（见
> `docs/MODULE_OWNERSHIP.md`）。如果合并冲突，请由 Agent B 决定保留位置。

需要手动控制弹窗的场景，可以用 `usePaywall()`：

```tsx
const { isOpen, open, close } = usePaywall();
```

## 触发方式

任何地方派发自定义事件即可：

```ts
window.dispatchEvent(new CustomEvent('quota:exhausted', { detail: { remaining: 0 } }));
```

Agent B 在收到 429 或 `meta.remaining === 0` 时派发此事件。

## 环境变量

| 变量 | 默认 | 说明 |
|---|---|---|
| `NEXT_PUBLIC_WECHAT_QR_URL` | `/wechat-qr.png` | 微信二维码图片地址 |
| `NEXT_PUBLIC_STRIPE_PAYMENT_LINK` | （空 → 按钮禁用） | Stripe Payment Link |
| `NEXT_PUBLIC_POSTHOG_KEY` | （空 → 埋点 no-op） | PostHog 项目 key |
| `NEXT_PUBLIC_POSTHOG_HOST` | `https://us.i.posthog.com` | PostHog host |

## ⚠️ 部署前必须替换

`web/public/wechat-qr.png` 当前是 256×256 的灰色占位图（带
"REPLACE WITH REAL QR" 文字）。**生产部署前必须替换为真实的微信加好友
二维码**，否则用户扫码会无效。

替换方式二选一：
1. 直接覆盖 `web/public/wechat-qr.png`
2. 把真实图片传到 CDN，然后设 `NEXT_PUBLIC_WECHAT_QR_URL` 指向它

## 埋点事件

`PaywallProvider` 自动埋点（参见 `web/lib/analytics.ts`）：

- `quota_exhausted` — 弹窗出现
- `wechat_shown` — 二维码展示
- `payment_clicked` — 用户点击付费 CTA
- `paywall_dismissed` — 用户关闭弹窗（ESC / ✕ / 遮罩任一）

埋点永远不发：原始消息内容、AI 回复、原始指纹、IP、UA。
