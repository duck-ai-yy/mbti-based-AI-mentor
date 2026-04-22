# 模块归属（防冲突圣经）

每个 agent **只能改自己列的文件**。想动共享文件？先在 issue / group chat 对齐再改。

| Agent | 角色 | 可写文件 | 只读依赖 |
|---|---|---|---|
| **A** | 落地页 + 首屏转化 | `web/app/page.tsx`<br>`web/components/landing/**`<br>`web/public/**` | `lib/types.ts`<br>`lib/utils.ts` |
| **B** | 对话 UI + 流式渲染 | `web/app/chat/page.tsx`<br>`web/components/chat/**`<br>`web/lib/stream.ts`（客户端部分） | `lib/types.ts`<br>`lib/utils.ts`<br>`POST /api/chat` 的契约 |
| **C** | AI 后端 + API 路由 | `web/app/api/chat/route.ts`<br>`web/lib/claude.ts`<br>`web/lib/prompts.ts`（如需新建） | `lib/types.ts`<br>`lib/mbti.ts`<br>`lib/ratelimit.ts`（调用）<br>`lib/security.ts`（调用） |
| **D** | 限流 + 安全 | `web/lib/ratelimit.ts`<br>`web/lib/security.ts`<br>`web/middleware.ts` | `lib/types.ts` |
| **E** | 付费 + 留资 + 埋点 | `web/components/paywall/**`<br>`web/lib/analytics.ts`<br>`web/public/wechat-qr.png` | `lib/types.ts`<br>`lib/analytics.ts` 的已有签名 |

## 共享契约（永远 READ-ONLY，除非全员同意）

- `web/lib/types.ts` — 所有类型、Zod schema、限额常量
- `web/lib/mbti.ts` — Prompt 加载器
- `web/lib/utils.ts` — `cn()` 工具
- `web/package.json` — 改依赖前 @ 全员

## 分支命名

- `feat/a-landing`
- `feat/b-chat-ui`
- `feat/c-api`
- `feat/d-security`
- `feat/e-conversion`

## 合并顺序

1. D（安全基线 + 限流实现）先落地
2. C（后端 API）依赖 D
3. B（对话 UI）依赖 C 的契约（但不依赖实现 — 可 mock）
4. A、E 可在任何时候并行，最后合入

A 和 D 可以**完全并行无冲突**，B 和 E 也可以。

## 碰撞处理

- 共享类型要改 → 开 issue `[contract] XXX`，全员 24h 内 ack
- 共享依赖要加 → 加到 root `package.json` 前先 @ C（防 lock 冲突）
- 改 `tailwind.config.ts` → A 主导，其他人要加颜色/token 提 PR 合并
